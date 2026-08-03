import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  postId: z.string().uuid(),
  mediaUrl: z.string().url(),
  mediaType: z.enum(["image", "video"]),
});

export type AiModerationResult = {
  aiScore: number;
  aiFlags: string[];
  status: "approved" | "removed";
  monetization: "eligible" | "blocked";
  appealId: string | null;
  error?: string;
};

/**
 * Scores an upload with Google Cloud Vision / Video Intelligence and applies the
 * verdict: score < 50 approves + keeps monetization, score >= 50 removes the
 * post, blocks monetization and opens a pending appeal automatically.
 */
export const moderateUpload = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<AiModerationResult> => {
    const apiKey = process.env["GOOGLE_CLOUD_API_KEY"];
    const { scoreImage, scoreVideo } = await import("@/lib/ai-moderation.server");

    let score = 0;
    let flags: string[] = [];
    let failure: string | undefined;

    if (!apiKey) {
      failure = "AI moderation is not configured yet — this upload was left for human review.";
    } else {
      try {
        const verdict =
          data.mediaType === "video"
            ? await scoreVideo(data.mediaUrl, apiKey)
            : await scoreImage(data.mediaUrl, apiKey);
        score = verdict.score;
        flags = verdict.flags;
      } catch (error) {
        console.error("AI moderation failed", error);
        failure = error instanceof Error ? error.message : "AI moderation failed";
        flags = ["scan_failed"];
      }
    }

    const { data: applied, error } = await context.supabase.rpc("apply_ai_moderation", {
      _post_id: data.postId,
      _score: score,
      _flags: flags,
    });
    if (error) throw new Error(error.message);

    const row = (applied ?? {}) as {
      ai_score?: number;
      status?: "approved" | "removed";
      monetization?: "eligible" | "blocked";
      appeal_id?: string | null;
    };

    return {
      aiScore: row.ai_score ?? score,
      aiFlags: flags,
      status: row.status ?? "approved",
      monetization: row.monetization ?? "eligible",
      appealId: row.appeal_id ?? null,
      ...(failure ? { error: failure } : {}),
    };
  });
