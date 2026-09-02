"use client";

import { use, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LoaderCircleIcon, Lock, Globe, User, BookOpen } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface SharedNotebookData {
  id: number;
  title: string;
  subtitle: string | null;
  icon: string | null;
  content: string;
  publicAccess: "viewer" | "editor";
  role: "viewer" | "editor";
  updatedAt: string | null;
  owner: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export default function PublicSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const token = resolvedParams.token;
  const [content, setContent] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery<{
    data: SharedNotebookData;
  }>({
    queryKey: ["public-notebook", token],
    queryFn: async () => {
      const res = await fetch(`/api/share/${token}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Shared notebook not found");
      }
      return res.json();
    },
  });

  const notebook = data?.data;
  const isEditor = notebook?.role === "editor";
  const displayContent = content !== null ? content : notebook?.content ?? "";

  const saveMutation = useMutation({
    mutationFn: async (updatedContent: string) => {
      if (!notebook) return;
      const res = await fetch(`/api/notebooks/${notebook.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: updatedContent }),
      });
      if (!res.ok) throw new Error("Failed to save changes");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Saved changes");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3">
        <LoaderCircleIcon className="size-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Loading shared notebook...</p>
      </div>
    );
  }

  if (isError || !notebook) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center space-y-4">
        <div className="size-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <Lock className="size-6" />
        </div>
        <div className="space-y-1 max-w-sm">
          <h1 className="text-xl font-bold">Access Restricted</h1>
          <p className="text-sm text-muted-foreground">
            {error instanceof Error
              ? error.message
              : "This notebook is private or the share link has expired."}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors inline-block"
        >
          Go to Workspace
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/grid.png" alt="Workspace" className="size-7" />
          <span className="font-semibold text-base">Workspace</span>
          <span className="text-xs bg-muted text-muted-foreground px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
            <Globe className="size-3 text-emerald-600" />
            Public View ({notebook.role})
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-medium bg-primary text-primary-foreground px-3.5 py-2 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-8">
        {/* Owner Info Header */}
        <div className="flex items-center justify-between pb-6 mb-6 border-b">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
              {notebook.owner.username[0]}
            </div>
            <div>
              <p className="text-sm font-semibold">
                Shared by {notebook.owner.displayName || notebook.owner.username}
              </p>
              <p className="text-xs text-muted-foreground">
                Public Link Access ({notebook.role === "editor" ? "Can edit" : "Can view"})
              </p>
            </div>
          </div>
        </div>

        {/* Notebook Title & Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{notebook.icon || "📝"}</span>
            <h1 className="text-3xl font-bold">{notebook.title}</h1>
          </div>
          {notebook.subtitle && (
            <p className="text-muted-foreground text-base">{notebook.subtitle}</p>
          )}

          <div className="pt-6">
            {isEditor ? (
              <div className="space-y-4">
                <textarea
                  value={displayContent}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full min-h-[400px] p-4 border rounded-xl bg-background font-mono text-sm leading-relaxed focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                  placeholder="Write content..."
                />
                <button
                  onClick={() => saveMutation.mutate(displayContent)}
                  disabled={saveMutation.isPending}
                  className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none border rounded-xl p-6 bg-card">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayContent || "*No content available*"}
                </ReactMarkdown>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
