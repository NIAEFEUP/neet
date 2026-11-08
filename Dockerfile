# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.18.0

FROM node:${NODE_VERSION}-alpine AS base

RUN npm install -g pnpm@12.16.1 \
	&& npm cache clean --force

ENV HUSKY=0

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .
RUN pnpm build

FROM builder AS prod-deps

RUN pnpm deploy --prod /out

FROM node:${NODE_VERSION}-alpine AS prod

ENV NODE_ENV=production \
	HOST=0.0.0.0 \
	PORT=3000

WORKDIR /app

COPY --from=prod-deps /out/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/src/prisma/contract.prisma ./src/prisma/contract.prisma
COPY --from=builder /app/src/prisma/contract.json ./src/prisma/contract.json

USER 1000:1000

EXPOSE 3000

CMD ["node", "build"]
