FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch CPU-only first (much smaller than CUDA build, avoids timeout)
RUN pip install --no-cache-dir --timeout 300 --retries 5 \
    torch torchvision --index-url https://download.pytorch.org/whl/cpu

COPY pyproject.toml ./
RUN pip install --no-cache-dir --timeout 300 --retries 5 ".[dev]"

COPY . .

# Railway uses PORT env var
ENV PORT=8000
EXPOSE ${PORT}

# Run migrations then start server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT} --workers 2
