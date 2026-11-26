FROM node:20-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY web/package.json web/
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build -w web \
 && mkdir -p server/data/uploads \
 && chown -R node:node server/data

USER node
WORKDIR /app/server
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3100 HOME=/tmp
EXPOSE 3100
CMD ["/app/node_modules/.bin/tsx", "src/index.ts"]
