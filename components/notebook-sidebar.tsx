"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Notebook,
  Search,
  Plus,
  LoaderCircleIcon,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { summarizeTodos } from "@/lib/todo-parser";

//  Types

interface NotebookListItem {
  id: number;
  title: string;
  icon: string | null;
  content: string;
  updatedAt: string | null;
}

interface Props {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

//  Helpers ──

function relativeTime(date: string | null): string {
  if (!date) return "";
  try {
    const diffMs = Date.now() - new Date(date).getTime();
    if (diffMs < 0) return "just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return `${Math.floor(days / 30)}mo ago`;
  } catch {
    return "";
  }
}

//  Component

export default function NotebookSidebar({ selectedId, onSelect }: Props) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [aiSearch, setAiSearch] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const aiDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading } = useQuery<{ data: NotebookListItem[] }>({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const res = await fetch("/api/notebooks?limit=100");
      if (!res.ok) throw new Error("Failed to load notebooks");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notebooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled" }),
      });
      if (!res.ok) throw new Error("Failed to create notebook");
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      onSelect(result.data.id);
    },
  });

  // ── AI search

  const handleAiSearch = async (query: string) => {
    const allNotebooks = data?.data ?? [];
    if (allNotebooks.length === 0) {
      setAiAnswer("No notebooks to search.");
      return;
    }

    setAiLoading(true);
    setAiAnswer(null);

    try {
      const userRes = await fetch("/api/user");
      const userData = await userRes.json();
      const apiKey = userData.data?.openrouterApiKey;

      if (!apiKey) {
        setAiAnswer("No API key configured. Add one in Settings.");
        setAiLoading(false);
        return;
      }

      const res = await fetch("/api/ai/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          query,
          notebooks: allNotebooks.map((nb) => ({
            id: nb.id,
            title: nb.title,
            content: nb.content,
          })),
        }),
      });

      if (!res.ok) {
        setAiAnswer("Failed to search. Try again later.");
        setAiLoading(false);
        return;
      }

      const result = await res.json();
      setAiAnswer(result.data.answer);
    } catch {
      setAiAnswer("Search failed. Check your connection.");
    }

    setAiLoading(false);
  };

  const notebooks = data?.data ?? [];
  const filtered = search
    ? notebooks.filter((n) =>
        n.title.toLowerCase().includes(search.toLowerCase()),
      )
    : notebooks;

  return (
    <div className="w-64 border-r flex flex-col h-full bg-muted/20">
      {/* Header */}
      <div className="p-3 border-b relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Notebooks
          </h2>
          <button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending}
            className="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            title="New notebook"
          >
            {createMutation.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
          </button>
        </div>
        <div className="flex gap-1">
          <div className="relative flex-1">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                const val = e.target.value;
                setSearch(val);

                if (aiSearch && val.trim()) {
                  if (aiDebounceRef.current)
                    clearTimeout(aiDebounceRef.current);
                  aiDebounceRef.current = setTimeout(() => {
                    handleAiSearch(val);
                  }, 300);
                }
                if (!val.trim()) setAiAnswer(null);
              }}
              className="w-full h-8 pl-8 pr-3 text-sm rounded-md border bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <button
            onClick={() => setAiSearch(!aiSearch)}
            className={`size-8 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
              aiSearch
                ? "bg-accent text-accent-foreground"
                : "hover:bg-muted text-muted-foreground"
            }`}
            title="AI Search"
          >
            <Sparkles className="size-4" />
          </button>
        </div>
      </div>

      {/* AI answer dropdown */}
      {aiSearch && (aiAnswer || aiLoading) && (
        <div className="absolute left-3 right-3 top-full mt-1 z-20 bg-background border rounded-lg shadow-lg p-3 text-sm">
          {aiLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoaderCircleIcon className="size-3 animate-spin" />
              Searching...
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold text-muted-foreground mb-1">
                AI Answer
              </p>
              <p className="text-foreground text-xs leading-relaxed">
                {aiAnswer}
              </p>
            </>
          )}
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <LoaderCircleIcon className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            {search ? "No matches" : "No notebooks yet"}
          </p>
        ) : (
          filtered.map((nb) => {
            const todoSummary = summarizeTodos(nb.content);
            return (
              <button
                key={nb.id}
                onClick={() => onSelect(nb.id)}
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 cursor-pointer ${
                  selectedId === nb.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <span className="flex-shrink-0 text-base leading-none">
                  {nb.icon || "📝"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{nb.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {relativeTime(nb.updatedAt)}
                  </p>
                </div>
                {todoSummary.total > 0 && (
                  <span className="flex-shrink-0 flex items-center gap-1 text-xs text-muted-foreground/60">
                    <CheckSquare className="size-3" />
                    {todoSummary.done}/{todoSummary.total}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
