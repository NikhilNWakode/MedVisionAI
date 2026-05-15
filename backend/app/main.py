import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.qdrant import init_qdrant_collections
from app.retrieval.bm25 import rebuild_bm25_index


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    try:
        await init_qdrant_collections()
    except Exception:
        pass
    try:
        await rebuild_bm25_index()
    except Exception:
        pass
    yield


app = FastAPI(title="MedVision AI", version="0.1.0", lifespan=lifespan)

cors_origins = ["http://localhost:3000"]
if os.environ.get("FRONTEND_URL"):
    cors_origins.append(os.environ["FRONTEND_URL"])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.audit.router import router as audit_router
from app.auth.router import router as auth_router
from app.cases.router import router as cases_router
from app.chat.router import router as chat_router
from app.images.router import router as images_router
from app.reports.router import router as reports_router
from app.retrieval.router import router as retrieval_router

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(cases_router, prefix="/cases", tags=["cases"])
app.include_router(images_router, prefix="/images", tags=["images"])
app.include_router(reports_router, prefix="/reports", tags=["reports"])
app.include_router(retrieval_router, prefix="/retrieve", tags=["retrieval"])
app.include_router(audit_router, prefix="/audit", tags=["audit"])
app.include_router(chat_router, tags=["chat"])


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/seed")
async def seed_data():
    """Seed literature data and rebuild BM25 index. Safe to call multiple times."""
    from app.seed.load_nih import seed_literature
    await seed_literature()
    await rebuild_bm25_index()
    return {"status": "ok", "message": "Literature seeded and BM25 index rebuilt"}
