import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  Coins,
  CreditCard,
  Crown,
  LifeBuoy,
  LogOut,
  Moon,
  RotateCcw,
  ScrollText,
  ShieldCheck,
  ShieldOff,
  Sparkles,
  Sun,
} from "lucide-react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBlockedUsers,
  fetchNotificationsEnabled,
  fetchTopBoosters,
  setBlock,
  setNotificationsEnabled,
} from "@/lib/api";
import { fetchEntitlements, restorePurchases } from "@/lib/billing";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MzansiTalk" },
      {
        name: "description",
        content:
          "Manage your MzansiTalk appearance, notifications, Creator Program, blocked users, support and log out.",
      },
      { property: "og:title", content: "Settings — MzansiTalk" },
      { property: "og:description", content: "Your MzansiTalk account settings." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { theme, toggle } = useTheme();

  const blocked = useQuery({ queryKey: ["blocked"], queryFn: fetchBlockedUsers });
  const boosters = useQuery({ queryKey: ["top-boosters"], queryFn: fetchTopBoosters });

  const notifications = useQuery({
    queryKey: ["notifications-enabled"],
    queryFn: fetchNotificationsEnabled,
  });

  const toggleNotifications = useMutation({
    mutationFn: (enabled: boolean) => setNotificationsEnabled(enabled),
    onSuccess: (_data, enabled) => {
      void queryClient.invalidateQueries({ queryKey: ["notifications-enabled"] });
      toast.success(enabled ? "Notifications turned on" : "Notifications turned off");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const unblock = useMutation({
    mutationFn: (id: string) => setBlock(id, false),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["blocked"] });
      toast.success("User unblocked");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const wallet = useQuery({ queryKey: ["entitlements"], queryFn: fetchEntitlements });

  /** Re-applies Google Play purchases (coins, Premium, Boost Live) on this device. */
  const restore = useMutation({
    mutationFn: restorePurchases,
    onSuccess: ({ restored, entitlements }) => {
      queryClient.setQueryData(["entitlements"], entitlements);
      toast.success(
        restored > 0
          ? `Restored ${restored} purchase${restored === 1 ? "" : "s"} from Google Play.`
          : "No purchases found on this Google Play account.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/", replace: true });
  };

  return (
    <Screen title="Settings">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Appearance</h2>
        <button
          type="button"
          onClick={toggle}
          className="btn-base mt-3 bg-secondary text-secondary-foreground"
        >
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          {theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Likes, comments, follows, boosts, new messages and payout updates.
        </p>
        <button
          type="button"
          onClick={() => toggleNotifications.mutate(!(notifications.data ?? true))}
          className="btn-base mt-3 bg-secondary text-secondary-foreground"
        >
          {notifications.data === false ? (
            <>
              <BellOff className="size-4" /> Notifications are OFF — Turn ON
            </>
          ) : (
            <>
              <Bell className="size-4" /> Notifications are ON — Turn OFF
            </>
          )}
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Affiliate Program</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your link and earn 40% on every Premium signup.
        </p>
        <Link to="/dashboard-affiliate" className="btn-base btn-gold mt-3">
          Open Affiliate Program
        </Link>
      </section>


      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Creator Program</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your views and invites, apply, and request payouts (20% you / 80% MzansiTalk).
        </p>
        <Link to="/creator-program" className="btn-base btn-gold mt-3">
          <Sparkles className="size-4" /> Open Creator Program
        </Link>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide">
          <Crown className="size-4 text-gold" /> Top Boosters This Week
        </h2>
        {(boosters.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">
            No boosts yet this week. Boost any post to appear on this leaderboard.
          </p>
        ) : (
          <ol className="mt-3 flex gap-4 overflow-x-auto no-scrollbar">
            {(boosters.data ?? []).map((row, index) => (
              <li
                key={row.profile?.id ?? index}
                className="flex w-16 shrink-0 flex-col items-center gap-1 text-center"
              >
                <Avatar path={row.profile?.avatar_url} name={row.profile?.name ?? "M"} size={48} />
                <span className="w-full truncate text-[0.68rem] font-semibold">
                  #{index + 1} @{row.profile?.username}
                </span>
                <span className="text-[0.62rem] text-gold">R{row.total.toFixed(0)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Blocked Users</h2>
        {(blocked.data ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">You have not blocked anyone.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(blocked.data ?? []).map((person) => (
              <li key={person.id} className="flex items-center gap-3">
                <Avatar path={person.avatar_url} name={person.name} size={32} />
                <span className="text-sm">@{person.username}</span>
                <button
                  type="button"
                  onClick={() => unblock.mutate(person.id)}
                  className="btn-base ml-auto bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
                >
                  <ShieldOff className="size-3.5" /> Unblock
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Purchases</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Boost Live, coin packs and Premium are digital items sold through Google Play Billing.
          {wallet.data?.premium_active
            ? " Premium is active — ads are off and your verified badge is on."
            : ` You have ${wallet.data?.coins ?? 0} coins.`}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/get-coins" className="btn-base btn-primary">
            <Coins className="size-4" /> Get Coins &amp; Premium
          </Link>
          <button
            type="button"
            disabled={restore.isPending}
            onClick={() => restore.mutate()}
            className="btn-base bg-secondary text-secondary-foreground disabled:opacity-60"
          >
            <RotateCcw className="size-4" />
            {restore.isPending ? "Restoring…" : "Restore Purchases"}
          </button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Advertiser payments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cards are only used for advertiser and sponsored-placement invoices, never for in-app
          digital items.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/payment-methods" className="btn-base bg-secondary text-secondary-foreground">
            <CreditCard className="size-4" /> Payment Methods
          </Link>
          <Link to="/my-boosts" className="btn-base bg-secondary text-secondary-foreground">
            My Boosts
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Help and Support</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Message MzansiTalk Support and the team replies inside the app.
        </p>
        <Link to="/support" className="btn-base btn-primary mt-3">
          <LifeBuoy className="size-4" /> Contact Support
        </Link>
        <Link to="/appeal" className="btn-base mt-2 bg-secondary text-secondary-foreground">
          Account Status &amp; Appeal a Ban
        </Link>
        <Link to="/privacy" className="btn-base mt-2 bg-secondary text-secondary-foreground">
          <ShieldCheck className="size-4" /> Privacy Policy
        </Link>
        <Link
          to="/guidelines"

          className="btn-base mt-2 bg-secondary text-secondary-foreground"
        >
          <ScrollText className="size-4" /> Community Guidelines
        </Link>
      </section>

      <button
        type="button"
        onClick={signOut}
        className="btn-base mt-4 w-full bg-destructive text-destructive-foreground"
      >
        <LogOut className="size-4" /> Log Out
      </button>
    </Screen>
  );
}
