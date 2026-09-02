"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  User,
  Lock,
  Info,
  Trash,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { NotificationItem } from "@/interface/notification";

function relativeTime(date: string | Date | null): string {
  if (!date) return "";
  try {
    const diffMs = Date.now() - new Date(date).getTime();
    if (diffMs < 0) return "Just now";
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
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

function getNotificationIcon(type: string) {
  switch (type) {
    case "notebook_created":
      return <FileText className="size-5 text-blue-600" />;
    case "notebook_deleted":
      return <Trash2 className="size-5 text-red-500" />;
    case "profile_updated":
      return <User className="size-5 text-purple-600" />;
    case "security_update":
      return <Lock className="size-5 text-amber-600" />;
    default:
      return <Info className="size-5 text-emerald-600" />;
  }
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const { data, isLoading, isError, error, refetch } = useQuery<{
    data: NotificationItem[];
    unreadCount: number;
  }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load notifications");
      }
      return res.json();
    },
  });

  // Mark single as read / unread
  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, isRead }: { id: number; isRead: boolean }) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to update notification");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Mark all as read
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to mark notifications as read");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Delete single notification
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to delete notification");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  // Clear all notifications
  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications", {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to clear notifications");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border rounded-xl flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3 w-full">
                <Skeleton className="size-9 rounded-lg flex-shrink-0" />
                <div className="space-y-2 w-3/4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
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
          {error instanceof Error
            ? error.message
            : "Failed to load notifications"}
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

  const notifications = data.data ?? [];
  const unreadCount = data.unreadCount ?? 0;

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {unreadCount > 0 && (
            <span className="bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full">
              {unreadCount} unread
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {unreadCount > 0 && (
            <button
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <CheckCheck className="size-3.5" />
              Mark all as read
            </button>
          )}

          {notifications.length > 0 && (
            <button
              onClick={() => clearAllMutation.mutate()}
              disabled={clearAllMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash className="size-3.5" />
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`text-sm px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
            filter === "all"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("unread")}
          className={`text-sm px-3 py-1 rounded-md transition-colors cursor-pointer font-medium ${
            filter === "unread"
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-dashed rounded-xl text-center">
          <BellOff className="size-10 text-muted-foreground/40 mb-3" />
          <p className="font-medium text-muted-foreground">
            {filter === "unread"
              ? "No unread notifications"
              : "No notifications yet"}
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {filter === "unread"
              ? "You're all caught up!"
              : "Notifications about activity and account changes will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-xl border transition-all flex items-start justify-between gap-4 group ${
                !item.isRead
                  ? "bg-primary/[0.03] border-primary/20 shadow-xs"
                  : "bg-background hover:bg-muted/30"
              }`}
            >
              <div className="flex items-start gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-muted/60 flex-shrink-0">
                  {getNotificationIcon(item.type)}
                </div>
                <div className="min-w-0 space-y-1">
                  <p
                    className={`text-sm leading-relaxed ${
                      !item.isRead
                        ? "font-semibold text-foreground"
                        : "text-foreground/90"
                    }`}
                  >
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {relativeTime(item.createdAt)}
                    </span>
                    {!item.isRead && (
                      <span className="size-2 rounded-full bg-primary inline-block" />
                    )}
                  </div>
                </div>
              </div>

              {/* Item Action Buttons */}
              <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() =>
                    toggleReadMutation.mutate({
                      id: item.id,
                      isRead: !item.isRead,
                    })
                  }
                  title={item.isRead ? "Mark as unread" : "Mark as read"}
                  className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
                >
                  <Check className="size-4" />
                </button>
                <button
                  onClick={() => deleteMutation.mutate(item.id)}
                  title="Delete notification"
                  className="p-1.5 text-muted-foreground hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
