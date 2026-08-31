import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export function useFileUpload() {
  const mutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("File upload failed");
      }

      return res.json();
    },
  });

  const uploadFile = async (file: File) => {
    try {
      const data = await mutation.mutateAsync(file);
      toast.success("File uploaded successfully!");
      return data;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "File upload failed",
      );
    }
  };

  return { uploadFile, isLoading: mutation.isPending };
}
