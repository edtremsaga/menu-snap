"use client";

interface ProcessingStateProps {
  message: string;
}

export function ProcessingState({ message }: ProcessingStateProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)] shadow-sm">
      <div className="flex items-center gap-3">
        <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[var(--accent)]" />
        <span>{message}</span>
      </div>
    </div>
  );
}
