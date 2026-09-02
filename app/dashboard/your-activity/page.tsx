"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Notebook,
  Calendar,
  Clock,
  TrendingUp,
  Plus,
  FileEdit,
  BarChart3,
  Activity,
  Zap,
  Target,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

// ─── Types

interface NotebookItem {
  id: number;
  title: string;
  icon: string | null;
  subtitle: string | null;
  content: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ActivityEvent {
  type: "created" | "updated";
  notebookId: number;
  title: string;
  icon: string;
  timestamp: string;
  label: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(date: Date): string {
  const today = new Date();
  if (sameDay(date, today)) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

function formatShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}) {
  return (
    <div className="rounded-xl border p-4 flex items-start gap-3">
      <div className={`rounded-lg p-2 ${bg} ${color}`}>
        <Icon className="size-5" />
      </div>
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; fill: string }[];
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-background border rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.fill }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

export default function YourActivityPage() {
  const { data, isLoading } = useQuery<{ data: NotebookItem[] }>({
    queryKey: ["notebooks"],
    queryFn: async () => {
      const res = await fetch("/api/notebooks?limit=200");
      if (!res.ok) throw new Error("Failed to load notebooks");
      return res.json();
    },
  });

  const notebooks = data?.data ?? [];

  // ── Compute stats ──────────────────────────────────────────────────────────

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const monthAgo = now - 30 * 24 * 60 * 60 * 1000;

  const createdThisWeek = notebooks.filter((n) => {
    const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    return t >= weekAgo;
  }).length;

  const editedThisWeek = notebooks.filter((n) => {
    const t = n.updatedAt ? new Date(n.updatedAt).getTime() : 0;
    return t >= weekAgo;
  }).length;

  const createdThisMonth = notebooks.filter((n) => {
    const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
    return t >= monthAgo;
  }).length;

  // ── Content stats ──────────────────────────────────────────────────────────

  const totalContentChars = notebooks.reduce(
    (acc, n) => acc + (n.content?.length || 0),
    0,
  );
  const avgContentLen =
    notebooks.length > 0 ? Math.round(totalContentChars / notebooks.length) : 0;
  const longestTitle =
    notebooks.length > 0
      ? notebooks.reduce((prev, n) =>
          (n.title?.length || 0) > (prev.title?.length || 0) ? n : prev,
        ).title
      : "—";

  // ── Chart data: last 7 days (daily notebooks created) ──────────────────────

  const last7Days: { day: string; Created: number; Edited: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(
      d.getFullYear(),
      d.getMonth(),
      d.getDate(),
    ).getTime();
    const dayEnd = dayStart + 24 * 60 * 60 * 1000;

    const created = notebooks.filter((n) => {
      const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
      return t >= dayStart && t < dayEnd;
    }).length;

    const edited = notebooks.filter((n) => {
      const t = n.updatedAt ? new Date(n.updatedAt).getTime() : 0;
      return t >= dayStart && t < dayEnd;
    }).length;

    last7Days.push({
      day: getDayLabel(d),
      Created: created,
      Edited: edited,
    });
  }

  // ── Chart data: last 30 days (cumulative notebook growth) ─────────────────

  const last30Days: { date: string; Total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const dayEnd =
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() +
      24 * 60 * 60 * 1000;

    const total = notebooks.filter((n) => {
      const t = n.createdAt ? new Date(n.createdAt).getTime() : 0;
      return t < dayEnd;
    }).length;

    last30Days.push({
      date: formatShort(d),
      Total: total,
    });
  }

  // ── Streak detection ───────────────────────────────────────────────────────

  let currentStreak = 0;
  const allActivityDates = new Set<string>();
  notebooks.forEach((n) => {
    if (n.createdAt) {
      const d = new Date(n.createdAt);
      allActivityDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
    if (n.updatedAt) {
      const d = new Date(n.updatedAt);
      allActivityDates.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
    }
  });

  for (let i = 0; i < 365; i++) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (allActivityDates.has(key)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // ── Most active day ────────────────────────────────────────────────────────

  const dayActivityCount: Record<string, number> = {};
  notebooks.forEach((n) => {
    if (n.createdAt) {
      const d = new Date(n.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dayActivityCount[key] = (dayActivityCount[key] || 0) + 1;
    }
    if (n.updatedAt) {
      const d = new Date(n.updatedAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      dayActivityCount[key] = (dayActivityCount[key] || 0) + 1;
    }
  });

  let mostActiveDay = "—";
  let mostActiveCount = 0;
  for (const [key, count] of Object.entries(dayActivityCount)) {
    if (count > mostActiveCount) {
      mostActiveCount = count;
      const [y, m, day] = key.split("-").map(Number);
      mostActiveDay = formatDate(new Date(y, m, day));
    }
  }

  // ── Build activity timeline

  const events: ActivityEvent[] = [];

  notebooks.forEach((n) => {
    if (n.createdAt) {
      events.push({
        type: "created",
        notebookId: n.id,
        title: n.title,
        icon: n.icon || "📝",
        timestamp: n.createdAt,
        label: "Created",
      });
    }
    if (
      n.updatedAt &&
      n.createdAt &&
      Math.abs(
        new Date(n.updatedAt).getTime() - new Date(n.createdAt).getTime(),
      ) > 60000
    ) {
      events.push({
        type: "updated",
        notebookId: n.id,
        title: n.title,
        icon: n.icon || "📝",
        timestamp: n.updatedAt,
        label: "Edited",
      });
    }
  });

  events.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  const grouped: { date: string; events: ActivityEvent[] }[] = [];
  events.slice(0, 50).forEach((ev) => {
    const d = formatDate(new Date(ev.timestamp));
    const last = grouped[grouped.length - 1];
    if (last && last.date === d) {
      last.events.push(ev);
    } else {
      grouped.push({ date: d, events: [ev] });
    }
  });

  // Recent notebooks (updated)
  const recentUpdated = [...notebooks]
    .sort(
      (a, b) =>
        new Date(b.updatedAt ?? 0).getTime() -
        new Date(a.updatedAt ?? 0).getTime(),
    )
    .slice(0, 6);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Activity</h1>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <div className="h-4 w-20 bg-muted rounded animate-pulse" />
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
        <div className="h-64 bg-muted/20 rounded-xl animate-pulse" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-56 bg-muted/20 rounded-xl animate-pulse" />
          <div className="h-56 bg-muted/20 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Activity</h1>

      {/* ── Stats row ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Notebooks"
          value={String(notebooks.length)}
          icon={Notebook}
          color="text-blue-600"
          bg="bg-blue-50"
        />
        <StatCard
          label="Created This Week"
          value={String(createdThisWeek)}
          icon={Plus}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          label="Edited This Week"
          value={String(editedThisWeek)}
          icon={FileEdit}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          label="Created This Month"
          value={String(createdThisMonth)}
          icon={Calendar}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      {/* ── Content stats + streak row ────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Characters"
          value={totalContentChars.toLocaleString()}
          icon={BarChart3}
          color="text-rose-600"
          bg="bg-rose-50"
        />
        <StatCard
          label="Avg Notebook Length"
          value={`${avgContentLen.toLocaleString()} chars`}
          icon={Target}
          color="text-cyan-600"
          bg="bg-cyan-50"
        />
        <StatCard
          label="Current Streak"
          value={`${currentStreak} day${currentStreak !== 1 ? "s" : ""}`}
          icon={Zap}
          color="text-orange-600"
          bg="bg-orange-50"
        />
        <StatCard
          label="Most Active Day"
          value={mostActiveDay}
          icon={Activity}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
      </div>

      {/* ── Charts row ────────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Daily created — bar chart */}
        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            Daily Activity (Last 7 Days)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7Days} barGap={2}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="Created"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="Edited"
                fill="hsl(var(--chart-2, 215 80% 55%))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Cumulative growth — area chart */}
        <section className="rounded-xl border p-4">
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="size-4 text-muted-foreground" />
            Notebook Growth (Last 30 Days)
          </h2>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={last30Days}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="hsl(var(--muted-foreground))"
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="Total"
                stroke="hsl(var(--primary))"
                fill="hsl(var(--primary) / 0.15)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </section>
      </div>

      {/* ── Timeline + Recent updates ─────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Activity timeline */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="size-4" />
            Recent Activity
          </h2>

          {grouped.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
              {grouped.map((group) => (
                <div key={group.date}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                    {group.date}
                  </p>
                  <div className="space-y-2">
                    {group.events.map((ev, i) => (
                      <div
                        key={`${ev.notebookId}-${ev.type}-${i}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                      >
                        <span className="text-base leading-none flex-shrink-0">
                          {ev.icon}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">
                            <span className="font-medium">{ev.title}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ev.label} — {relativeTime(ev.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recently updated notebooks */}
        <section>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="size-4" />
            Recently Updated
          </h2>

          {recentUpdated.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notebooks yet.</p>
          ) : (
            <div className="space-y-2">
              {recentUpdated.map((nb) => (
                <div
                  key={nb.id}
                  className="flex items-center gap-3 px-3 py-3 rounded-xl border hover:shadow-sm transition-shadow"
                >
                  <span className="text-lg leading-none flex-shrink-0">
                    {nb.icon || "📝"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{nb.title}</p>
                    {nb.subtitle && (
                      <p className="text-xs text-muted-foreground truncate">
                        {nb.subtitle}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/60">
                      Updated {relativeTime(nb.updatedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Longest notebook */}
          {notebooks.length > 0 && (
            <div className="mt-6 rounded-xl border border-dashed p-4">
              <p className="text-xs text-muted-foreground mb-1">
                📏 Longest title
              </p>
              <p className="text-sm font-medium truncate">{longestTitle}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
