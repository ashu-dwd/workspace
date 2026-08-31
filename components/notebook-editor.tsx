"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  LoaderCircleIcon,
  Eye,
  Edit3,
  Trash2,
  CircleArrowLeft,
  CheckSquare,
  Sparkles,
} from "lucide-react";
import { toggleTodo } from "@/lib/todo-parser";
import { toast } from "sonner";

//  Types

interface NotebookData {
  id: number;
  title: string;
  subtitle: string | null;
  icon: string | null;
  content: string;
  updatedAt: string | null;
}

interface Props {
  notebookId: number;
  onBack?: () => void;
  onDelete?: (id: number) => void;
}

//  Helpers

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

export default function NotebookEditor({
  notebookId,
  onBack,
  onDelete,
}: Props) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [initialized, setInitialized] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef(content);

  // Keep ref in sync
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Fetch notebook

  const { data, isLoading, isError } = useQuery<{ data: NotebookData }>({
    queryKey: ["notebook", notebookId],
    queryFn: async () => {
      const res = await fetch(`/api/notebooks/${notebookId}`);
      if (!res.ok) throw new Error("Failed to load notebook");
      return res.json();
    },
  });

  const { data: userData } = useQuery<{
    data: { openrouterApiKey: string | null };
  }>({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to load user");
      return res.json();
    },
  });

  // Sync fetched data into local state (only on initial load or notebook change)
  // Local editor state must update after the asynchronous query resolves.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (data?.data) {
      setTitle(data.data.title);
      setContent(data.data.content);
      setInitialized(true);
    }
  }, [data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Auto-save on type with debounce

  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      setSaving(false);
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      queryClient.invalidateQueries({ queryKey: ["notebook", notebookId] });
    },
    onError: () => setSaving(false),
  });

  const scheduleSave = useCallback(
    (updates: Record<string, unknown>) => {
      setSaving(true);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        saveMutation.mutate(updates);
      }, 1500);
    },
    [saveMutation],
  );

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  // ── Handlers

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    scheduleSave({ title: newTitle });
  };

  const replaceUploadedPlaceholder = (
    placeholder: string,
    replacement: string,
  ) => {
    setContent((current) => {
      const updated = current.replace(placeholder, replacement);
      scheduleSave({ content: updated });
      return updated;
    });
  };

  async function uploadPastedImage(
    file: File,
    placeholder: string,
    name: string,
  ) {
    const formData = new FormData();
    formData.append("file", file, name);
    formData.append("notebookId", String(notebookId));
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Image upload failed");
      const blob = (await response.json()) as { url: string };
      replaceUploadedPlaceholder(placeholder, `![${name}](${blob.url})`);
    } catch {
      const failed = `![Upload failed — ${name}](uploading)`;
      replaceUploadedPlaceholder(placeholder, failed);
      toast.error(`Upload failed for ${name}`, {
        action: {
          label: "Retry",
          onClick: () => uploadPastedImage(file, failed, name),
        },
      });
    }
  }

  const handleImagePaste = async (
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) => {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    if (files.length === 0) return;

    const allowedTypes = new Set([
      "image/png",
      "image/jpeg",
      "image/gif",
      "image/webp",
    ]);
    const validFiles = files.filter((file) => {
      if (!allowedTypes.has(file.type)) {
        toast.error(`${file.name || "Image"}: unsupported image type`);
        return false;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name || "Image"}: maximum size is 10 MB`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    event.preventDefault();
    const start = event.currentTarget.selectionStart;
    const end = event.currentTarget.selectionEnd;
    const timestamp = Date.now();
    const placeholders = validFiles.map(
      (_, index) =>
        `![Uploading pasted-image-${timestamp}-${index}…](uploading)`,
    );
    const inserted = placeholders.join("\n");
    const nextContent = content.slice(0, start) + inserted + content.slice(end);
    setContent(nextContent);
    scheduleSave({ content: nextContent });

    await Promise.all(
      validFiles.map((file, index) => {
        const name = file.name || `pasted-image-${timestamp}-${index}.png`;
        return uploadPastedImage(file, placeholders[index], name);
      }),
    );
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    scheduleSave({ content: newContent });
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  // ── Insert checkbox ──

  const insertCheckbox = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);
    const newContent = before + "- [ ] " + after;
    setContent(newContent);
    scheduleSave({ content: newContent });

    // Set cursor position after the inserted text
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + 6;
      textarea.selectionStart = textarea.selectionEnd = pos;
    });
  };

  // ── Toggle checkbox in preview

  // Render-local counter used inside ReactMarkdown custom components
  let checkboxIdx = 0;

  const toggleCheckbox = useCallback(
    (targetIdx: number) => {
      const currentContent = contentRef.current;
      const lines = currentContent.split("\n");
      let idx = 0;
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^- \[( |x)\]/);
        if (match) {
          if (idx === targetIdx) {
            const newContent = toggleTodo(currentContent, i);
            setContent(newContent);
            scheduleSave({ content: newContent });
            return;
          }
          idx++;
        }
      }
    },
    [scheduleSave],
  );

  // ── Polish ──

  const polishMutation = useMutation({
    mutationFn: async () => {
      const apiKey = userData?.data?.openrouterApiKey;
      if (!apiKey) {
        throw new Error("No API key configured. Add one in Settings.");
      }

      const res = await fetch("/api/ai/polish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to polish note");
      return res.json();
    },
    onSuccess: (result) => {
      const polished = result.data.polished;
      if (window.confirm("Accept polished version?")) {
        setContent(polished);
        scheduleSave({ content: polished });
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Delete ──

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/notebooks/${notebookId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
      onDelete?.(notebookId);
    },
  });

  // ── States ──

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data?.data) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <p>Failed to load notebook</p>
        <button
          onClick={() =>
            queryClient.invalidateQueries({
              queryKey: ["notebook", notebookId],
            })
          }
          className="text-sm text-primary underline underline-offset-4 cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const notebook = data.data;

  // ── Render ──

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        {onBack && (
          <button
            onClick={onBack}
            className="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer"
            title="Back"
          >
            <CircleArrowLeft className="size-4" />
          </button>
        )}
        <span className="text-lg leading-none">{notebook.icon || "📝"}</span>

        {/* Todo button — only show in edit mode */}
        {!preview && (
          <button
            onClick={insertCheckbox}
            className="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer"
            title="Insert checkbox"
          >
            <CheckSquare className="size-4" />
          </button>
        )}

        {/* Polish button — only show in edit mode */}
        {!preview && (
          <button
            onClick={() => polishMutation.mutate()}
            disabled={polishMutation.isPending}
            className="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
            title="Polish note"
          >
            <Sparkles className="size-4" />
          </button>
        )}

        <span className="text-xs text-muted-foreground ml-auto flex items-center gap-2">
          {saving && (
            <span className="flex items-center gap-1">
              <LoaderCircleIcon className="size-3 animate-spin" />
              Saving...
            </span>
          )}
          {!saving && initialized && (
            <span>Saved {relativeTime(notebook.updatedAt)}</span>
          )}
        </span>
        <button
          onClick={() => setPreview(!preview)}
          className={`size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
            preview ? "bg-accent" : "hover:bg-muted"
          }`}
          title={preview ? "Edit" : "Preview"}
        >
          {preview ? <Edit3 className="size-4" /> : <Eye className="size-4" />}
        </button>
        <div className="relative">
          <button
            onClick={() => setShowDeleteConfirm(!showDeleteConfirm)}
            className="size-7 flex items-center justify-center rounded-md hover:bg-destructive/10 text-destructive transition-colors cursor-pointer"
            title="Delete"
          >
            <Trash2 className="size-4" />
          </button>
          {showDeleteConfirm && (
            <div className="absolute right-0 top-full mt-1 bg-background border rounded-lg shadow-lg p-3 z-10 w-48">
              <p className="text-sm mb-2">Delete this notebook?</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 text-xs px-2 py-1 rounded-md border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    deleteMutation.mutate();
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex-1 text-xs px-2 py-1 rounded-md bg-destructive text-destructive-foreground hover:opacity-90 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Editor body */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="max-w-3xl mx-auto w-full px-8 py-6 flex-1 flex flex-col min-h-0">
          {/* Title */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/30 mb-6 shrink-0"
          />

          {/* Content — full remaining height */}
          <div className="flex-1 overflow-y-auto">
            {preview ? (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    input: (props) => {
                      if (props.type === "checkbox") {
                        const idx = checkboxIdx;
                        checkboxIdx++;
                        return (
                          <input
                            type="checkbox"
                            checked={props.checked ?? false}
                            onChange={() => toggleCheckbox(idx)}
                            className="cursor-pointer"
                          />
                        );
                      }
                      return <input {...props} />;
                    },
                  }}
                >
                  {content || "*No content yet*"}
                </ReactMarkdown>
              </div>
            ) : (
              <>
                <textarea
                  ref={textareaRef}
                  value={content}
                  onChange={handleContentChange}
                  onPaste={handleImagePaste}
                  placeholder="Start writing in markdown..."
                  className="w-full min-h-full bg-transparent border-none outline-none resize-none leading-relaxed placeholder:text-muted-foreground/30 font-mono text-sm"
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
