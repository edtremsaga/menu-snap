"use client";

import type { ExplanationResult } from "@/lib/menu/types";

interface ExplanationSheetProps {
  data: ExplanationResult | null;
  error: string | null;
  loading: boolean;
  open: boolean;
  onDismiss: () => void;
}

export function ExplanationSheet({
  data,
  error,
  loading,
  open,
  onDismiss,
}: ExplanationSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35">
      <button
        type="button"
        aria-label="Dismiss explanation"
        className="absolute inset-0"
        onClick={onDismiss}
      />
      <div className="relative z-10 w-full rounded-t-[28px] bg-[var(--surface)] px-5 pb-8 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-[var(--border)]" />
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Explanation
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">
              {data?.label ?? "Loading"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-full border border-[var(--border)] px-3 py-2 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="mt-5 min-h-24 rounded-2xl bg-[var(--background)] p-4 text-base leading-7 text-[var(--foreground)]">
          {loading && <p>Loading explanation…</p>}
          {!loading && error && <p className="text-[var(--danger)]">{error}</p>}
          {!loading && !error && data && (
            <>
              <p>{data.explanation}</p>
              {data.secondaryNote ? (
                <p className="mt-3 text-sm text-[var(--muted)]">{data.secondaryNote}</p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
