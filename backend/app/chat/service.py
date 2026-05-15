import asyncio
import json
import uuid

from groq import Groq
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.models import ChatMessage, ChatSession, MessageRole
from app.embeddings.text_encoder import encode_text
from app.retrieval.bm25 import bm25_index
from app.retrieval.fusion import reciprocal_rank_fusion
from app.retrieval.reranker import rerank_with_groq
from app.retrieval.vector_search import search_text_embeddings

CHAT_SYSTEM_PROMPT = """You are MedVision AI, a medical AI assistant specializing in radiology and clinical decision support. You provide evidence-based responses grounded in the retrieved medical literature.

Rules:
- Use medical terminology appropriately
- Cite retrieved sources when making claims
- Clearly state limitations and uncertainty
- Never provide definitive diagnoses — always recommend professional consultation
- Be thorough but concise"""


async def get_or_create_session(
    session_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> ChatSession:
    result = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
    session = result.scalar_one_or_none()
    if session:
        # Verify the session belongs to the requesting user
        if session.user_id != user_id:
            raise PermissionError("Session does not belong to this user")
        return session

    session = ChatSession(id=session_id, user_id=user_id)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_chat_history(session_id: uuid.UUID, db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.desc())
        .limit(limit)
    )
    messages = list(reversed(result.scalars().all()))
    return [{"role": msg.role.value, "content": msg.content} for msg in messages]


async def save_message(
    session_id: uuid.UUID,
    role: MessageRole,
    content: str,
    db: AsyncSession,
    citations: list | None = None,
):
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        citations=citations,
    )
    db.add(msg)
    await db.commit()


def retrieve_for_chat(query: str) -> list[dict]:
    try:
        text_vector = encode_text(query)
        vector_results = search_text_embeddings(text_vector, top_k=5)
        bm25_results = bm25_index.search(query, top_k=5)
        bm25_formatted = [
            {"id": doc.get("id", str(i)), "score": score, "payload": doc}
            for i, (doc, score) in enumerate(bm25_results)
        ]
        fused = reciprocal_rank_fusion([vector_results, bm25_formatted])
        return fused[:5]
    except Exception:
        return []


async def stream_chat_response(
    query: str, session_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
):
    session = await get_or_create_session(session_id, user_id, db)
    history = await get_chat_history(session_id, db)

    await save_message(session_id, MessageRole.USER, query, db)

    # Run blocking retrieval (embedding + vector search + BM25) in a thread
    retrieved = await asyncio.to_thread(retrieve_for_chat, query)
    context_text = ""
    citations = []
    for i, r in enumerate(retrieved):
        payload = r.get("payload", {})
        source = payload.get("source", "Unknown")
        chunk = payload.get("chunk_text", "")
        context_text += f"\n[Source {i+1}: {source}]\n{chunk[:300]}\n"
        citations.append({"source": source, "content": chunk[:200]})

    messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]

    if context_text:
        messages.append({
            "role": "system",
            "content": f"Retrieved medical context:\n{context_text}",
        })

    messages.extend(history[-6:])
    messages.append({"role": "user", "content": query})

    # Collect streaming chunks in a thread to avoid blocking the event loop.
    # We buffer chunks in a queue so the async generator can yield them promptly.
    chunk_queue: asyncio.Queue = asyncio.Queue()

    def _stream_groq():
        client = Groq(api_key=settings.GROQ_API_KEY)
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.4,
            max_tokens=1500,
            stream=True,
        )
        full = ""
        for chunk in stream:
            delta = chunk.choices[0].delta
            if delta.content:
                full += delta.content
                chunk_queue.put_nowait(delta.content)
        chunk_queue.put_nowait(None)  # sentinel
        return full

    loop = asyncio.get_event_loop()
    groq_task = loop.run_in_executor(None, _stream_groq)

    # Yield tokens as they arrive from the background thread
    full_response = ""
    while True:
        token = await chunk_queue.get()
        if token is None:
            break
        full_response += token
        yield json.dumps({"type": "stream_token", "token": token})

    # Ensure the thread finished and get the result
    await groq_task

    await save_message(session_id, MessageRole.ASSISTANT, full_response, db, citations)

    yield json.dumps({"type": "stream_end", "citations": citations})
