"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Notebook } from "lucide-react";
import NotebookSidebar from "@/components/notebook-sidebar";
import NotebookEditor from "@/components/notebook-editor";

//  Inner component (needs Suspense for useSearchParams) ──

function YourNotebooksContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const noteIdParam = searchParams.get("noteId");
  const selectedId = noteIdParam ? Number(noteIdParam) : null;

  const handleSelect = (id: number) => {
    router.push(`/dashboard/your-notebooks?noteId=${id}`);
  };

  const handleBack = () => {
    router.push("/dashboard/your-notebooks");
  };

  const handleDelete = () => {
    router.push("/dashboard/your-notebooks");
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-4">
      <NotebookSidebar selectedId={selectedId} onSelect={handleSelect} />

      <div className="flex-1 flex flex-col">
        {selectedId ? (
          <NotebookEditor
            notebookId={selectedId}
            onBack={handleBack}
            onDelete={handleDelete}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Notebook className="size-12 text-muted-foreground/30 mb-4" />
            <p className="text-lg font-medium mb-1">Select a notebook</p>
            <p className="text-sm">
              Choose a notebook from the sidebar or create a new one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

//  Page export ─

export default function YourNotebooksPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Loading...
        </div>
      }
    >
      <YourNotebooksContent />
    </Suspense>
  );
}
