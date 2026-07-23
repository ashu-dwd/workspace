"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import {
  User,
  Camera,
  Sun,
  Moon,
  Lock,
  Save,
  LoaderCircleIcon,
  Check,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  id: number;
  username: string;
  displayName: string | null;
  email: string;
  avatarUrl: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-5 space-y-4">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Fetch user ─────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery<{ data: UserData }>({
    queryKey: ["user"],
    queryFn: async () => {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to load profile");
      return res.json();
    },
  });

  const user = data?.data;

  // ── Local form state ───────────────────────────────────────────────────────
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // Sync fetched data into form
  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setDisplayName(user.displayName ?? "");
      setAvatarPreview(user.avatarUrl);
    }
  }, [user]);

  // ── Save profile ───────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save");
      }
      return res.json();
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["notebooks"] });
    },
  });

  const handleSave = () => {
    const updates: Record<string, unknown> = {};
    if (username !== user?.username) updates.username = username;
    const dn = displayName || null;
    if (dn !== (user?.displayName ?? null)) updates.displayName = dn;
    if (avatarPreview !== user?.avatarUrl) updates.avatarUrl = avatarPreview;
    if (Object.keys(updates).length === 0) return;
    saveMutation.mutate(updates);
  };

  // ── Avatar upload ──────────────────────────────────────────────────────────
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
      setDirty(true);
    };
    reader.readAsDataURL(file);
  };

  // ── Password change ────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const passwordMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to change password");
      }
      return res.json();
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
    },
  });

  const handlePasswordChange = () => {
    if (newPassword.length < 6) return;
    passwordMutation.mutate();
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoaderCircleIcon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Could not load profile.
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* ── Profile section ──────────────────────────────────────────────── */}
      <Section title="Profile">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="size-16 rounded-full bg-muted flex items-center justify-center text-xl font-bold overflow-hidden">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-6 text-muted-foreground" />
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
              title="Change photo"
            >
              <Camera className="size-3" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <div>
            <p className="font-medium">{user.displayName || user.username}</p>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Username */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setDirty(true);
            }}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Display name */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Display Name
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDirty(true);
            }}
            placeholder="Optional"
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Email (read-only) */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Email
          </label>
          <input
            type="email"
            value={user.email}
            readOnly
            className="w-full h-9 px-3 rounded-md border bg-muted/50 text-sm text-muted-foreground cursor-not-allowed"
          />
        </div>

        {/* Save button */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!dirty || saveMutation.isPending}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saveMutation.isPending ? (
              <LoaderCircleIcon className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </button>
          {dirty && (
            <span className="text-xs text-muted-foreground">
              You have unsaved changes
            </span>
          )}
          {saveMutation.isSuccess && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <Check className="size-3" /> Saved
            </span>
          )}
          {saveMutation.isError && (
            <span className="text-xs text-destructive">
              {saveMutation.error instanceof Error
                ? saveMutation.error.message
                : "Failed to save"}
            </span>
          )}
        </div>
      </Section>

      {/* ── Appearance ──────────────────────────────────────────────────── */}
      <Section title="Appearance">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Switch between light and dark mode
            </p>
          </div>
          <div className="flex gap-1 rounded-lg border p-1">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm transition-colors cursor-pointer ${
                theme === "light"
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <Sun className="size-4" />
              Light
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-sm transition-colors cursor-pointer ${
                theme === "dark"
                  ? "bg-muted font-medium"
                  : "hover:bg-muted/50 text-muted-foreground"
              }`}
            >
              <Moon className="size-4" />
              Dark
            </button>
          </div>
        </div>
      </Section>

      {/* ── Password ────────────────────────────────────────────────────── */}
      <Section title="Password">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="w-full h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <button
          onClick={handlePasswordChange}
          disabled={
            !currentPassword ||
            newPassword.length < 6 ||
            passwordMutation.isPending
          }
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {passwordMutation.isPending ? (
            <LoaderCircleIcon className="size-4 animate-spin" />
          ) : (
            <Lock className="size-4" />
          )}
          Change Password
        </button>
        {passwordMutation.isSuccess && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <Check className="size-3" /> Password changed
          </p>
        )}
        {passwordMutation.isError && (
          <p className="text-xs text-destructive">
            {passwordMutation.error instanceof Error
              ? passwordMutation.error.message
              : "Failed to change password"}
          </p>
        )}
      </Section>

      {/* ── Account info ────────────────────────────────────────────────── */}
      <Section title="Account">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">Role</p>
            <p className="font-medium capitalize">{user.role}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Verified</p>
            <p className="font-medium">
              {user.isVerified ? (
                <span className="text-emerald-600">Yes</span>
              ) : (
                "No"
              )}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Member Since</p>
            <p className="font-medium">{formatDate(user.createdAt)}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">User ID</p>
            <p className="font-medium text-muted-foreground">#{user.id}</p>
          </div>
        </div>
      </Section>
    </div>
  );
}
