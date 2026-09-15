# Stage 1: Build React frontend
FROM node:24-alpine AS client-build
WORKDIR /app
# Pinned via corepack — `npm install -g pnpm` grabs whatever's latest at
# build time, which is unreproducible and has caused install-behavior
# breakage across major pnpm versions (workspace --prod resolution and
# build-script approval both changed between 10.x and 12.x).
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY client/ ./client/
RUN pnpm --filter ./client build

# Stage 2: Production server
FROM node:24-slim
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.12.4 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/ ./scripts/
RUN pnpm install --prod --frozen-lockfile
COPY . .
COPY --from=client-build /app/dist ./dist
EXPOSE 8080
CMD ["node", "index.mjs"]
