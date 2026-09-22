# Builds the admin app and serves the static output with nginx. The context is the repository root.
FROM node:22-alpine AS build
WORKDIR /repo
RUN corepack enable

# The lockfile and every manifest first, so an install layer survives source-only changes.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json ./
COPY packages/fixtures/package.json packages/fixtures/
COPY packages/integration/package.json packages/integration/
COPY packages/tailwind-config/package.json packages/tailwind-config/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/types/package.json packages/types/
COPY packages/ui/package.json packages/ui/
COPY apps/admin/package.json apps/admin/
RUN pnpm install --frozen-lockfile

COPY packages/ packages/
COPY apps/admin/ apps/admin/
RUN pnpm --filter @oee/admin build

FROM nginx:1.27-alpine AS runtime
COPY --from=build /repo/apps/admin/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/ >/dev/null || exit 1
