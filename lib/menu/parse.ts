import type {
  GlossaryTerm,
  MenuAnalysisResult,
  MenuItem,
  MenuSection,
  ParseStatus,
} from "@/lib/menu/types";
import type { OcrResult } from "@/lib/ocr/provider";

const PRICE_PATTERN =
  /(?:[$€£]\s?\d{1,3}(?:[.,]\d{2})?|\b\d{1,3}(?:[.,]\d{2})?\b\s?(?:usd|eur|gbp)?)/i;

const GLOSSARY_TERMS = [
  "aioli",
  "al pastor",
  "arancini",
  "au jus",
  "bisque",
  "branzino",
  "brodo",
  "carpaccio",
  "ceviche",
  "chimichurri",
  "confit",
  "crudo",
  "frittata",
  "gnocchi",
  "miso",
  "ponzu",
  "ramen",
  "risotto",
  "sofrito",
  "tartare",
];

export function parseMenuAnalysis(args: {
  sessionId: string;
  imageName?: string;
  ocr: OcrResult;
}): MenuAnalysisResult {
  const warnings: string[] = [];
  const rawLines = args.ocr.lines.map((line) => line.text).filter(Boolean);

  if (rawLines.length === 0 && args.ocr.text.length === 0) {
    return buildResult({
      sessionId: args.sessionId,
      imageName: args.imageName,
      parseStatus: "failed",
      sections: [],
      flatItems: [],
      glossaryCandidates: [],
      warnings: [
        "We couldn’t read this menu clearly yet. Try a sharper, brighter photo.",
      ],
    });
  }

  const lines = dedupeLines(rawLines);
  const sections: MenuSection[] = [];
  const flatItems: MenuItem[] = [];
  let currentSectionTitle = "Detected Items";
  let currentSectionItems: MenuItem[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const nextLine = lines[index + 1];

    if (isSectionHeading(line, nextLine)) {
      pushSection(sections, currentSectionTitle, currentSectionItems);
      currentSectionTitle = formatSectionTitle(line);
      currentSectionItems = [];
      continue;
    }

    const itemCandidate = parseItemLine(line, nextLine);
    if (!itemCandidate) {
      continue;
    }

    currentSectionItems.push({
      ...itemCandidate,
      id: createId(`${currentSectionTitle}-${flatItems.length}-${itemCandidate.name}`),
      sectionTitle: currentSectionTitle,
    });
    flatItems.push(currentSectionItems[currentSectionItems.length - 1]);

    if (itemCandidate.description && nextLine === itemCandidate.description) {
      index += 1;
    }
  }

  pushSection(sections, currentSectionTitle, currentSectionItems);

  const fallbackItems = buildFallbackItems(flatItems);
  const useFlatFallback = shouldUseFlatFallback(
    args.ocr.averageConfidence,
    fallbackItems,
    flatItems,
  );
  const resolvedItems = useFlatFallback ? fallbackItems : flatItems;
  const resolvedSections = useFlatFallback
    ? buildFlatFallbackSections(fallbackItems)
    : sections.filter((section) => section.items.length > 0);
  const glossaryCandidates = extractGlossaryCandidates(resolvedItems);
  const parseStatus = deriveParseStatus(resolvedItems.length, args.ocr.averageConfidence);

  if (args.ocr.averageConfidence < 0.55) {
    warnings.push("This menu photo was difficult to read, so some text may be incomplete.");
  }

  if (useFlatFallback && resolvedItems.length > 0) {
    warnings.push("Sections were not confidently detected, so only clearer item lines are shown.");
  }

  if (parseStatus === "partial" && resolvedItems.length === 0) {
    warnings.push("We found some text, but not enough structure to reliably list menu items.");
  }

  if (
    parseStatus === "partial" &&
    resolvedItems.length > 0 &&
    resolvedSections.every((section) => section.title === "Detected Items")
  ) {
    warnings.push("Sections were not confidently detected, so items are shown in a flat list.");
  }

  if (resolvedItems.length === 0) {
    return buildResult({
      sessionId: args.sessionId,
      imageName: args.imageName,
      parseStatus: "failed",
      sections: [],
      flatItems: [],
      glossaryCandidates,
      warnings: [
        "We couldn’t turn this photo into a readable menu yet.",
        ...warnings,
      ],
    });
  }

  return buildResult({
    sessionId: args.sessionId,
    imageName: args.imageName,
    parseStatus,
    sections: resolvedSections,
    flatItems: resolvedItems,
    glossaryCandidates,
    warnings,
  });
}

function buildResult({
  sessionId,
  imageName,
  parseStatus,
  sections,
  flatItems,
  glossaryCandidates,
  warnings,
}: {
  sessionId: string;
  imageName?: string;
  parseStatus: ParseStatus;
  sections: MenuSection[];
  flatItems: MenuItem[];
  glossaryCandidates: GlossaryTerm[];
  warnings: string[];
}): MenuAnalysisResult {
  return {
    sessionId,
    imageName,
    parseStatus,
    sections,
    flatItems,
    glossaryCandidates,
    warnings,
    createdAt: new Date().toISOString(),
  };
}

function dedupeLines(lines: string[]) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const line of lines) {
    const cleaned = normalizeLine(line);
    if (!cleaned) {
      continue;
    }

    const key = cleaned.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(cleaned);
  }

  return normalized;
}

function normalizeLine(line: string) {
  return line
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
}

function isSectionHeading(line: string, nextLine?: string) {
  if (PRICE_PATTERN.test(line)) {
    return false;
  }

  const words = line.split(/\s+/);
  if (words.length === 0 || words.length > 4) {
    return false;
  }

  const uppercase = line === line.toUpperCase();
  const titleLike = words.every((word) => /^[A-Z][A-Za-z&/]+$/.test(word));
  const nextLooksLikeItem = nextLine ? Boolean(parseItemLine(nextLine)) : false;

  return (uppercase || titleLike || line.endsWith(":")) && nextLooksLikeItem;
}

function parseItemLine(line: string, nextLine?: string): Omit<MenuItem, "id"> | null {
  const priceMatch = line.match(PRICE_PATTERN);
  const normalizedLine = normalizeLine(line);

  if (priceMatch) {
    const price = normalizePrice(priceMatch[0]);
    const name = normalizeDishName(normalizedLine.replace(priceMatch[0], "").trim());
    if (!name || name.length < 2) {
      return null;
    }

    const descriptionLine = isDescriptionLine(nextLine) ? nextLine : undefined;
    const description = descriptionLine ? normalizeDescription(descriptionLine) : "";
    return {
      name,
      description,
      price,
      confidence: description ? 0.8 : 0.74,
    };
  }

  if (!looksLikeDishName(normalizedLine) || isDescriptionLine(normalizedLine)) {
    return null;
  }

  const descriptionLine = isDescriptionLine(nextLine) ? nextLine : undefined;
  const description = descriptionLine ? normalizeDescription(descriptionLine) : "";

  return {
    name: normalizeDishName(normalizedLine),
    description,
    confidence: description ? 0.68 : 0.58,
  };
}

function looksLikeDishName(line: string) {
  if (!line || line.length > 52) {
    return false;
  }

  if (/\d/.test(line) && !PRICE_PATTERN.test(line)) {
    return false;
  }

  const words = line.split(/\s+/);
  return words.length <= 7;
}

function isDescriptionLine(line?: string) {
  if (!line) {
    return false;
  }

  if (PRICE_PATTERN.test(line)) {
    return false;
  }

  const words = line.trim().split(/\s+/);
  return words.length >= 4 && line.length >= 18;
}

function normalizeDishName(line: string) {
  return line
    .replace(/\s{2,}/g, " ")
    .replace(/^[^A-Za-z]+/, "")
    .replace(/[^A-Za-z&,'/()\-\s]+$/g, "")
    .trim();
}

function normalizeDescription(line: string) {
  return line.replace(/\s{2,}/g, " ").trim();
}

function normalizePrice(value: string) {
  const trimmed = value.replace(/\s+/g, "");
  return /^[€£$]/.test(trimmed) ? trimmed : `$${trimmed}`;
}

function formatSectionTitle(value: string) {
  const trimmed = value.replace(/:$/, "").trim();
  return trimmed
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function pushSection(
  sections: MenuSection[],
  title: string,
  items: MenuItem[],
) {
  if (items.length === 0) {
    return;
  }

  sections.push({
    id: createId(`${title}-${sections.length}`),
    title,
    items: [...items],
  });
}

function deriveParseStatus(itemCount: number, averageConfidence: number): ParseStatus {
  if (itemCount >= 3 && averageConfidence >= 0.65) {
    return "success";
  }

  if (itemCount >= 1) {
    return "partial";
  }

  return "failed";
}

function buildFallbackItems(items: MenuItem[]) {
  return items
    .filter((item) => item.price && looksLikeFallbackItemName(item.name))
    .map((item) => ({
      ...item,
      name: cleanFallbackName(item.name),
      description: "",
      confidence: Math.min(item.confidence, 0.66),
      sectionTitle: "Detected Items",
    }))
    .filter((item) => item.name.length >= 4);
}

function shouldUseFlatFallback(
  averageConfidence: number,
  fallbackItems: MenuItem[],
  items: MenuItem[],
) {
  if (fallbackItems.length < 3) {
    return false;
  }

  if (averageConfidence < 0.7) {
    return true;
  }

  return fallbackItems.length * 2 <= items.length;
}

function buildFlatFallbackSections(items: MenuItem[]) {
  if (items.length === 0) {
    return [];
  }

  return [
    {
      id: createId("Detected Items-0"),
      title: "Detected Items",
      items,
    },
  ];
}

function looksLikeFallbackItemName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 4 || trimmed.length > 36) {
    return false;
  }

  const words = trimmed.split(/\s+/);
  if (words.length === 0 || words.length > 5) {
    return false;
  }

  if (words.filter((word) => word.length <= 2).length > 1) {
    return false;
  }

  const lettersOnly = trimmed.replace(/[^A-Za-z]/g, "");
  if (lettersOnly.length < 4 || !/[aeiou]/i.test(lettersOnly)) {
    return false;
  }

  return true;
}

function cleanFallbackName(name: string) {
  const words = name.trim().split(/\s+/);
  while (
    words.length > 1 &&
    /^[A-Z]{1,4}$/.test(words[words.length - 1] ?? "") &&
    !/[aeiou]/i.test(words[words.length - 1] ?? "")
  ) {
    words.pop();
  }

  while (
    words.length > 1 &&
    /^[A-Z][A-Z]+$/.test(words[words.length - 1] ?? "") &&
    (words[words.length - 1] ?? "").length <= 4
  ) {
    words.pop();
  }

  return words.join(" ");
}

function extractGlossaryCandidates(items: MenuItem[]) {
  const terms = new Map<string, GlossaryTerm>();
  const haystacks = items.map((item) => `${item.name} ${item.description}`.toLowerCase());

  for (const term of GLOSSARY_TERMS) {
    const matchingContext = haystacks.find((text) => text.includes(term));
    if (!matchingContext) {
      continue;
    }

    terms.set(term, {
      id: createId(term),
      label: term.charAt(0).toUpperCase() + term.slice(1),
      confidence: 0.72,
      contextText: matchingContext,
    });
  }

  return Array.from(terms.values());
}

function createId(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
