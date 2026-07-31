import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ImagePlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Screen } from "@/components/Shell";
import { createContent, type ContentKind } from "@/lib/api";

const DRAFT_KEY = "mzansitalk-draft";

export const Route = createFileRoute("/_authenticated/create")({
  head: () => ({
    meta: [
      { title: "Create — MzansiTalk" },
      {
        name: "description",
        content: "Create a MzansiTalk post, reel or 24 hour status with a photo or video.",
      },
      { property: "og:title", content: "Create — MzansiTalk" },
      { property: "og:description", content: "Post, reel or status — share it with all of Mzansi." },
    ],
  }),
  component: CreatePage,
});

function CreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ContentKind>("post");
  const [caption, setCaption] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    const draft = localStorage.getItem(DRAFT_KEY);
    if (draft) {
      const parsed = JSON.parse(draft) as { kind: ContentKind; caption: string };
      setKind(parsed.kind);
      setCaption(parsed.caption);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify({ kind, caption }));
  }, [kind, caption]);

  const publish = useMutation({
    mutationFn: () => createContent({ kind, caption: caption.trim(), file }),
    onSuccess: () => {
      localStorage.removeItem(DRAFT_KEY);
      void queryClient.invalidateQueries({ queryKey: ["feed"] });
      toast.success(
        kind === "status" ? "Status posted — it disappears in 24 hours" : "Posted to MzansiTalk",
      );
      void navigate({ to: kind === "reel" ? "/reels" : kind === "status" ? "/status" : "/home" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Screen title="Create">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-muted p-1">
        {(["post", "reel", "status"] as const).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={`btn-base py-2 text-sm capitalize ${
              kind === value ? "btn-primary" : "bg-transparent text-muted-foreground"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <label className="mt-4 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <ImagePlus className="size-7 text-primary" />
        <span className="text-sm font-semibold">Add a photo or video</span>
        <span className="text-xs text-muted-foreground">
          {kind === "reel" ? "Reels work best between 15 and 60 seconds" : "Optional for text posts"}
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(event) => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected);
            setPreview(selected ? URL.createObjectURL(selected) : null);
          }}
        />
      </label>

      {preview ? (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border">
          {file?.type.startsWith("video") ? (
            <video src={preview} className="w-full" controls playsInline />
          ) : (
            <img src={preview} alt="Draft preview" className="w-full" />
          )}
        </div>
      ) : null}

      <textarea
        className="field field-focus mt-3 min-h-28"
        placeholder="Write a caption…"
        value={caption}
        onChange={(event) => setCaption(event.target.value)}
        maxLength={2000}
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => toast.success("Draft saved on this device")}
          className="btn-base flex-1 bg-secondary text-secondary-foreground"
        >
          Save Draft
        </button>
        <button
          type="button"
          disabled={publish.isPending || (!caption.trim() && !file)}
          onClick={() => publish.mutate()}
          className="btn-base btn-gold flex-1"
        >
          {publish.isPending ? "Posting…" : "Post"}
        </button>
      </div>
    </Screen>
  );
}
