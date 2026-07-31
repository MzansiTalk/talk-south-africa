import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Pencil, Settings } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { BannerAd } from "@/components/Ads";
import { PostCard } from "@/components/PostCard";

import { Avatar, useMediaUrl } from "@/components/SignedMedia";
import { Screen } from "@/components/Shell";
import {
  fetchFollowCounts,
  fetchMyProfile,
  fetchSaved,
  fetchUserContent,
  updateMyProfile,
  uploadMedia,
} from "@/lib/api";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — MzansiTalk" },
      {
        name: "description",
        content: "Your MzansiTalk profile: timeline, photos, reels, tagged, saved and my boosts.",
      },
      { property: "og:title", content: "My Profile — MzansiTalk" },
      { property: "og:description", content: "Manage your MzansiTalk profile and content." },
    ],
  }),
  component: MyProfile,
});

const TABS = ["Timeline", "Photos", "Reels", "Tagged", "Saved", "My Boosts"] as const;

function MyProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Timeline");
  const [editing, setEditing] = useState(false);

  const profile = useQuery({ queryKey: ["my-profile"], queryFn: fetchMyProfile });
  const userId = profile.data?.id;

  const counts = useQuery({
    queryKey: ["follow-counts", userId],
    queryFn: () => fetchFollowCounts(userId!),
    enabled: Boolean(userId),
  });
  const content = useQuery({
    queryKey: ["profile-content", userId],
    queryFn: () => fetchUserContent(userId!),
    enabled: Boolean(userId),
  });
  const saved = useQuery({ queryKey: ["saved"], queryFn: fetchSaved, enabled: tab === "Saved" });
  const cover = useMediaUrl(profile.data?.cover_url);

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  const save = useMutation({
    mutationFn: async (patch: { name?: string; bio?: string; avatar_url?: string; cover_url?: string }) =>
      updateMyProfile(patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      toast.success("Profile updated");
      setEditing(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const pickImage = async (target: "avatar_url" | "cover_url", file: File | null) => {
    if (!file) return;
    try {
      const path = await uploadMedia(file);
      save.mutate({ [target]: path });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    }
  };

  const items =
    tab === "Saved"
      ? (saved.data ?? [])
      : tab === "Photos"
        ? (content.data ?? []).filter((item) => item.media_type === "image")
        : tab === "Reels"
          ? (content.data ?? []).filter((item) => item.kind === "reel")
          : tab === "Timeline"
            ? (content.data ?? [])
            : [];

  return (
    <Screen title="Profile">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
        <label className="relative block h-32 cursor-pointer bg-brand">
          {cover.data ? (
            <img src={cover.data} alt="Cover photo" className="h-full w-full object-cover" />
          ) : null}
          <span className="absolute bottom-2 right-2 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold">
            Change cover
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => void pickImage("cover_url", event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="px-4 pb-4">
          <label className="-mt-8 inline-block cursor-pointer rounded-full ring-4 ring-card">
            <Avatar path={profile.data?.avatar_url} name={profile.data?.name ?? "M"} size={72} />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => void pickImage("avatar_url", event.target.files?.[0] ?? null)}
            />
          </label>

          {editing ? (
            <div className="mt-3 space-y-2">
              <input
                className="field field-focus"
                defaultValue={profile.data?.name ?? ""}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
                maxLength={60}
              />
              <textarea
                className="field field-focus"
                defaultValue={profile.data?.bio ?? ""}
                onChange={(event) => setBio(event.target.value)}
                placeholder="Bio"
                maxLength={300}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-base btn-primary"
                  onClick={() =>
                    save.mutate({
                      name: name || profile.data?.name || "",
                      bio: bio || profile.data?.bio || "",
                    })
                  }
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn-base bg-secondary text-secondary-foreground"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mt-2 flex items-start justify-between gap-2">
                <div>
                  <h1 className="font-display text-xl font-bold">{profile.data?.name}</h1>
                  <p className="text-sm text-muted-foreground">@{profile.data?.username}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="btn-base bg-secondary px-3 text-secondary-foreground"
                    aria-label="Edit profile"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <Link
                    to="/settings"
                    className="btn-base bg-secondary px-3 text-secondary-foreground"
                    aria-label="Settings"
                  >
                    <Settings className="size-4" />
                  </Link>
                </div>
              </div>
              {profile.data?.bio ? <p className="mt-2 text-sm">{profile.data.bio}</p> : null}
            </>
          )}

          <div className="mt-3 flex gap-5 text-sm">
            <span>
              <span className="font-bold">{counts.data?.followers ?? 0}</span>{" "}
              <span className="text-muted-foreground">Followers</span>
            </span>
            <span>
              <span className="font-bold">{counts.data?.following ?? 0}</span>{" "}
              <span className="text-muted-foreground">Following</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
        {TABS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            className={`btn-base whitespace-nowrap py-1.5 text-xs ${
              tab === value ? "btn-primary" : "bg-secondary text-secondary-foreground"
            }`}
          >
            {value}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {tab === "My Boosts" ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Boosting with Paystack arrives in the next release. Your boost history will show here.
          </div>
        ) : tab === "Tagged" ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            No tagged content yet.
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </div>
        ) : (
          items.map((item) => <PostCard key={item.id} item={item} />)
        )}
      </div>

      <div className="mt-6">
        <BannerAd placement="profile_banner" />
      </div>



      <button
        type="button"
        className="mt-6 hidden"
        onClick={() => void navigate({ to: "/home" })}
        aria-hidden
      />
    </Screen>
  );
}
