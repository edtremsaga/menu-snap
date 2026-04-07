"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { prepareImageForUpload } from "@/lib/image/prepare";
import { saveMenuSession } from "@/lib/menu/session";
import type { MenuAnalysisResult } from "@/lib/menu/types";
import { ProcessingState } from "@/components/ProcessingState";

export function ImageCapture() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewDataUrl, setPreviewDataUrl] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFileChange(file: File | null) {
    setSubmitError(null);

    if (!file) {
      setSelectedFile(null);
      setPreviewDataUrl(null);
      return;
    }

    try {
      setIsPreparing(true);
      const preparedImage = await prepareImageForUpload(file);
      setSelectedFile(preparedImage.file);
      setPreviewDataUrl(preparedImage.previewDataUrl);
    } catch {
      setSubmitError("We couldn’t prepare that image. Please try another photo.");
      setSelectedFile(null);
      setPreviewDataUrl(null);
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleSubmit() {
    if (!selectedFile || !previewDataUrl) {
      setSubmitError("Choose one menu photo before continuing.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("/api/analyze-menu", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Analyze failed");
      }

      const analysis = (await response.json()) as MenuAnalysisResult;
      saveMenuSession(analysis.sessionId, previewDataUrl, analysis);
      router.push(`/menu/${analysis.sessionId}`);
    } catch {
      setSubmitError("We couldn’t read that menu yet. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFileChange(file);
        }}
      />
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;
          void handleFileChange(file);
        }}
      />

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="w-full rounded-2xl bg-[var(--accent)] px-5 py-4 text-base font-semibold text-white"
        >
          Take Menu Photo
        </button>
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 text-base font-semibold"
        >
          Upload Existing Photo
        </button>
      </div>

      {isPreparing ? <ProcessingState message="Preparing photo…" /> : null}
      {isSubmitting ? <ProcessingState message="Reading menu…" /> : null}

      {previewDataUrl ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
          <p className="px-1 pb-3 text-sm font-medium text-[var(--muted)]">Selected photo</p>
          <div className="relative h-64 w-full overflow-hidden rounded-2xl">
            <Image
              src={previewDataUrl}
              alt="Selected menu preview"
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--danger)] shadow-sm">
          {submitError}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={isPreparing || isSubmitting}
        className="w-full rounded-2xl bg-[var(--foreground)] px-5 py-4 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Analyze Menu
      </button>
    </div>
  );
}
