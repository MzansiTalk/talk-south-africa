import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShieldAlert, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Screen, useIsAdmin } from "@/components/Shell";
import {
  createAdmin,
  listAdmins,
  promoteToAdmin,
  removeAdmin,
  setAdminApproved,
} from "@/lib/admin.functions";
import { getMyEmail, OWNER_EMAIL } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/admin/management")({
  head: () => ({
    meta: [
      { title: "Admin Management — MzansiTalk" },
      {
        name: "description",
        content:
          "Owner-only MzansiTalk admin management: create admin accounts, approve or pause access and remove admins.",
      },
      { property: "og:title", content: "Admin Management — MzansiTalk" },
      { property: "og:description", content: "Create, approve and remove MzansiTalk admins." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminManagementPage,
});

function AdminManagementPage() {
  const queryClient = useQueryClient();
  const email = useQuery({ queryKey: ["my-email"], queryFn: getMyEmail });
  const isOwner = email.data?.toLowerCase() === OWNER_EMAIL;

  const fetchAdmins = useServerFn(listAdmins);
  const admins = useQuery({ queryKey: ["admins"], queryFn: () => fetchAdmins(), enabled: isOwner });

  const create = useServerFn(createAdmin);
  const approve = useServerFn(setAdminApproved);
  const drop = useServerFn(removeAdmin);

  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["admins"] });

  const addAdmin = useMutation({
    mutationFn: (input: { email: string; password: string }) => create({ data: input }),
    onSuccess: (result) => {
      toast.success(`Admin created for ${result.email}. Send them the email and password.`);
      setNewEmail("");
      setNewPassword("");
      setShowForm(false);
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleApproved = useMutation({
    mutationFn: (input: { userId: string; approved: boolean }) => approve({ data: input }),
    onSuccess: () => {
      toast.success("Admin access updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeOne = useMutation({
    mutationFn: (input: { userId: string }) => drop({ data: input }),
    onSuccess: () => {
      toast.success("Admin removed. They are now a normal member.");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (email.isLoading) {
    return (
      <Screen title="Admin Management">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </Screen>
    );
  }

  if (!isOwner) {
    return (
      <Screen title="Admin Management">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied. Owner Only.</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Admin Management">
      <div className="rounded-2xl border border-destructive bg-destructive/10 p-3 text-xs font-bold uppercase tracking-wide text-destructive">
        Warning: Owner only. These settings control who can moderate MzansiTalk.
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold">Admins</h2>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            className="btn-base btn-primary px-3 py-1.5 text-xs"
          >
            <UserPlus className="size-3.5" /> Add Admin
          </button>
        </div>

        {showForm ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              addAdmin.mutate({ email: newEmail, password: newPassword });
            }}
          >
            <input
              className="field field-focus"
              type="email"
              placeholder="Admin email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              required
              maxLength={255}
            />
            <input
              className="field field-focus"
              type="text"
              placeholder="Admin password (min 8 characters)"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={8}
              maxLength={72}
            />
            <button
              type="submit"
              disabled={addAdmin.isPending}
              className="btn-base btn-gold w-full"
            >
              {addAdmin.isPending ? "Creating…" : "Create Admin"}
            </button>
            <p className="text-xs text-muted-foreground">
              You will need to send this email and password to the person yourself.
            </p>
          </form>
        ) : null}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-2 font-semibold">Email</th>
                <th className="py-2 pr-2 font-semibold">Role</th>
                <th className="py-2 pr-2 font-semibold">Status</th>
                <th className="py-2 pr-2 font-semibold">Date Added</th>
                <th className="py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(admins.data ?? []).map((row) => {
                const isSelf = row.email.toLowerCase() === OWNER_EMAIL;
                return (
                  <tr key={`${row.userId}-${row.role}`} className="border-t border-border">
                    <td className="max-w-[9rem] truncate py-2 pr-2">{row.email}</td>
                    <td className="py-2 pr-2 capitalize">{row.role}</td>
                    <td className="py-2 pr-2">
                      {row.role === "owner"
                        ? "Approved"
                        : row.approved
                          ? "Approved"
                          : "Waiting for Owner Approval"}
                    </td>
                    <td className="py-2 pr-2">
                      {new Date(row.createdAt).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="py-2">
                      {isSelf || row.role === "owner" ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        <span className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              toggleApproved.mutate({
                                userId: row.userId,
                                approved: !row.approved,
                              })
                            }
                            className="btn-base bg-secondary px-2 py-1 text-[0.7rem] text-secondary-foreground"
                          >
                            {row.approved ? "Turn Off" : "Turn On"}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeOne.mutate({ userId: row.userId })}
                            className="btn-base bg-destructive px-2 py-1 text-[0.7rem] text-destructive-foreground"
                          >
                            Remove
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(admins.data ?? []).length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-4 text-muted-foreground">
                    No admins yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </Screen>
  );
}
