# AutoSEO Dashboard

React + TypeScript frontend for the AutoSEO clip pipeline.

## Prerequisites

- Node.js 22+
- AutoSEO backend running on `localhost:8080`

## Development

```bash
npm install
npm run dev
```

The dev server starts at `http://localhost:5173`. API requests to `/api/*` are automatically proxied to the Rust backend at `localhost:8080`.

## Build

```bash
npm run build
npm run preview   # preview the production build locally
```

Output goes to `dist/`.

## Docker

Build and run the dashboard container:

```bash
docker build -t autoseo-dashboard .
docker run -p 3000:80 autoseo-dashboard
```

The nginx config proxies `/api/*` requests to a container named `autoseo` on port 8080. When using docker-compose, ensure both services share a network.

## Stack

- React 19 + TypeScript
- Vite 7
- Tailwind CSS 4
- shadcn/ui (Radix primitives)
- Recharts (analytics charts)
