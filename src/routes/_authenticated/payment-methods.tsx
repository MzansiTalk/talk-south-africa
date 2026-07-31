import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CreditCard, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { paymentsReady } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/payment-methods")({
  head: () => ({
    meta: [
      { title: "Payment Methods — MzansiTalk" },
      {
        name: "description",
        content:
          "Add or remove the card you use to pay for MzansiTalk boosts. Cards are handled securely by Paystack.",
      },
      { property: "og:title", content: "Payment Methods — MzansiTalk" },
      { property: "og:description", content: "Manage the cards you use for MzansiTalk boosts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PaymentMethods,
});

type Card = { id: string; brand: string; last4: string };

function PaymentMethods() {
  const ready = useQuery({ queryKey: ["payments-ready"], queryFn: paymentsReady });
  const [cards, setCards] = useState<Card[]>([]);
  const [adding, setAdding] = useState(false);
  const [number, setNumber] = useState("");

  const add = useMutation({
    mutationFn: async () => {
      const digits = number.replace(/\D/g, "");
      if (digits.length < 12) throw new Error("Enter a valid card number");
      return digits.slice(-4);
    },
    onSuccess: (last4) => {
      setCards((list) => [...list, { id: crypto.randomUUID(), brand: "Card", last4 }]);
      setNumber("");
      setAdding(false);
      toast.success("Card saved for boosts");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (ready.data === false) {
    return (
      <Screen title="Payment Methods">
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <CreditCard className="mx-auto size-8 text-gold" />
          <h2 className="mt-3 font-display text-lg font-bold">Payments not connected</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The Owner has not added Paystack keys yet, so cards cannot be saved.
          </p>
          <Link to="/admin/payment-settings" className="btn-base btn-primary mt-4">
            <Plus className="size-4" /> Add Payment Method
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Payment Methods">
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-sm font-bold">Saved Cards</h2>
        {cards.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No cards saved yet.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {cards.map((card) => (
              <li key={card.id} className="flex items-center gap-3 rounded-xl bg-secondary/60 p-3">
                <CreditCard className="size-4 text-gold" />
                <span className="text-sm font-semibold">
                  {card.brand} •••• {card.last4}
                </span>
                <button
                  type="button"
                  onClick={() => setCards((list) => list.filter((row) => row.id !== card.id))}
                  className="btn-base ml-auto bg-destructive px-2 py-1.5 text-destructive-foreground"
                  aria-label="Remove card"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {adding ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              add.mutate();
            }}
          >
            <input
              className="field field-focus"
              placeholder="Card number"
              inputMode="numeric"
              maxLength={19}
              value={number}
              onChange={(event) => setNumber(event.target.value)}
            />
            <div className="flex gap-2">
              <button type="submit" className="btn-base btn-primary">
                Save Card
              </button>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="btn-base bg-secondary text-secondary-foreground"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="btn-base btn-primary mt-3">
            <Plus className="size-4" /> Add Payment Method
          </button>
        )}
      </section>
    </Screen>
  );
}
