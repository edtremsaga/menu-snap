"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ExplanationSheet } from "@/components/ExplanationSheet";
import { MenuPhotoView } from "@/components/MenuPhotoView";
import { MenuReadableView } from "@/components/MenuReadableView";
import { loadMenuSession } from "@/lib/menu/session";
import type {
  ExplanationResult,
  ExplanationType,
  StoredMenuSession,
} from "@/lib/menu/types";

type ViewMode = "readable" | "photo";

interface MenuSessionScreenProps {
  sessionId: string;
}

export function MenuSessionScreen({ sessionId }: MenuSessionScreenProps) {
  const [storedSession, setStoredSession] = useState<StoredMenuSession | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>("readable");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [sheetData, setSheetData] = useState<ExplanationResult | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    setStoredSession(loadMenuSession(sessionId));
    setHasLoaded(true);
  }, [sessionId]);

  async function handleExplain({
    label,
    type,
    contextText,
    sectionTitle,
  }: {
    label: string;
    type: ExplanationType;
    contextText?: string;
    sectionTitle?: string;
  }) {
    setSheetOpen(true);
    setSheetLoading(true);
    setSheetError(null);
    setSheetData({
      label,
      type,
      explanation: "",
    });

    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          label,
          type,
          contextText,
          sectionTitle,
        }),
      });

      if (!response.ok) {
        throw new Error("Explain failed");
      }

      const explanation = (await response.json()) as ExplanationResult;
      setSheetData(explanation);
    } catch {
      setSheetError("We couldn’t load that explanation. Please try again.");
    } finally {
      setSheetLoading(false);
    }
  }

  if (!hasLoaded) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-md px-5 py-8">
        <p className="text-sm text-[var(--muted)]">Loading menu…</p>
      </main>
    );
  }

  if (!storedSession) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-8">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Menu Snap
          </p>
          <h1 className="mt-3 text-2xl font-semibold">Menu session unavailable</h1>
          <p className="mt-3 text-base leading-7 text-[var(--muted)]">
            This menu isn’t available in the current browser session. Start with a new
            photo to continue.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-2xl bg-[var(--accent)] px-5 py-3 text-base font-semibold text-white"
          >
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-5 py-6 pb-24">
      <header>
        <Link href="/" className="text-sm font-medium text-[var(--muted)]">
          Back
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Your Menu</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          View the menu in a readable format or compare it with the uploaded photo.
        </p>
      </header>

      <div className="mt-6 inline-flex rounded-2xl bg-[var(--surface-muted)] p-1">
        <ToggleButton
          active={activeView === "readable"}
          onClick={() => setActiveView("readable")}
        >
          Readable Menu
        </ToggleButton>
        <ToggleButton active={activeView === "photo"} onClick={() => setActiveView("photo")}>
          Original Photo
        </ToggleButton>
      </div>

      <section className="mt-6">
        {activeView === "readable" ? (
          <MenuReadableView
            analysis={storedSession.analysis}
            onExplain={(args) => void handleExplain(args)}
          />
        ) : (
          <MenuPhotoView imagePreviewDataUrl={storedSession.imagePreviewDataUrl} />
        )}
      </section>

      <ExplanationSheet
        data={sheetData}
        error={sheetError}
        loading={sheetLoading}
        open={sheetOpen}
        onDismiss={() => setSheetOpen(false)}
      />
    </main>
  );
}

function ToggleButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-3 text-sm font-semibold ${
        active
          ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm"
          : "text-[var(--muted)]"
      }`}
    >
      {children}
    </button>
  );
}
