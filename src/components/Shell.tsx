import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  Film,
  Home,
  MessageCircle,
  Moon,
  PlusCircle,
  Search,
  Shield,
  Sun,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import logo from "@/assets/mzansitalk-logo.png";
import { fetchMyRoles } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export function useIsAdmin() {
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: fetchMyRoles });
  const list = roles ?? [];
  return {
    isAdmin: list.includes("admin") || list.includes("owner"),
    isOwner: list.includes("owner"),
  };
}

export function TopBar({
  title,
  showSearch = false,
}: {
  title?: string | undefined;
  showSearch?: boolean | undefined;
}) {
  const router = useRouter();
  const { theme, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-3">
        <button
          type="button"
          onClick={() => router.history.back()}
          aria-label="Go back"
          className="btn-base -ml-2 bg-transparent px-2 text-muted-foreground"
        >
          <ChevronLeft className="size-5" />
        </button>

        {title ? (
          <h1 className="truncate text-base font-semibold">{title}</h1>
        ) : (
          <Link to="/home" className="flex items-center gap-2">
            <img src={logo} alt="MzansiTalk" width={28} height={28} className="rounded-md" />
            <span className="font-display text-lg font-bold tracking-tight">
              Mzansi<span className="text-gold">Talk</span>
            </span>
          </Link>
        )}

        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
          <Link
            to="/chat"
            aria-label="Chats"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            <MessageCircle className="size-5" />
          </Link>
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            <Bell className="size-5" />
          </Link>
        </div>
      </div>

      {showSearch ? (
        <div className="mx-auto w-full max-w-2xl px-3 pb-3">
          <Link
            to="/search"
            className="field field-focus flex items-center gap-2 text-muted-foreground"
          >
            <Search className="size-4" />
            Search users, posts, reels and photos
          </Link>
        </div>
      ) : null}
    </header>
  );
}

export function BottomNav() {
  const { isAdmin } = useIsAdmin();

  const items = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/reels", label: "Reels", icon: Film },
    { to: "/create", label: "Create", icon: PlusCircle },
    { to: "/status", label: "Status", icon: Search },
    { to: "/profile", label: "Profile", icon: User },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield }] : []),
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-2 py-1.5">
        {items.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.68rem] font-medium text-muted-foreground"
            activeProps={{ className: "text-primary" }}
          >
            <Icon className="size-5" />
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function Screen({
  children,
  title,
  showSearch,
}: {
  children: ReactNode;
  title?: string | undefined;
  showSearch?: boolean | undefined;
}) {
  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBar title={title} showSearch={showSearch} />
      <main className="mx-auto w-full max-w-2xl px-3 py-4">{children}</main>
      <BottomNav />
    </div>
  );
}
