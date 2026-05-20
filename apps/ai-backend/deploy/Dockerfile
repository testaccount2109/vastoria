FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml README.md ./
COPY vastoria_ai ./vastoria_ai

RUN pip install --no-cache-dir .

EXPOSE 18420
CMD ["uvicorn", "vastoria_ai.main:app", "--host", "0.0.0.0", "--port", "18420"]
