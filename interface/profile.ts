import { z } from "zod";

export const updateProfileSchema = z.object({
  username: z
    .string()
    .min(5, "Username must be at least 5 characters")
    .max(255)
    .optional(),
  displayName: z.string().max(255).optional(),
  avatarUrl: z.string().max(50000).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters"),
  });

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
