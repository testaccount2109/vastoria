FROM python:3.12-slim AS base

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY vastoria_cloud ./vastoria_cloud

RUN pip install --no-cache-dir -e .

ENV HOST=0.0.0.0
ENV PORT=18430
ENV PYTHONUNBUFFERED=1

EXPOSE 18430

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:18430/health || exit 1

CMD ["vastoria-cloud"]
