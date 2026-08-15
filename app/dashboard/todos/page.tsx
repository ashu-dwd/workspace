"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Notebook, LoaderCircleIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toggleTodo, parseTodos } from "@/lib/todo-parser";
import { useRouter } from "next/navigation";

//  Types

interface TodoItemData {
  notebookId: number;
  notebookTitle: string;
  index: number;
  text: string;
  checked: boolean;
}

interface GroupedTodos {
  [notebookId: string]: {
    title: string;
    items: TodoItemData[];
  };
}

//  Component

export default function TodosPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data, isLoading, isError, error, refetch } = useQuery<{
    data: TodoItemData[];
  }>({
    queryKey: ["todos"],
    queryFn: async () => {
      const res = await fetch("/api/todos");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load tasks");
      }
      return res.json();
    },
  });

  // ── Toggle todo

  const toggleMutation = useMutation({
    mutationFn: async ({
      notebookId,
      index,
    }: {
      notebookId: number;
      index: number;
    }) => {
      // Fetch the notebook to get its current content
      const notebookRes = await fetch(`/api/notebooks/${notebookId}`);
      if (!notebookRes.ok) throw new Error("Failed to fetch notebook");
      const notebookData = await notebookRes.json();
      const content: string = notebookData.data.content;

      // Toggle the checkbox
      const newContent = toggleTodo(content, index);

      // Save
      const saveRes = await fetch(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newContent }),
      });
      if (!saveRes.ok) throw new Error("Failed to save");
      return saveRes.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // ── Group todos by notebook

  const rawTodos = data?.data ?? [];
  const uncheckedTodos = rawTodos.filter((t) => !t.checked);
  const checkedTodos = rawTodos.filter((t) => t.checked);

  const groupByNotebook = (items: TodoItemData[]): GroupedTodos => {
    const groups: GroupedTodos = {};
    for (const item of items) {
      const key = String(item.notebookId);
      if (!groups[key]) {
        groups[key] = { title: item.notebookTitle, items: [] };
      }
      groups[key].items.push(item);
    }
    return groups;
  };

  const uncheckedGrouped = groupByNotebook(uncheckedTodos);
  const checkedGrouped = groupByNotebook(checkedTodos);

  // ── States ──

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Tasks</h1>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load tasks"}
        </p>
        <button
          onClick={() => refetch()}
          className="text-sm text-primary underline underline-offset-4 cursor-pointer"
        >
          Try again
        </button>
      </div>
    );
  }

  const totalRemaining = uncheckedTodos.length;
  const totalDone = checkedTodos.length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Tasks</h1>
        {totalRemaining > 0 && (
          <span className="text-sm text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full">
            {totalRemaining} remaining
          </span>
        )}
      </div>

      {/* Empty state */}
      {rawTodos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed text-center">
          <CheckSquare className="size-10 text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-1">No tasks yet</p>
          <p className="text-sm text-muted-foreground/60">
            Add checkboxes like{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">
              - [ ] todo
            </code>{" "}
            to your notes.
          </p>
        </div>
      )}

      {/* Unchecked todos grouped by notebook */}
      {Object.keys(uncheckedGrouped).length > 0 && (
        <section className="mb-8">
          {Object.entries(uncheckedGrouped).map(([notebookId, group]) => (
            <div key={notebookId} className="mb-6">
              <button
                onClick={() =>
                  router.push(`/dashboard/your-notebooks?noteId=${notebookId}`)
                }
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2 cursor-pointer"
              >
                <Notebook className="size-4" />
                {group.title}
              </button>
              <div className="space-y-1">
                {group.items.map((todo, i) => (
                  <label
                    key={`${todo.notebookId}-${todo.index}-${i}`}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={() =>
                        toggleMutation.mutate({
                          notebookId: todo.notebookId,
                          index: todo.index,
                        })
                      }
                      className="size-4 rounded border-muted-foreground/30 cursor-pointer"
                    />
                    <span className="text-sm">{todo.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Done section */}
      {totalDone > 0 && (
        <section>
          <details className="group">
            <summary className="text-sm text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors mb-3">
              Completed ({totalDone})
            </summary>
            {Object.entries(checkedGrouped).map(([notebookId, group]) => (
              <div key={notebookId} className="mb-4">
                <button
                  onClick={() =>
                    router.push(
                      `/dashboard/your-notebooks?noteId=${notebookId}`,
                    )
                  }
                  className="flex items-center gap-2 text-xs font-medium text-muted-foreground/50 hover:text-muted-foreground transition-colors mb-1 cursor-pointer"
                >
                  <Notebook className="size-3" />
                  {group.title}
                </button>
                <div className="space-y-0.5">
                  {group.items.map((todo, i) => (
                    <label
                      key={`done-${todo.notebookId}-${todo.index}-${i}`}
                      className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={true}
                        onChange={() =>
                          toggleMutation.mutate({
                            notebookId: todo.notebookId,
                            index: todo.index,
                          })
                        }
                        className="size-4 rounded border-muted-foreground/30 cursor-pointer"
                      />
                      <span className="text-sm text-muted-foreground/50 line-through">
                        {todo.text}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </section>
      )}
    </div>
  );
}
