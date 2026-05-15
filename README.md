# MedVision AI

**Multimodal AI-Powered Radiology Copilot for Clinical Decision Support**

A full-stack healthcare AI platform that assists radiologists with medical image analysis, structured report generation, and citation-grounded Q&A using hybrid Retrieval-Augmented Generation (RAG).

---

## Features

- **Structured Report Generation** — Upload a medical image, provide clinical notes, and receive AI-generated radiology reports with findings, impression, recommendations, confidence scores, and literature citations
- **Hybrid RAG Pipeline** — Combines dense vector search (BGE embeddings + Qdrant) with sparse retrieval (BM25) using Reciprocal Rank Fusion and LLM-based reranking for high-quality context retrieval
- **Medical Image Viewer** — Canvas-based viewer with zoom, pan, brightness/contrast adjustment, and invert toggle for radiology workflows
- **Real-Time AI Chat** — WebSocket-powered streaming chat with RAG-augmented responses grounded in medical literature
- **DICOM Support** — Upload and parse DICOM files with automatic metadata extraction (modality, body part, patient info) via pydicom
- **Patient Case Management** — Create and track patient cases with priority levels (routine/urgent/stat), status tracking, and image attachment
- **Clinical Exports** — Download reports as PDF or HL7 FHIR R4 DiagnosticReport JSON for EHR interoperability
- **Audit Trail** — Complete logging of all AI actions, uploads, and case modifications with filtering
- **Multimodal Embeddings** — BiomedCLIP for medical image embeddings (512-d) and BGE for text embeddings (768-d)

## Architecture

```
┌─────────────┐     ┌──────────────────────────────────────────────┐
│  Next.js 15  │────▶│              FastAPI Backend                 │
│  Frontend    │◀────│                                              │
│  :3000       │     │  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
└─────────────┘     │  │ Auth/JWT │  │  Reports  │  │   Chat   │ │
                    │  └──────────┘  └───────────┘  └──────────┘ │
                    │  ┌──────────┐  ┌───────────┐  ┌──────────┐ │
                    │  │  Images  │  │ Retrieval │  │  Cases   │ │
                    │  └──────────┘  └───────────┘  └──────────┘ │
                    │                                              │
                    │  Embeddings: BiomedCLIP (512-d) + BGE (768-d)│
                    └──────────────┬───────────────────────────────┘
                                   │
                    ┌──────────────┼───────────────┐
                    │              │               │
              ┌─────▼─────┐ ┌─────▼─────┐  ┌─────▼─────┐
              │ PostgreSQL │ │  Qdrant   │  │   Redis   │
              │  :5432     │ │  :6333    │  │  :6379    │
              │            │ │           │  │           │
              │ Users      │ │ image_emb │  │  Cache    │
              │ Images     │ │ text_emb  │  │           │
              │ Reports    │ │           │  │           │
              │ Literature │ │           │  │           │
              └────────────┘ └───────────┘  └───────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 15, TypeScript, TailwindCSS, WebSocket |
| **Backend** | FastAPI, async SQLAlchemy, Alembic, Pydantic v2 |
| **LLM** | Groq API (LLaMA 3.3 70B) |
| **Image Embeddings** | BiomedCLIP (microsoft/BiomedCLIP-PubMedBERT_256-vit_base_patch16_224) |
| **Text Embeddings** | BGE (BAAI/bge-base-en-v1.5) |
| **Vector Database** | Qdrant |
| **Relational Database** | PostgreSQL 16 |
| **Cache** | Redis 7 |
| **DICOM Parsing** | pydicom |
| **PDF Generation** | ReportLab |
| **Infrastructure** | Docker Compose, GitHub Actions CI/CD |

## RAG Pipeline

```
User Query + Clinical Notes
        │
        ▼
┌───────────────┐     ┌─────────────┐
│  BGE Encoder  │     │  BM25 Index │
│  (768-d)      │     │  (sparse)   │
└───────┬───────┘     └──────┬──────┘
        │                    │
        ▼                    ▼
┌───────────────┐     ┌─────────────┐
│ Qdrant Vector │     │   BM25      │
│   Search      │     │   Search    │
└───────┬───────┘     └──────┬──────┘
        │                    │
        └────────┬───────────┘
                 ▼
      ┌─────────────────┐
      │ Reciprocal Rank │
      │    Fusion (k=60)│
      └────────┬────────┘
               ▼
      ┌─────────────────┐
      │  Groq Reranker  │
      │ (LLaMA 3.3 70B) │
      └────────┬────────┘
               ▼
      Top-K Retrieved Context
               │
               ▼
      ┌─────────────────┐
      │  Groq LLM       │
      │  Structured JSON │
      │  Report Output   │
      └─────────────────┘
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Groq API key (free at [console.groq.com](https://console.groq.com))

### Setup

```bash
# Clone the repository
git clone https://github.com/NikhilNWakode/MedVisionAI.git
cd MedVisionAI

# Create environment file
cp .env.example .env
# Edit .env and add your GROQ_API_KEY

# Start all services
docker compose up -d

# Run database migrations
docker compose exec backend alembic upgrade head

# Seed medical literature for RAG
docker compose exec backend python -m app.seed.load_nih

# Access the application
# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### First Run

1. Open http://localhost:3000 and register an account
2. Upload a medical image (DICOM, PNG, or JPG)
3. Add clinical notes (e.g., "Chest X-ray PA view, 55yo male, persistent cough, rule out pneumonia")
4. Click **Generate AI Report** — get structured findings with citations
5. View the report with the image viewer, download as PDF or FHIR JSON
6. Try the AI Chat for interactive medical Q&A

## Project Structure

```
MedVisionAI/
├── backend/
│   ├── app/
│   │   ├── auth/           # JWT authentication
│   │   ├── images/         # Upload, DICOM parsing, thumbnails
│   │   ├── embeddings/     # BiomedCLIP + BGE model management
│   │   ├── retrieval/      # BM25, vector search, RRF fusion, reranker
│   │   ├── reports/        # Generation, PDF export, FHIR export
│   │   ├── chat/           # WebSocket streaming with RAG
│   │   ├── cases/          # Patient case management
│   │   ├── audit/          # Activity logging
│   │   ├── db/             # Models, sessions, Qdrant client
│   │   └── seed/           # Sample medical literature
│   └── tests/
├── frontend/
│   ├── app/                # Next.js pages (dashboard, upload, report, chat, cases, audit)
│   ├── components/         # DicomViewer, ReportCard, ChatPanel, ImageUploader, Sidebar
│   └── lib/                # API client, WebSocket hook, auth
├── docker-compose.yml
├── docker-compose.prod.yml
└── .github/workflows/ci.yml
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/token` | Login, get JWT |
| GET | `/auth/verify` | Validate token |
| POST | `/images/upload` | Upload medical image |
| GET | `/images/{id}` | Image metadata |
| GET | `/images/{id}/file` | Serve image file |
| GET | `/images` | List user images |
| POST | `/reports/generate` | Generate AI report |
| GET | `/reports/{id}` | Get report |
| GET | `/reports/{id}/pdf` | Download PDF |
| GET | `/reports/{id}/fhir` | FHIR R4 export |
| GET | `/reports` | List reports |
| POST | `/retrieve` | Hybrid RAG search |
| WS | `/ws/chat/{session_id}` | Streaming AI chat |
| POST | `/cases` | Create patient case |
| GET | `/cases` | List cases |
| PATCH | `/cases/{id}` | Update case |
| GET | `/audit` | Audit trail |

## Database Schema

**PostgreSQL Tables:** `users`, `medical_images`, `reports`, `chat_sessions`, `chat_messages`, `patient_cases`, `audit_logs`, `literature`

**Qdrant Collections:**
- `image_embeddings` — 512-dimensional BiomedCLIP vectors
- `text_embeddings` — 768-dimensional BGE vectors

## Production Deployment

```bash
docker compose -f docker-compose.prod.yml up -d
```

Production config includes:
- 4 uvicorn workers
- 4GB memory limit
- Health checks on all services
- Restart policies
- Persistent volumes for data

## License

MIT
