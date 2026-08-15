"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const getLinkClassName = (href: string) => {
    const isActive = pathname === href;
    return `text-sm transition-colors ${isActive ? "text-primary font-medium" : "text-muted-foreground hover:text-foreground"}`;
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-semibold tracking-tight">
              WorkSpace
            </span>
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/auth/login"
              className={getLinkClassName("/auth/login")}
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className={getLinkClassName("/auth/sign-up")}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>
      <main className="flex-1 container mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
