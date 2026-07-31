import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Screen, useIsAdmin } from "@/components/Shell";
import { deletePost } from "@/lib/api";
import { fetchReports, setReportStatus } from "@/lib/moderation";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports Inbox — MzansiTalk Admin" },
      {
        name: "description",
        content: "Review member reports about posts, reels and people on MzansiTalk.",
      },
      { property: "og:title", content: "Reports Inbox — MzansiTalk Admin" },
      { property: "og:description", content: "Member reports for the MzansiTalk team." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReportsInbox,
});

function ReportsInbox() {
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();
  const reports = useQuery({ queryKey: ["reports"], queryFn: fetchReports, enabled: isAdmin });

  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["reports"] });

  const review = useMutation({
    mutationFn: (input: { id: string; status: "actioned" | "dismissed" }) =>
      setReportStatus(input.id, input.status),
    onSuccess: () => {
      toast.success("Report updated");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeContent = useMutation({
    mutationFn: (input: { postId: string; ownerId: string; reportId: string }) =>
      deletePost(input.postId, input.ownerId).then(() =>
        setReportStatus(input.reportId, "actioned"),
      ),
    onSuccess: () => {
      toast.success("Content deleted and report closed");
      refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!isAdmin) {
    return (
      <Screen title="Reports Inbox">
        <div className="rounded-2xl border border-destructive bg-destructive/10 p-8 text-center">
          <ShieldAlert className="mx-auto size-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-bold">Access Denied</h2>
        </div>
      </Screen>
    );
  }

  return (
    <Screen title="Reports Inbox">
      <ul className="space-y-2">
        {(reports.data ?? []).map((report) => (
          <li key={report.id} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold">{report.reason}</p>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[0.65rem] font-bold uppercase">
                {report.status}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              From @{report.reporter?.username ?? "member"}
              {report.reported ? ` · about @${report.reported.username}` : ""} ·{" "}
              {new Date(report.created_at).toLocaleString("en-ZA")}
            </p>
            {report.details ? <p className="mt-2 text-sm">{report.details}</p> : null}
            {report.post ? (
              <p className="mt-2 rounded-xl bg-secondary/60 p-2 text-xs">
                {report.post.kind}: {report.post.caption || "(no caption)"}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {report.post ? (
                <button
                  type="button"
                  onClick={() =>
                    removeContent.mutate({
                      postId: report.post!.id,
                      ownerId: report.post!.user_id,
                      reportId: report.id,
                    })
                  }
                  className="btn-base bg-destructive px-3 py-1.5 text-xs text-destructive-foreground"
                >
                  <Trash2 className="size-3.5" /> Delete Content
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => review.mutate({ id: report.id, status: "actioned" })}
                className="btn-base bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
              >
                Mark Actioned
              </button>
              <button
                type="button"
                onClick={() => review.mutate({ id: report.id, status: "dismissed" })}
                className="btn-base bg-secondary px-3 py-1.5 text-xs text-secondary-foreground"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
        {(reports.data ?? []).length === 0 ? (
          <li className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No reports yet.
          </li>
        ) : null}
      </ul>
    </Screen>
  );
}
