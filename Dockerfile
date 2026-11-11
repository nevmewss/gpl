FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3000 NUXT_DATA_DIR=/app/data
COPY --from=build --chown=node:node /app/.output ./.output
COPY --chown=node:node scripts/backup.mjs ./scripts/backup.mjs
RUN mkdir -p /app/data /app/backups && chown -R node:node /app/data /app/backups
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
