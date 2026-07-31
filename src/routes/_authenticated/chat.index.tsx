import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MessageSquarePlus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Avatar } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import {
  createGroupChat,
  fetchConversations,
  fetchMyProfile,
  search,
  startDirectChat,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Chats — MzansiTalk" },
      {
        name: "description",
        content:
          "Direct messages and group chats on MzansiTalk. Send text, photos, videos, voice notes and share posts.",
      },
      { property: "og:title", content: "Chats — MzansiTalk" },
      { property: "og:description", content: "DMs and unlimited group chats on MzansiTalk." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChatList,
});

function ChatList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");
  const [groupMode, setGroupMode] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [picked, setPicked] = useState<string[]>([]);

  const me = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const chats = useQuery({ queryKey: ["conversations"], queryFn: fetchConversations });
  const people = useQuery({
    queryKey: ["chat-people", term],
    queryFn: () => search(term.trim()),
    enabled: term.trim().length > 0,
  });

  const openDm = useMutation({
    mutationFn: (targetId: string) => startDirectChat(targetId),
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void navigate({ to: "/chat/$id", params: { id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const makeGroup = useMutation({
    mutationFn: () => createGroupChat(groupTitle.trim(), picked),
    onSuccess: (id) => {
      setGroupMode(false);
      setPicked([]);
      setGroupTitle("");
      void queryClient.invalidateQueries({ queryKey: ["conversations"] });
      void navigate({ to: "/chat/$id", params: { id } });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  type ChatRow = Awaited<ReturnType<typeof fetchConversations>>[number];

  const title = (chat: ChatRow | undefined) => {
    if (!chat) return "Chat";
    if (chat.is_group) return chat.title || "Group Chat";
    const other = chat.members.find((member) => member.id !== me.data?.id);
    return other?.name ?? "Chat";
  };

  return (
    <Screen title="Chats">
      <div className="flex gap-2">
        <input
          className="field field-focus"
          placeholder="Search people to message"
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setGroupMode((value) => !value)}
          className="btn-base btn-primary shrink-0"
          aria-label="New group chat"
        >
          <Users className="size-4" />
        </button>
      </div>

      {groupMode ? (
        <section className="mt-3 rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-bold">New Group</h2>
          <input
            className="field field-focus mt-2"
            placeholder="Group name"
            value={groupTitle}
            onChange={(event) => setGroupTitle(event.target.value)}
            maxLength={60}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Search above and tap people to add them. Groups take unlimited members.
          </p>
          <button
            type="button"
            onClick={() => makeGroup.mutate()}
            disabled={picked.length === 0}
            className="btn-base btn-primary mt-3 w-full disabled:opacity-60"
          >
            Create Group ({picked.length} added)
          </button>
        </section>
      ) : null}

      {term.trim() ? (
        <ul className="mt-3 space-y-2">
          {(people.data?.people ?? [])
            .filter((person) => person.id !== me.data?.id)
            .map((person) => {
              const isPicked = picked.includes(person.id);
              return (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() =>
                      groupMode
                        ? setPicked((list) =>
                            isPicked ? list.filter((id) => id !== person.id) : [...list, person.id],
                          )
                        : openDm.mutate(person.id)
                    }
                    className={`flex w-full items-center gap-3 rounded-xl border border-border p-3 text-left ${
                      isPicked ? "bg-brand text-primary-foreground" : "bg-card"
                    }`}
                  >
                    <Avatar path={person.avatar_url} name={person.name} size={36} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{person.name}</span>
                      <span className="block truncate text-xs opacity-80">@{person.username}</span>
                    </span>
                    <MessageSquarePlus className="size-4 opacity-70" />
                  </button>
                </li>
              );
            })}
          {(people.data?.people ?? []).length === 0 ? (
            <li className="text-sm text-muted-foreground">No people found.</li>
          ) : null}
        </ul>
      ) : null}

      <h2 className="mt-5 text-sm font-bold">Your Chats</h2>
      {(chats.data ?? []).length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No chats yet. Search for someone above to start a DM.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {(chats.data ?? []).map((chat) => (
            <li key={chat.id}>
              <Link
                to="/chat/$id"
                params={{ id: chat.id }}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
              >
                <Avatar
                  path={
                    chat.is_group
                      ? null
                      : (chat.members.find((member) => member.id !== me.data?.id)?.avatar_url ?? null)
                  }
                  name={title(chat)}
                  size={40}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{title(chat)}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {chat.lastMessage?.body ??
                      (chat.lastMessage?.media_type
                        ? `Sent a ${chat.lastMessage.media_type}`
                        : "No messages yet")}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Screen>
  );
}
