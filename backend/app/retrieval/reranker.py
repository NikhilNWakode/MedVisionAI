from groq import Groq

from app.config import settings


def rerank_with_groq(query: str, candidates: list[dict], top_k: int = 5) -> list[dict]:
    if not settings.GROQ_API_KEY or not candidates:
        return candidates[:top_k]

    client = Groq(api_key=settings.GROQ_API_KEY)

    candidate_texts = []
    for i, c in enumerate(candidates[:20]):
        text = c.get("payload", {}).get("chunk_text", "") or c.get("content", "")
        candidate_texts.append(f"[{i}] {text[:300]}")

    prompt = f"""Given the medical query: "{query}"

Rank the following passages by relevance to the query. Return ONLY the indices in order of relevance, comma-separated.

Passages:
{chr(10).join(candidate_texts)}

Ranked indices (most relevant first):"""

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            temperature=0,
            max_tokens=100,
        )

        text = response.choices[0].message.content.strip()
        indices = []
        for part in text.replace("[", "").replace("]", "").split(","):
            part = part.strip()
            if part.isdigit():
                idx = int(part)
                if 0 <= idx < len(candidates):
                    indices.append(idx)

        if not indices:
            return candidates[:top_k]

        reranked = [candidates[i] for i in indices[:top_k]]
        return reranked

    except Exception:
        return candidates[:top_k]
