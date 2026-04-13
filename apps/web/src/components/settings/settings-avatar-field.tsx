"use client";

import { useRef, useState, useTransition } from "react";

type SettingsAvatarFieldProps = {
  initialAvatarUrl?: string;
  initialAvatarMediaId?: string;
  displayName: string;
};

type UploadResult = {
  ok: boolean;
  data?: {
    id: string;
    url?: string;
  };
  error?: string;
};

export function SettingsAvatarField({
  initialAvatarUrl,
  initialAvatarMediaId,
  displayName
}: SettingsAvatarFieldProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl ?? "");
  const [avatarMediaId, setAvatarMediaId] = useState(initialAvatarMediaId ?? "");
  const [message, setMessage] = useState("");
  const [isUploading, startUploadTransition] = useTransition();
  const initials = (displayName.trim().charAt(0) || "H").toUpperCase();

  async function handleAvatarUpload(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("moduleKey", "settings");
    formData.append("entityType", "profile");
    formData.append("entityId", "current");
    formData.append("fieldName", "avatar");
    formData.append("altText", displayName || file.name.replace(/\.[^.]+$/, ""));

    const response = await fetch("/api/media/uploads", {
      method: "POST",
      body: formData
    });

    const result = (await response.json()) as UploadResult;
    if (!response.ok || !result.ok || !result.data) {
      throw new Error(result.error || "Avatar upload failed.");
    }

    setAvatarUrl(result.data.url ?? "");
    setAvatarMediaId(result.data.id);
    setMessage("Avatar updated. Save changes to keep it.");
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="avatarMediaId" value={avatarMediaId} />
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-container-low text-lg font-semibold text-primary shadow-ambient"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span>{initials}</span>
          )}
          <span className="absolute inset-0 hidden items-center justify-center bg-black/20 text-xs font-semibold text-white group-hover:flex">
            Change
          </span>
        </button>
        <div className="space-y-2 text-sm text-foreground/65">
          <p className="font-medium text-foreground/80">Profile photo</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isUploading ? "Uploading..." : "Upload photo"}
            </button>
            {avatarMediaId ? (
              <button
                type="button"
                onClick={() => {
                  setAvatarUrl("");
                  setAvatarMediaId("");
                  setMessage("Avatar cleared. Save changes to keep it.");
                }}
                className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-primary shadow-ambient"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-xs text-foreground/50">JPEG, PNG, or WebP up to 20MB.</p>
          {message ? <p className="text-xs text-primary">{message}</p> : null}
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }

          startUploadTransition(async () => {
            try {
              await handleAvatarUpload(file);
            } catch (error) {
              setMessage(error instanceof Error ? error.message : "Avatar upload failed.");
            } finally {
              event.target.value = "";
            }
          });
        }}
      />
    </div>
  );
}
