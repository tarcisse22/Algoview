# Algoview

Algoview is an interactive code-tracing learning platform. Write JavaScript, run it, and step through every line while variables, arrays, stacks, queues, grids, and trees update in real time.

**Live production URL:** https://algview.vercel.app

## Tech stack

- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS v4 with dark/light mode
- Monaco Editor for editable code
- Babel AST instrumentation for client-side execution tracing

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and navigate to **Playground**.

## Deploy

```bash
npm run build
# Deploy with Vercel CLI or Git integration
```

The production deployment target is `https://algview.vercel.app`.
