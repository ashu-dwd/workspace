# WorkSpace Landing Page & Todo Manager — Design Spec

## Overview

A personal note-taking app ("WorkSpace") focused on minimalism and speed. This spec covers two deliverables:

1. **Landing Page** — public-facing site that sells the app's simplicity
2. **Todo Manager** — inline checklists inside notebooks with aggregate view

AI features are deferred to a later spec.

---

## Part 1: Landing Page

### Site Architecture

- **Route:** `/` (current placeholder replaced)
- **Outbound links:** "Start Writing" → `/auth/sign-up`, "Sign In" → `/auth/login`
- **Footer:** minimal "© WorkSpace" + dark/light theme toggle (already exists via next-themes)

### Layout (top-down)

```
┌─────────────────────────────────────┐
│  [Logo]                    [Sign In] │  ← thin nav bar
├─────────────────────────────────────┤
│                                     │
│         your thoughts,              │  ← hero headline
│         uncluttered.                │
│                                     │
│   A fast, beautiful notebook that   │  ← subtext
│   gets out of your way.             │
│                                     │
│   [Start Writing]  [See Features▾]  │  ← CTAs
│                                     │
├─────────────────────────────────────┤
│    ┌───────────────────────┐        │
│    │  Editor Mockup        │        │  ← showcase screenshot
│    │  (markdown + preview) │        │     (static image)
│    │                       │        │
│    └───────────────────────┘        │
│                                     │
├─────────────────────────────────────┤
│  ┌───┐  ┌───┐  ┌───┐              │
│  │ 📝│  │ 💾│  │ 🌙│              │  ← feature strip
│  │Mark│  │Auto│  │Dark│              │     3 icons + 1-liners
│  │down│  │Save│  │Mode│              │
│  └───┘  └───┘  └───┘              │
│                                     │
├─────────────────────────────────────┤
│   © WorkSpace                       │  ← footer
└─────────────────────────────────────┘
```

### Visual Design

- **Color:** Monochrome (#111, #333, #666, #999, #eee) + accent amber (#F59E0B) — warm, fits the editorial/writing feel
- **Typography:** Geist (already loaded) — weight 300 for hero, 400 for body
- **Container:** max-w-4xl, px-6, centered
- **Spacing:** generous vertical rhythm — py-24 hero, py-16 sections
- **Theme:** picks up existing dark/light mode via next-themes (already configured)
- **No** gradients, heavy shadows, illustrations, carousels, or animations beyond subtle fades

### Hero Section

- Headline: `your thoughts, uncluttered.` (lowercase, light weight, large)
- Subtext: one short sentence
- Two CTAs — primary (filled) + secondary (outline)
- "See Features" scrolls to feature strip below (smooth scroll)

### Showcase Section

- Large screenshot/mockup of the notebook editor showing markdown on left, rendered preview on right
- The sidebar visible with a file tree
- Single centered image, max-w-2xl, subtle border radius
- Static for now — no interactive demo

### Feature Strip

Three horizontal items in a row (responsive → column on mobile):

| Icon | Title | Description |
|------|-------|-------------|
| 📝 | Markdown | Write in markdown, see it live. |
| 💾 | Auto-Save | Every change saved instantly. |
| 🌙 | Dark Mode | Easy on the eyes, day or night. |

### Footer

- "© WorkSpace" (copyright current year dynamically)
- GitHub link? Optional — only if relevant

### Responsive Behavior

- Mobile: stacked layout, smaller hero text, feature strip column
- Tablet: same as desktop with slightly tighter padding
- Breakpoints: standard Tailwind (sm/md/lg)

---

## Part 2: Todo Manager

### Philosophy

Todos are just notes with checkboxes. No separate todo app, no due dates, no labels. The notebook is the container.

### Data Model

**Inline storage** — no new DB table initially. Todos live as markdown checklist syntax inside the notebook's `content` field:

```markdown
# My Note

- [ ] Buy groceries
- [x] Finish report
- [ ] Call dentist
```

Parsed from the raw text at query time via a pure function.

### Features

**1. Editor Integration**
- Toolbar button to insert `- [ ]` at cursor
- Clicking a rendered checkbox in preview toggles between `[ ]` and `[x]`
- Auto-save (already exists) persists the change

**2. Notebook-level Summary**
- In the file-tree sidebar, each notebook shows a badge: `2/5 done`
- Parsed from content on notebook list fetch

**3. Aggregate View** (`/dashboard/todos`)
- Flat list of all unchecked todos across all notebooks
- Each item shows: checkbox + todo text + source notebook title (clickable)
- Grouped by notebook
- Checking an item in this view updates the notebook source
- Shows total count: "7 tasks remaining"

### Lib Functions

**`lib/todo-parser.ts`** — pure, no DB deps:

```typescript
// Parse markdown content and return todo items
function parseTodos(content: string): TodoItem[]

// Count done/total for one notebook
function summarizeTodos(content: string): { done: number; total: number }
```

### API

- No new routes needed for inline storage (notebooks CRUD already handles it)
- To support the aggregate view efficiently, one new endpoint:

**`GET /api/todos`** — returns all unchecked todos across user's notebooks
- Response: `{ todos: Array<{ id, notebookId, notebookTitle, text, checked }> }`
- Notebook title included for grouping in UI

### DB Consideration

If the aggregate view becomes slow (parsing every notebook on every load), add a `todos` table later:

```typescript
todosTable: {
  id: integer PK,
  notebookId: integer FK → notebooks.id,
  text: varchar,
  position: integer, // order within notebook
  checked: boolean default false
}
```

This is NOT part of the current scope. Flagged for perf monitoring.

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Styling | Tailwind v4 (already in use) | Consistent with codebase |
| Todo storage | Inline markdown | Zero schema changes, keeps data portable |
| Todo endpoint | Server-parsed from notebooks | Avoids sync issues between inline + separate table |
| Landing images | Static PNG screenshot | Fast, no JS overhead; upgrade to animated later |
| AI (deferred) | — | Works with abstracted `lib/ai.ts` when picked up |

---

## Out of Scope

- AI writing assistant, smart search
- Tags, categories, folders
- Due dates, reminders, priority levels
- Sharing / collaboration
- Interactive landing page demo

---

## Success Criteria

1. Landing page loads fast (no unnecessary JS)
2. All links point to real routes (sign-up, login)
3. Dark/light mode works on landing page
4. Creating a notebook with `- [ ]` shows checkboxes in preview
5. Clicking a checkbox in preview toggles its state and triggers auto-save
6. Sidebar shows todo summary per notebook
7. `/dashboard/todos` lists all unchecked items grouped by notebook
8. Checking a todo in the aggregate view updates the source notebook

---

*Design v1 — July 23, 2025*
