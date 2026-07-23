import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <nav className="border-b">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="text-lg font-semibold tracking-tight">WorkSpace</span>
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* ─── Hero ───────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h1 className="text-5xl sm:text-6xl font-light tracking-tight leading-tight">
          your thoughts,
          <br />
          uncluttered.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto">
          A fast, beautiful notebook that gets out of your way.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <a
            href="/auth/sign-up"
            className="inline-flex h-10 items-center justify-center rounded-lg bg-amber-500 px-6 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Start Writing
          </a>
          <a
            href="#features"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-6 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            See Features
          </a>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid gap-6 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Notebooks Created", value: "1,000+" },
            { label: "Tasks Checked", value: "5,000+" },
            { label: "Words Written", value: "250K+" },
            { label: "Active Users", value: "500+" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl border p-5 text-center"
            >
              <p className="text-3xl font-light text-amber-500">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Showcase ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-light text-center mb-10">
          See it in action
        </h2>
        <div className="rounded-xl border shadow-sm overflow-hidden bg-card">
          <img
            src="/activity.png"
            alt="WorkSpace activity dashboard screenshot"
            className="w-full h-auto"
          />
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────── */}
      <section
        id="features"
        className="max-w-4xl mx-auto px-6 pb-24"
      >
        <h2 className="text-2xl font-light text-center mb-12">
          Everything you need, nothing you don&apos;t
        </h2>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: "📝",
              title: "Markdown",
              desc: "Write in markdown, see it live with instant preview.",
            },
            {
              icon: "💾",
              title: "Auto-Save",
              desc: "Every change saved instantly — never lose a thought.",
            },
            {
              icon: "🌙",
              title: "Dark Mode",
              desc: "Easy on the eyes, day or night. Flips with one click.",
            },
            {
              icon: "✅",
              title: "Task Lists",
              desc: "Checkboxes in your notes. Track todos across notebooks.",
            },
            {
              icon: "🔍",
              title: "Full-Text Search",
              desc: "Find any note instantly — title, content, and more.",
            },
            {
              icon: "📊",
              title: "Activity Dashboard",
              desc: "See your writing streaks, stats, and notebook activity.",
            },
          ].map((f) => (
            <div key={f.title} className="text-center p-4 rounded-xl border hover:shadow-sm transition-shadow">
              <span className="text-3xl block mb-3">{f.icon}</span>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <h2 className="text-2xl font-light text-center mb-12">
          Loved by writers who think different
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border p-6 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              &ldquo;Finally a note-taking app that stays out of my way. No folders,
              no tags, just me and my thoughts.&rdquo;
            </p>
            <div>
              <p className="text-sm font-medium">Alex R.</p>
              <p className="text-xs text-muted-foreground">Writer &amp; Designer</p>
            </div>
          </div>
          <div className="rounded-xl border p-6 space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed italic">
              &ldquo;The todo+notes combo is genius. I keep everything in one
              place without switching apps.&rdquo;
            </p>
            <div>
              <p className="text-sm font-medium">Sam K.</p>
              <p className="text-xs text-muted-foreground">Software Developer</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Bottom CTA ─────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-light mb-4">Ready to write?</h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Start your first notebook in seconds. No credit card. No clutter.
        </p>
        <a
          href="/auth/sign-up"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-500 px-8 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
        >
          Start Writing &rarr;
        </a>
      </section>

      {/* ─── Footer ─────────────────────────────────────────── */}
      <footer className="border-t mt-auto">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} WorkSpace
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/auth/login" className="hover:text-foreground transition-colors">Sign In</Link>
            <Link href="/auth/sign-up" className="hover:text-foreground transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
