import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BadgeCheck, Copy, Sparkles, Wallet } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { fetchMyProfile } from "@/lib/api";
import {
  CREATOR_INVITE_TARGET,
  CREATOR_SHARE,
  CREATOR_VIEW_TARGET,
  PLATFORM_SHARE,
  fetchCreatorProgress,
  fetchMyCreatorApplication,
  fetchMyPayouts,
  referralLink,
  requestPayout,
  submitCreatorApplication,
} from "@/lib/creators";

export const Route = createFileRoute("/_authenticated/creator-program")({
  head: () => ({
    meta: [
      { title: "Creator Program — MzansiTalk" },
      {
        name: "description",
        content:
          "Apply to the MzansiTalk Creator Program, track your video views and invites, and request a payout with an 80/20 split.",
      },
      { property: "og:title", content: "Creator Program — MzansiTalk" },
      {
        property: "og:description",
        content: "Earn from your reels on MzansiTalk. 20% to you, 80% to MzansiTalk.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CreatorProgramPage,
});

function Progress({ value, target, label }: { value: number; target: number; label: string }) {
  const percent = Math.min(100, Math.round((value / target) * 100));
  return (
    <div className="mt-3">
      <p className="flex items-center justify-between text-xs font-semibold">
        <span>{label}</span>
        <span className="text-muted-foreground">
          {value.toLocaleString()}/{target.toLocaleString()}
        </span>
      </p>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function CreatorProgramPage() {
  const queryClient = useQueryClient();
  const me = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const progress = useQuery({ queryKey: ["creator-progress"], queryFn: fetchCreatorProgress });
  const application = useQuery({
    queryKey: ["creator-application"],
    queryFn: fetchMyCreatorApplication,
  });
  const payouts = useQuery({ queryKey: ["my-payouts"], queryFn: fetchMyPayouts });

  const [form, setForm] = useState({
    full_name: "",
    bank_name: "",
    account_number: "",
    id_number: "",
    phone: "",
  });

  const apply = useMutation({
    mutationFn: () =>
      submitCreatorApplication({
        full_name: form.full_name.trim(),
        bank_name: form.bank_name.trim(),
        account_number: form.account_number.trim(),
        id_number: form.id_number.trim(),
        phone: form.phone.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["creator-application"] });
      toast.success("Application sent to MzansiTalk. We will let you know.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const payout = useMutation({
    mutationFn: () => requestPayout(Number((progress.data?.earnings ?? 0).toFixed(2))),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-payouts"] });
      toast.success("Payout requested. The Owner will review it.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const link = me.data ? referralLink(me.data.username) : "";
  const earnings = progress.data?.earnings ?? 0;
  const status = application.data?.status;

  return (
    <Screen title="Creator Program">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-gold" /> Your Progress
        </h2>
        <Progress
          value={progress.data?.views ?? 0}
          target={CREATOR_VIEW_TARGET}
          label="Video views"
        />
        <Progress
          value={progress.data?.invites ?? 0}
          target={CREATOR_INVITE_TARGET}
          label="Invite referrals"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          You need {CREATOR_VIEW_TARGET.toLocaleString()} video views and {CREATOR_INVITE_TARGET}{" "}
          invite referrals to qualify.
        </p>
        {progress.data?.qualified ? (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-gold">
            <BadgeCheck className="size-4" /> You qualify for the Creator Program
          </p>
        ) : null}
      </section>


      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Your Invite Link</h2>
        <p className="mt-1 break-all rounded-xl bg-secondary p-3 text-sm">{link}</p>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(`https://${link}`);
            toast.success("Invite link copied");
          }}
          className="btn-base mt-2 bg-secondary text-secondary-foreground"
        >
          <Copy className="size-4" /> Copy Link
        </button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Application</h2>
        {status ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Status: <span className="font-bold capitalize text-foreground">{status}</span>. You can
            update your details below at any time.
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Fill this in so MzansiTalk can pay you.
          </p>
        )}

        <form
          className="mt-3 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            apply.mutate();
          }}
        >
          <input
            className="field field-focus"
            placeholder="Full Name"
            required
            maxLength={80}
            value={form.full_name}
            onChange={(event) => setForm({ ...form, full_name: event.target.value })}
          />
          <input
            className="field field-focus"
            placeholder="Bank Name"
            required
            maxLength={60}
            value={form.bank_name}
            onChange={(event) => setForm({ ...form, bank_name: event.target.value })}
          />
          <input
            className="field field-focus"
            placeholder="Account Number"
            required
            maxLength={30}
            value={form.account_number}
            onChange={(event) => setForm({ ...form, account_number: event.target.value })}
          />
          <input
            className="field field-focus"
            placeholder="ID Number"
            required
            maxLength={20}
            value={form.id_number}
            onChange={(event) => setForm({ ...form, id_number: event.target.value })}
          />
          <input
            className="field field-focus"
            placeholder="Phone"
            required
            maxLength={20}
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
          />
          <button type="submit" disabled={apply.isPending} className="btn-base btn-primary w-full">
            {status ? "Update Application" : "Apply to Creator Program"}
          </button>
        </form>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-bold">
          <Wallet className="size-4 text-gold" /> Earnings
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-xl bg-secondary p-3">
            <p className="text-xs text-muted-foreground">Your share (20%)</p>
            <p className="text-lg font-extrabold">R{(earnings * CREATOR_SHARE).toFixed(2)}</p>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <p className="text-xs text-muted-foreground">MzansiTalk (80%)</p>
            <p className="text-lg font-extrabold">R{(earnings * PLATFORM_SHARE).toFixed(2)}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => payout.mutate()}
          disabled={payout.isPending}
          className="btn-base btn-gold mt-3 w-full"
        >
          Request Payout
        </button>

        <ul className="mt-3 space-y-2">
          {(payouts.data ?? []).map((row) => (
            <li key={row.id} className="rounded-xl bg-secondary/60 p-3 text-xs">
              R{Number(row.creator_share).toFixed(2)} ·{" "}
              <span className="font-bold capitalize">{row.status}</span>
              <span className="block text-muted-foreground">
                {new Date(row.created_at).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </Screen>
  );
}
