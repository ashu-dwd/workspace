# AI Features — Design Spec

## Overview

Three AI-powered features for WorkSpace, all using OpenRouter's free model router (`openrouter/free`). Users bring their own API key.

## Architecture

```
Client                         Server                        OpenRouter
──────                         ──────                        ─────────
Settings → saves API key  ──>  DB (users.openrouterApiKey)
Editor/sidebar fetches key ──> GET /api/user
AI request w/ Bearer token ──> POST /api/ai/*  ──> openrouter/free
                              lib/ai.ts reads     https://openrouter.ai
                              Authorization hdr   /api/v1/chat/completions
                              proxies to OR       streaming via SSE
```

### AI Client (`lib/ai.ts`)

Single wrapper around the OpenRouter REST API:

```typescript
function callOpenRouter(params: {
  apiKey: string;
  model: string;        // default "openrouter/free"
  messages: Message[];
  stream?: boolean;
  signal?: AbortSignal;
}): Promise<Response>   // or ReadableStream for streaming
```

- Endpoint: `https://openrouter.ai/api/v1/chat/completions`
- Headers: `Authorization: Bearer <apiKey>`, `Content-Type: application/json`, `HTTP-Referer` (required by OpenRouter)
- Streaming mode returns the raw `Response` body with `ReadableStream<Uint8Array>` for SSE parsing on the client
- Non-streaming returns parsed JSON `{ choices: [{ message: { content } }] }`

### Data Flow

1. **Storage:** User's API key saved in `users.openrouterApiKey` column (encrypted at rest optional — defer for now)
2. **Fetch:** `GET /api/user` now includes `openrouterApiKey` (masked? no — returned in full for client to use)
3. **Send:** Client sends key as `Authorization: Bearer <key>` on every `/api/ai/*` request
4. **Proxy:** Server extracts token from header, calls OpenRouter, returns response

---

## Feature 1: Polish Note

### UX

- Button with `Sparkles` icon in the editor toolbar (next to existing checkbox button)
- Clicking sends current note content to server
- Server calls OpenRouter with prompt:
  > "Improve the clarity and grammar of this text. Keep the original voice and tone. Do not change the meaning. Return only the polished text, no explanations."
- Returns polished text
- Frontend shows diff between original and polished (ReactDiffViewer or simple side-by-side)
- User clicks "Apply" to replace content, or "Discard" to dismiss

### Route

`POST /api/ai/polish`
```json
// Request
{ "content": "# My Note\n\nSome text..." }
// Response
{ "data": { "polished": "# My Note\n\nImproved text..." } }
```

---

## Feature 2: Smart Search

### UX

- Current search bar in notebook sidebar already has text search
- Add an "AI Search" toggle button (stars icon) next to the search input
- When toggled on, the search query is sent to `/api/ai/search` along with notebook content
- Results appear as a dropdown below the search bar instead of filtering the sidebar list
- Shows AI-generated answer with cited notebook titles
- Untoggle to go back to normal text filtering

### Route

`POST /api/ai/search`
```json
// Request
{ "query": "what did I write about react hooks", "notebooks": [{ "id": 1, "title": "...", "content": "..." }] }
// Response
{ "data": { "answer": "You wrote about useEffect...", "citations": ["React Notes"] } }
```

### Implementation Note

- Notebook contents are fetched server-side (the route receives notebook IDs, fetches content from DB)
- Or the client sends all notebook contents (simpler but heavier — use for MVP)
- Prompt: "Answer the user's question based on their notebook contents. Cite the notebook title. Be concise."

---

## Feature 3: Auto-Completion (Copilot-style)

### UX

- While typing in the editor (textarea), after the user pauses ~500ms, send the text before cursor to the API
- Server streams token-by-token via SSE
- Ghost text appears inline at cursor position in a lighter color/gray font
- Pressing `Tab` accepts the completion (inserts remaining text)
- Pressing `Esc` or continuing to type dismisses the ghost text
- Only works in edit mode (not preview)

### Technical Approach

**Debouncing:** When user types, reset a 500ms timer. On expiry, send `/api/ai/complete`.

**Ghost text rendering:** Since we're using a `<textarea>` (not a contenteditable div), ghost text is tricky. Two options:
- **Option A (simpler):** Render a floating `<div>` overlay positioned at the cursor using a hidden mirror `<div>` with the same font/metrics as the textarea
- **Option B (more robust):** Convert editor to contenteditable or use CodeMirror/Monaco — overkill for MVP

**Recommendation: Option A** — use a hidden text mirror to calculate cursor position and render ghost text as an absolute-positioned `<span>`.

### Route

`POST /api/ai/complete`
```json
// Headers: Authorization: Bearer <key>
// Request
{ "context": "The text before cursor..." }
// Response: SSE stream
data: {"token": " and"}
data: {"token": " the"}
data: {"token": " useEffect"}
data: {"token": " hook"}
data: [DONE]
```

### Prompt

> "Complete the user's text naturally. Return only the completion, no explanations. Keep the same style and tone."

### Abort

- If user keeps typing (interrupts the completion), abort the fetch via `AbortController`
- Only one active completion request at a time

---

## DB Changes

Add `openrouter_api_key` column to `users` table:

```typescript
// db/schema.ts
openrouterApiKey: varchar("openrouter_api_key", { length: 255 }),
```

**Migration:** Generate new migration file (0007).

### API Key Validation

- `GET /api/user` — include `openrouterApiKey` in response
- `PATCH /api/user` — accept `openrouterApiKey` field (string, optional)
- Frontend stores in React Query cache, sends as Bearer token
- Do NOT expose in any list endpoints

### Settings Page

New section under existing sections:

```tsx
<Section title="AI">
  <div>
    <label>OpenRouter API Key</label>
    <input type="password" value={key} onChange={...} placeholder="sk-or-..." />
  </div>
  <p className="text-xs text-muted-foreground">
    Used for AI features. Get a free key at openrouter.ai/keys
  </p>
</Section>
```

---

## Out of Scope

- Streaming polish (single request is fine)
- Persistent AI chat history
- Model selection UI (always `openrouter/free`)
- Image generation or multimodal

---

## Files Changed/Created

| File | Action |
|------|--------|
| `lib/ai.ts` | **Create** — OpenRouter client |
| `db/schema.ts` | **Edit** — add openrouterApiKey column |
| `drizzle/0007_*.sql` | **Create** — migration |
| `app/api/ai/polish/route.ts` | **Create** — polish endpoint |
| `app/api/ai/search/route.ts` | **Create** — smart search endpoint |
| `app/api/ai/complete/route.ts` | **Create** — autocomplete endpoint (SSE) |
| `app/api/user/route.ts` | **Edit** — include key in GET, accept in PATCH |
| `interface/profile.ts` | **Edit** — add openrouterApiKey to update schema |
| `app/dashboard/settings/page.tsx` | **Edit** — add AI section with API key input |
| `components/notebook-editor.tsx` | **Edit** — add Polish button, autocomplete logic |
| `components/notebook-sidebar.tsx` | **Edit** — add AI search toggle |

---

*Design v1 — July 23, 2025*
