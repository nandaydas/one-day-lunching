"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { getClientStorage } from "@/lib/firebase-client";

const MAX_EDGE = 1600; // px — plenty for phones, keeps uploads ~200–400 KB
const MAX_INPUT_MB = 15;

async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process image"))), "image/jpeg", 0.85)
  );
}

/** Shrinks and uploads one photo to the event's storage folder; returns its public URL. */
export async function uploadEventPhoto(eventId: string, file: File): Promise<string> {
  const blob = await downscale(file);
  const path = `events/${eventId}/assets/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const snap = await uploadBytes(ref(getClientStorage(), path), blob, { contentType: "image/jpeg" });
  return getDownloadURL(snap.ref);
}

/** Returns an error message if any file is not an acceptable photo. */
export function checkPhotos(files: File[]): string | null {
  if (files.some((f) => !f.type.startsWith("image/"))) return "Please choose image files only.";
  if (files.some((f) => f.size > MAX_INPUT_MB * 1024 * 1024)) return `Each photo must be under ${MAX_INPUT_MB} MB.`;
  return null;
}

export function PhotoUploader({
  eventId,
  value,
  max,
  label,
  onChange,
}: {
  eventId: string;
  value: string[];
  max: number;
  label: string;
  onChange: (urls: string[]) => void;
}) {
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const room = max - value.length;
    const picked = Array.from(files).slice(0, max === 1 ? 1 : room);
    const problem = checkPhotos(picked);
    if (problem) return setError(problem);

    setBusy(true);
    try {
      const urls = await Promise.all(picked.map((file) => uploadEventPhoto(eventId, file)));
      onChange(max === 1 ? urls.slice(0, 1) : [...value, ...urls].slice(0, max));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-[11px] text-muted-foreground">
          {value.length}/{max}
        </span>
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {value.map((url, i) => (
            <div key={url} className="relative aspect-square overflow-hidden rounded-md border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                onClick={() => onChange(value.filter((u) => u !== url))}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {(max === 1 || value.length < max) && (
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-muted px-3 py-2 text-xs font-medium hover:bg-muted/70 disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {busy ? "Uploading…" : max === 1 && value.length ? "Replace photo" : "Upload photos"}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple={max > 1}
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
