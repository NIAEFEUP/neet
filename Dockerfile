# syntax=docker/dockerfile:1

FROM node:22.12.0-alpine AS base

WORKDIR /app

# Keep lifecycle scripts from trying to install git hooks in the image.
ENV HUSKY=0

RUN npm install -g pnpm@12.16.1

FROM base AS deps

RUN apk add --no-cache libc6-compat

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

FROM base AS builder

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS prod

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
	&& adduser --system --uid 1001 svelte

COPY --from=builder --chown=svelte:nodejs /app/build ./build
COPY --from=builder --chown=svelte:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=svelte:nodejs /app/package.json ./package.json

USER svelte

EXPOSE 3000

CMD ["node", "build"]
