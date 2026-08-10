# ---- build stage ----
# node:22-alpine / nginx:1.27-alpine 모두 linux/arm64 를 지원한다 (라즈베리파이 배포용).
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Vite 환경변수는 빌드 타임에 번들/HTML 에 박히므로 build-arg 로 주입한다.
ARG VITE_API_URL=http://localhost:8000
ARG VITE_KAKAO_JS_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_KAKAO_JS_KEY=$VITE_KAKAO_JS_KEY
RUN npm run build

# ---- serve stage ----
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
