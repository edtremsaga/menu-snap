import type { MenuAnalysisResult, StoredMenuSession } from "@/lib/menu/types";

const STORAGE_PREFIX = "menu-snap-session:";

export function saveMenuSession(
  sessionId: string,
  imagePreviewDataUrl: string,
  analysis: MenuAnalysisResult,
) {
  if (typeof window === "undefined") {
    return;
  }

  const value: StoredMenuSession = {
    imagePreviewDataUrl,
    analysis,
  };

  window.sessionStorage.setItem(
    `${STORAGE_PREFIX}${sessionId}`,
    JSON.stringify(value),
  );
}

export function loadMenuSession(sessionId: string): StoredMenuSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(`${STORAGE_PREFIX}${sessionId}`);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as StoredMenuSession;
  } catch {
    return null;
  }
}
