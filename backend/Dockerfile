# python:3.12-slim 은 linux/arm64 멀티아치 이미지라 라즈베리파이(ARM64)에서도 그대로 빌드된다.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# psycopg[binary] 는 wheel 로 설치되지만, ARM64 빌드 폴백을 위해 최소 빌드 도구를 남겨둔다.
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Railway/Cloud Run 등은 PORT 환경변수로 포트를 주입한다. 없으면 8000.
ENV PORT=8000
EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
    CMD curl -fsS "http://localhost:${PORT:-8000}/api/health" || exit 1

# 셸 폼이라 ${PORT} 가 런타임에 치환된다 (exec 폼은 치환되지 않음).
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
