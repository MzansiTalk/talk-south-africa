import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  Film,
  Home,
  MessageCircle,
  Radio,
  Search,
  Shield,
  Users,
} from "lucide-react";
import { useEffect, type ReactNode } from "react";

import logo from "@/assets/mzansitalk-logo.png";
import { fetchMyRoles, fetchUnreadNotificationCount } from "@/lib/api";
import { touchPresence } from "@/lib/creators";

export function useIsAdmin() {
  const { data: roles } = useQuery({ queryKey: ["my-roles"], queryFn: fetchMyRoles });
  const list = roles ?? [];
  return {
    isAdmin: list.includes("admin") || list.includes("owner"),
    isOwner: list.includes("owner"),
  };
}

/** Keeps the member's "Online" status fresh while the app is open. */
function usePresenceHeartbeat() {
  useEffect(() => {
    void touchPresence();
    const timer = window.setInterval(() => {
      void touchPresence();
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
}


export function TopBar({
  title,
  showSearch = false,
}: {
  title?: string | undefined;
  showSearch?: boolean | undefined;
}) {
  const router = useRouter();
  const unread = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 45_000,
  });

  const unseen = unread.data ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center gap-2 px-3">
        {title ? (
          <>
            <button
              type="button"
              onClick={() => router.history.back()}
              aria-label="Go back"
              className="btn-base -ml-2 bg-transparent px-2 text-muted-foreground"
            >
              <ChevronLeft className="size-5" />
            </button>
            <h1 className="truncate text-base font-semibold">{title}</h1>
          </>
        ) : (
          <Link to="/home" className="flex min-w-0 items-center gap-2">
            <img src={logo} alt="MzansiTalk" width={30} height={30} className="rounded-md" />
            <span className="font-display text-xl font-bold tracking-tight">
              Mzansi<span className="text-gold">Talk</span>
            </span>
          </Link>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <Link
            to="/friends"
            aria-label="Find friends"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            <Users className="size-5" />
          </Link>
          <Link
            to="/search"
            aria-label="Search"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            <Search className="size-5" />
          </Link>
          <Link
            to="/notifications"
            aria-label={`Notifications${unseen > 0 ? `, ${unseen} unseen` : ""}`}
            className="btn-base relative bg-transparent px-2 text-muted-foreground"
          >
            <Bell className="size-5" />
            {unseen > 0 ? (
              <span className="absolute right-0 top-0 min-w-4 rounded-full bg-destructive px-1 text-[0.6rem] font-bold leading-4 text-destructive-foreground">
                {unseen > 9 ? "9+" : unseen}
              </span>
            ) : null}
          </Link>
          <Link
            to="/profile"
            aria-label="My profile"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            <User className="size-5" />
          </Link>
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Log out"
            className="btn-base bg-transparent px-2 text-muted-foreground"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </div>

    </header>
  );
}

export function BottomNav() {
  const { isAdmin } = useIsAdmin();
  usePresenceHeartbeat();

  const items = [
    { to: "/home", label: "Home", icon: Home, live: false },
    { to: "/reels", label: "Reels", icon: Film, live: false },
    { to: "/chat", label: "Messages", icon: MessageCircle, live: false },
    { to: "/live", label: "Go Live", icon: Radio, live: true },
    ...(isAdmin ? [{ to: "/admin", label: "Admin", icon: Shield, live: false }] : []),
  ] as const;


  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-2xl items-stretch justify-between px-2 py-1.5">
        {items.map(({ to, label, icon: Icon, live }) => (
          <Link
            key={to}
            to={to}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[0.68rem] font-medium ${
              live ? "text-destructive" : "text-muted-foreground"
            }`}
            activeProps={{ className: live ? "text-destructive" : "text-primary" }}
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
