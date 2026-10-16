# syntax=docker/dockerfile:1

# Development image for the Private AI Lead Assistant workspaces.
# One context, two targets: `docker compose up` builds the server and client
# services from this file (see docker-compose.yml).
FROM node:22-alpine AS base
WORKDIR /app
ENV CI=true

# Install the workspace dependencies once; both targets inherit them.
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
RUN npm ci

FROM base AS server
COPY server ./server
EXPOSE 3001
CMD ["npm", "run", "dev", "-w", "server"]

FROM base AS client
COPY client ./client
EXPOSE 5173
CMD ["npm", "run", "dev", "-w", "client", "--", "--host"]
