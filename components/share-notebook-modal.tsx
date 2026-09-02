"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users,
  UserPlus,
  Link as LinkIcon,
  Copy,
  Check,
  Globe,
  Lock,
  Trash2,
  X,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface Collaborator {
  shareId: number;
  userId: number;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  role: "editor" | "viewer";
}

interface ShareData {
  notebookId: number;
  isOwner: boolean;
  owner: {
    id: number;
    username: string;
    displayName: string | null;
    email: string;
    avatarUrl: string | null;
  };
  publicAccess: "off" | "viewer" | "editor";
  shareToken: string | null;
  collaborators: Collaborator[];
}

interface ShareNotebookModalProps {
  notebookId: number | null;
  notebookTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareNotebookModal({
  notebookId,
  notebookTitle,
  isOpen,
  onClose,
}: ShareNotebookModalProps) {
  const queryClient = useQueryClient();
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [copied, setCopied] = useState(false);

  // Fetch share data
  const { data, isLoading, isError, refetch } = useQuery<{ data: ShareData }>({
    queryKey: ["notebook-share", notebookId],
    queryFn: async () => {
      if (!notebookId) throw new Error("No notebook selected");
      const res = await fetch(`/api/notebooks/${notebookId}/share`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load share settings");
      }
      return res.json();
    },
    enabled: isOpen && !!notebookId,
  });

  // Invite collaborator mutation
  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (!notebookId || !emailOrUsername.trim()) return;
      const res = await fetch(`/api/notebooks/${notebookId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailOrUsername, role: inviteRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to share notebook");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`Shared with ${emailOrUsername}`);
      setEmailOrUsername("");
      queryClient.invalidateQueries({ queryKey: ["notebook-share", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      shareId,
      role,
    }: {
      shareId: number;
      role: "editor" | "viewer";
    }) => {
      const res = await fetch(`/api/notebooks/${notebookId}/share/${shareId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Role updated");
      queryClient.invalidateQueries({ queryKey: ["notebook-share", notebookId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Revoke collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: async (shareId: number) => {
      const res = await fetch(`/api/notebooks/${notebookId}/share/${shareId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove access");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Access removed");
      queryClient.invalidateQueries({ queryKey: ["notebook-share", notebookId] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  // Public access settings mutation
  const updatePublicAccessMutation = useMutation({
    mutationFn: async (publicAccess: "off" | "viewer" | "editor") => {
      const res = await fetch(`/api/notebooks/${notebookId}/share/public`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicAccess }),
      });
      if (!res.ok) throw new Error("Failed to update link sharing");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Link access updated");
      queryClient.invalidateQueries({ queryKey: ["notebook-share", notebookId] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  if (!isOpen) return null;

  const shareData = data?.data;
  const publicAccess = shareData?.publicAccess ?? "off";
  const shareToken = shareData?.shareToken;

  const getShareableUrl = () => {
    if (!shareToken) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/share/${shareToken}`;
  };

  const handleCopyLink = () => {
    const url = getShareableUrl();
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Share link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
      <div className="bg-background rounded-2xl border shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            <h2 className="font-semibold text-lg truncate max-w-[280px]">
              Share &quot;{notebookTitle}&quot;
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="size-6 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Loading share settings...</p>
            </div>
          ) : isError || !shareData ? (
            <div className="text-center py-8 space-y-2">
              <p className="text-sm text-muted-foreground">Failed to load share settings.</p>
              <button
                onClick={() => refetch()}
                className="text-xs text-primary underline cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Invite User Section */}
              {shareData.isOwner && (
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                    Add People
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Enter email or username..."
                        value={emailOrUsername}
                        onChange={(e) => setEmailOrUsername(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") inviteMutation.mutate();
                        }}
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-hidden focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                    <select
                      value={inviteRole}
                      onChange={(e) =>
                        setInviteRole(e.target.value as "editor" | "viewer")
                      }
                      className="text-sm border rounded-lg px-2.5 py-2 bg-background cursor-pointer"
                    >
                      <option value="viewer">Can view</option>
                      <option value="editor">Can edit</option>
                    </select>
                    <button
                      onClick={() => inviteMutation.mutate()}
                      disabled={inviteMutation.isPending || !emailOrUsername.trim()}
                      className="flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {inviteMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <UserPlus className="size-4" />
                      )}
                      Share
                    </button>
                  </div>
                </div>
              )}

              {/* People with Access Section */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  People with Access
                </label>
                <div className="space-y-2">
                  {/* Owner */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                        {shareData.owner.username[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {shareData.owner.displayName || shareData.owner.username}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {shareData.owner.email}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground bg-muted px-2.5 py-1 rounded-md">
                      Owner
                    </span>
                  </div>

                  {/* Collaborators */}
                  {shareData.collaborators.map((collab) => (
                    <div
                      key={collab.shareId}
                      className="flex items-center justify-between p-2.5 rounded-lg border"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                          {collab.username[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {collab.displayName || collab.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {collab.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {shareData.isOwner ? (
                          <select
                            value={collab.role}
                            onChange={(e) =>
                              updateRoleMutation.mutate({
                                shareId: collab.shareId,
                                role: e.target.value as "editor" | "viewer",
                              })
                            }
                            className="text-xs border rounded-md px-2 py-1 bg-background cursor-pointer"
                          >
                            <option value="viewer">Can view</option>
                            <option value="editor">Can edit</option>
                          </select>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">
                            Can {collab.role}
                          </span>
                        )}

                        {(shareData.isOwner ||
                          collab.userId === shareData.owner.id) && (
                          <button
                            onClick={() =>
                              removeCollaboratorMutation.mutate(collab.shareId)
                            }
                            title="Remove access"
                            className="p-1 text-muted-foreground hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* General Access & Link Sharing Section */}
              <div className="space-y-3 pt-2 border-t">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                  General Access
                </label>

                <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 rounded-lg bg-background border">
                      {publicAccess === "off" ? (
                        <Lock className="size-4 text-muted-foreground" />
                      ) : (
                        <Globe className="size-4 text-emerald-600" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {publicAccess === "off"
                          ? "Restricted"
                          : publicAccess === "viewer"
                          ? "Anyone with the link can view"
                          : "Anyone with the link can edit"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {publicAccess === "off"
                          ? "Only added collaborators can access"
                          : "Anyone on the internet with this link can access"}
                      </p>
                    </div>
                  </div>

                  {shareData.isOwner && (
                    <select
                      value={publicAccess}
                      onChange={(e) =>
                        updatePublicAccessMutation.mutate(
                          e.target.value as "off" | "viewer" | "editor",
                        )
                      }
                      className="text-xs border rounded-md px-2.5 py-1.5 bg-background font-medium cursor-pointer"
                    >
                      <option value="off">Restricted</option>
                      <option value="viewer">Can view</option>
                      <option value="editor">Can edit</option>
                    </select>
                  )}
                </div>

                {publicAccess !== "off" && shareToken && (
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 border rounded-lg px-3 py-2 text-xs text-muted-foreground truncate bg-muted/40 font-mono">
                      {getShareableUrl()}
                    </div>
                    <button
                      onClick={handleCopyLink}
                      className="flex items-center gap-1.5 text-xs font-medium border rounded-lg px-3 py-2 hover:bg-muted transition-colors cursor-pointer"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5" />
                      )}
                      {copied ? "Copied" : "Copy link"}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
