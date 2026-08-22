import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logo from "@/assets/mzansitalk-logo.png";
import { supabase } from "@/integrations/supabase/client";

/** Tracks the session so the header can always show the right buttons. */
export function useSessionState() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(Boolean(session));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return signedIn;
}

export function SiteHeader() {
  const signedIn = useSessionState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/login", replace: true });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <img src={logo} alt="MzansiTalk logo" width={32} height={32} className="rounded-md" />
          <span className="font-display text-lg font-extrabold tracking-tight">
            Mzansi<span className="text-gold">Talk</span>
          </span>
        </Link>

        <nav className="mx-auto hidden items-center gap-5 text-sm font-semibold text-muted-foreground sm:flex">
          <Link to="/" activeProps={{ className: "text-foreground" }}>
            Home
          </Link>
          <Link to="/about" activeProps={{ className: "text-foreground" }}>
            About
          </Link>
          <Link to="/contact" activeProps={{ className: "text-foreground" }}>
            Contact
          </Link>
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {signedIn ? (
            <>
              <Link to="/profile" className="btn-base btn-primary px-3 py-2 text-sm">
                <User className="size-4" /> Profile
              </Link>
              <button
                type="button"
                onClick={() => void signOut()}
                className="btn-base border border-border bg-secondary px-3 py-2 text-sm text-secondary-foreground"
              >
                <LogOut className="size-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="btn-base border border-border bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground"
              >
                Login
              </Link>
              <Link to="/register" className="btn-base btn-gold px-3 py-2 text-sm font-bold">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>

      <nav className="flex items-center justify-center gap-5 border-t border-border px-4 py-2 text-sm font-semibold text-muted-foreground sm:hidden">
        <Link to="/" activeProps={{ className: "text-foreground" }}>
          Home
        </Link>
        <Link to="/about" activeProps={{ className: "text-foreground" }}>
          About
        </Link>
        <Link to="/contact" activeProps={{ className: "text-foreground" }}>
          Contact
        </Link>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-card/40">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} MzansiTalk. All rights reserved.</p>
        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link to="/about" className="hover:text-foreground">
            About
          </Link>
          <Link to="/privacy" className="hover:text-foreground">
            Privacy
          </Link>
          <Link to="/terms" className="hover:text-foreground">
            Terms
          </Link>
          <Link to="/contact" className="hover:text-foreground">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}

/** Public page frame: header with Login/Sign Up, content, footer with the 4 legal pages. */
export function PublicPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

/** Simple article shell used by About / Privacy / Terms. */
export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 rounded-2xl border border-border bg-card p-5">
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
