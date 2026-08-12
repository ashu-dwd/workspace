// ─── Types ───────────────────────────────────────────────────────────────────

export interface TodoItem {
  text: string;
  checked: boolean;
  index: number; // line position in content
}

export interface TodoSummary {
  done: number;
  total: number;
}

// ─── Parse ───────────────────────────────────────────────────────────────────

const CHECKBOX_RE = /^- \[( |x)\] (.+)/;

/**
 * Parse markdown content and return all todo items with their line positions.
 */
export function parseTodos(content: string): TodoItem[] {
  const lines = content.split("\n");
  const todos: TodoItem[] = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(CHECKBOX_RE);
    if (match) {
      todos.push({
        text: match[2],
        checked: match[1] === "x",
        index: i,
      });
    }
  }

  return todos;
}

/**
 * Count done vs total checkboxes in content.
 */
export function summarizeTodos(content: string): TodoSummary {
  const lines = content.split("\n");
  let done = 0;
  let total = 0;

  for (const line of lines) {
    if (/^- \[( |x)\]/.test(line)) {
      total++;
      if (line.includes("[x]")) done++;
    }
  }

  return { done, total };
}

/**
 * Toggle a checkbox at a specific line position.
 * Returns the new content string.
 */
export function toggleTodo(content: string, lineIndex: number): string {
  const lines = content.split("\n");
  if (lineIndex < 0 || lineIndex >= lines.length) return content;

  const line = lines[lineIndex];
  if (/^- \[ \]/.test(line)) {
    lines[lineIndex] = line.replace("[ ]", "[x]");
  } else if (/^- \[x\]/.test(line)) {
    lines[lineIndex] = line.replace("[x]", "[ ]");
  }

  return lines.join("\n");
}
