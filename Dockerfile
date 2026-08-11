# Railway 등 "레포 루트를 빌드 컨텍스트로 쓰는" 배포 환경 전용 Dockerfile.
# (로컬 docker-compose 는 backend/Dockerfile 을 계속 사용한다.)
# 컨텍스트가 레포 루트이므로 backend/ 를 명시적으로 COPY 한다.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app

EXPOSE 8000

# PORT 환경변수로 바인딩 (Railway/Cloud Run 대응). 셸 폼이라 런타임에 치환된다.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
