FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/config ./packages/config
COPY apps/website ./apps/website
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
ENV NEXT_PUBLIC_CLOUD_API_URL=https://vastoria.online/api
ENV NEXT_PUBLIC_DOWNLOADS_URL=https://vastoria.online/downloads
RUN pnpm --filter @vastoria/website build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/apps/website/.next/standalone ./
COPY --from=builder /app/apps/website/.next/static ./apps/website/.next/static
COPY --from=builder /app/apps/website/public ./apps/website/public
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "apps/website/server.js"]
