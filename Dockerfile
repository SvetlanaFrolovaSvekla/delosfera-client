FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# Готовое приложение — это статические файлы, и отдавать их должен веб-сервер.
# Прежде здесь запускался `vite preview`: dev-инструмент, который держал в
# образе весь node_modules и на каждый файл отвечал no-cache, заставляя
# браузер переспрашивать чанки при каждом переходе между разделами.
# Тег без версии намеренно: стенд банка не ходит в Docker Hub, и собраться
# можно только тем образом, который на нём уже есть.
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 4173
