"use client";

import { useQuery } from "@tanstack/react-query";
import { Notebook, BookOpen, Clock, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
//  Types

interface Notebook {
  id: number;
  title: string;
  subtitle: string | null;
  updatedAt: string | null;
}

interface DashboardData {
  stats: {
    totalNotebooks: number;
  };
  recentNotebooks: Notebook[];
}

//  Helpers ──

function relativeTime(date: string | null): string {
  if (!date) return "Never";
  try {
    const now = Date.now();
    const then = new Date(date).getTime();
    const diffMs = now - then;
    if (diffMs < 0) return "Just now";

    const seconds = Math.floor(diffMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

    if (days > 30) {
      const months = Math.floor(days / 30);
      return rtf.format(-months, "month");
    }
    if (days > 0) return rtf.format(-days, "day");
    if (hours > 0) return rtf.format(-hours, "hour");
    if (minutes > 0) return rtf.format(-minutes, "minute");
    return "Just now";
  } catch {
    return "Unknown";
  }
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

//  Skeleton ─

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border p-4 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      {/* Recent notebooks */}
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

//  Stat Card

const statCards = [
  {
    label: "Total Notebooks",
    icon: Notebook,
    color: "text-blue-600",
    bg: "bg-blue-50",
    getValue: (d: DashboardData) => String(d.stats.totalNotebooks),
  },
  {
    label: "Recent Activity",
    icon: Clock,
    color: "text-amber-600",
    bg: "bg-amber-50",
    getValue: (d: DashboardData) => {
      const recent = d.recentNotebooks[0]?.updatedAt;
      return recent ? relativeTime(recent) : "None";
    },
  },
  {
    label: "Notebooks Created",
    icon: BookOpen,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    getValue: (d: DashboardData) => {
      // Count notebooks created this week
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const count = d.recentNotebooks.filter((n) => {
        const t = n.updatedAt ? new Date(n.updatedAt).getTime() : 0;
        return t >= weekAgo;
      }).length;
      return `${count} this week`;
    },
  },
  {
    label: "Writing Streak",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-50",
    getValue: () => "Coming soon",
  },
];

//  Main Page

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || "Failed to load dashboard");
      }
      return res.json();
    },
  });

  // Loading state
  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <DashboardSkeleton />
      </div>
    );
  }

  // Error state
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load dashboard"}
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

  const hasNotebooks = data.recentNotebooks.length > 0;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-xl border p-4 flex items-start gap-3"
          >
            <div className={`rounded-lg p-2 ${card.bg} ${card.color}`}>
              <card.icon className="size-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">{card.label}</p>
              <p className="text-xl font-semibold">{card.getValue(data)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent notebooks */}
      <section>
        <h2 className="text-lg font-semibold mb-4">Recent Notebooks</h2>

        {!hasNotebooks ? (
          <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed text-center">
            <Notebook className="size-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground mb-1">No notebooks yet</p>
            <p className="text-sm text-muted-foreground/60">
              Create your first notebook to get started.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentNotebooks.map((notebook) => (
              <div
                key={notebook.id}
                className="rounded-xl border p-4 hover:shadow-sm transition-shadow cursor-pointer"
              >
                <h3 className="font-medium truncate">{notebook.title}</h3>
                {notebook.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {notebook.subtitle}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/60 mt-3">
                  Updated {relativeTime(notebook.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
