import { z } from "zod";

export const createNotebookSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  subtitle: z.string().max(255).optional().default(""),
  icon: z.string().max(10).optional(),
  content: z.string().optional().default(""),
});

export const updateNotebookSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  subtitle: z.string().max(255).optional(),
  icon: z.string().max(10).optional(),
  content: z.string().optional(),
});

export type CreateNotebookInput = z.infer<typeof createNotebookSchema>;
export type UpdateNotebookInput = z.infer<typeof updateNotebookSchema>;
