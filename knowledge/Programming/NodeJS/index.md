---
title: Node.js Notes
tags:
  - Node.js
  - JavaScript
  - Backend
type: page
---

# Node.js Notes

Node.js is a JavaScript runtime built on Chrome's V8 JavaScript engine. It enables server-side JavaScript development.

## Event Loop

The event loop is the heart of Node.js. It allows non-blocking I/O operations despite JavaScript being single-threaded.

### Phases

1. **Timers** — Execute `setTimeout` and `setInterval` callbacks
2. **Pending callbacks** — Execute I/O callbacks deferred to next loop
3. **Idle, prepare** — Internal operations
4. **Poll** — Retrieve new I/O events
5. **Check** — Execute `setImmediate` callbacks
6. **Close callbacks** — Execute close event callbacks

## Key Modules

- `fs` — File system operations
- `path` — File path utilities
- `http` / `https` — HTTP server and client
- `stream` — Streaming data
- `events` — Event emitter pattern

## ESM vs CommonJS

Node.js now fully supports ES Modules (`import`/`export`). Set `"type": "module"` in `package.json` or use `.mjs` extension.

## Package Management

Use `npm` or `pnpm` for package management. Lock files should always be committed.
