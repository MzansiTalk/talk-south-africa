import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useParams } from "@tanstack/react-router";
import { ImagePlus, Mic, Send, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Avatar, SignedMedia, useMediaUrl } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import { supabase } from "@/integrations/supabase/client";
import { fetchConversation, fetchMessages, fetchMyProfile, sendMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — MzansiTalk" },
      {
        name: "description",
        content:
          "Chat on MzansiTalk with text, photos, videos, voice notes and shared posts and reels.",
      },
      { property: "og:title", content: "Conversation — MzansiTalk" },
      { property: "og:description", content: "Your MzansiTalk conversation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatThread,
});

function VoiceNote({ path }: { path: string }) {
  const { data: url } = useMediaUrl(path);
  if (!url) return <div className="h-10 w-48 animate-pulse rounded-full bg-muted" />;
  return <audio src={url} controls className="h-10 w-56" />;
}

function ChatThread() {
  const { id } = useParams({ from: "/_authenticated/chat/$id" });
  const queryClient = useQueryClient();
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const me = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const meta = useQuery({ queryKey: ["conversation", id], queryFn: () => fetchConversation(id) });
  const messages = useQuery({ queryKey: ["messages", id], queryFn: () => fetchMessages(id) });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["messages", id] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data?.length]);

  const send = useMutation({
    mutationFn: (input: { body?: string; file?: File; mediaType?: "image" | "video" | "voice" }) =>
      sendMessage({
        conversationId: id,
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.file ? { file: input.file } : {}),
        ...(input.mediaType ? { mediaType: input.mediaType } : {}),
      }),
    onSuccess: () => {
      setText("");
      void queryClient.invalidateQueries({ queryKey: ["messages", id] });
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => chunksRef.current.push(event.data);
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        send.mutate({ file, mediaType: "voice" });
        stream.getTracks().forEach((track) => track.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      toast.error("Microphone permission is needed for voice notes");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  const other = meta.data?.members.find((member) => member.id !== me.data?.id);
  const title = meta.data?.conversation?.is_group
    ? meta.data.conversation.title || "Group Chat"
    : (other?.name ?? "Chat");

  return (
    <Screen title={title}>
      <ul className="space-y-3 pb-24">
        {(messages.data ?? []).map((message) => {
          const mine = message.sender_id === me.data?.id;
          return (
            <li key={message.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
              <Avatar
                path={message.sender?.avatar_url ?? null}
                name={message.sender?.name ?? "M"}
                size={28}
              />
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine ? "bg-brand text-primary-foreground" : "bg-card border border-border"
                }`}
              >
                {meta.data?.conversation?.is_group && !mine ? (
                  <p className="mb-1 text-[0.65rem] font-bold opacity-80">
                    @{message.sender?.username}
                  </p>
                ) : null}
                {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}
                {message.media_url && message.media_type === "voice" ? (
                  <VoiceNote path={message.media_url} />
                ) : null}
                {message.media_url && message.media_type !== "voice" ? (
                  <div className="mt-1 overflow-hidden rounded-xl">
                    <SignedMedia
                      path={message.media_url}
                      type={message.media_type}
                      autoPlay={false}
                    />
                  </div>
                ) : null}
                {message.sharedPost ? (
                  <div className="mt-1 rounded-xl border border-border/60 bg-background/40 p-2">
                    <p className="text-[0.65rem] font-bold uppercase opacity-70">
                      Shared {message.sharedPost.kind}
                    </p>
                    {message.sharedPost.caption ? (
                      <p className="text-xs">{message.sharedPost.caption}</p>
                    ) : null}
                    {message.sharedPost.media_url ? (
                      <div className="mt-1 overflow-hidden rounded-lg">
                        <SignedMedia
                          path={message.sharedPost.media_url}
                          type={message.sharedPost.media_type}
                          autoPlay={false}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
        <div ref={bottomRef} />
      </ul>

      <form
        className="fixed inset-x-0 bottom-[3.6rem] z-20 border-t border-border bg-background/95 p-2 backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          if (!text.trim()) return;
          send.mutate({ body: text });
        }}
      >
        <div className="mx-auto flex w-full max-w-2xl items-center gap-2">
          <label className="btn-base cursor-pointer bg-secondary px-2 text-secondary-foreground">
            <ImagePlus className="size-4" />
            <input
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) send.mutate({ file });
                event.target.value = "";
              }}
            />
          </label>
          <input
            className="field field-focus"
            placeholder="Write a message"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            type="button"
            onClick={recording ? stopRecording : () => void startRecording()}
            aria-label={recording ? "Stop recording" : "Record voice note"}
            className={`btn-base px-2 ${recording ? "bg-destructive text-destructive-foreground" : "bg-secondary text-secondary-foreground"}`}
          >
            {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
          </button>
          <button type="submit" className="btn-base btn-primary px-3" aria-label="Send message">
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </Screen>
  );
}
