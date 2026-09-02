import { z } from "zod";

export interface NotificationItem {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean | null;
  createdAt: string | Date | null;
  updatedAt: string | Date | null;
}

export const updateNotificationSchema = z.object({
  id: z.number().optional(),
  isRead: z.boolean().optional(),
  markAllAsRead: z.boolean().optional(),
});

export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
