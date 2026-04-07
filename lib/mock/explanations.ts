import type {
  ExplanationRequest,
  ExplanationResult,
} from "@/lib/menu/types";

const TERM_EXPLANATIONS: Record<string, Omit<ExplanationResult, "label" | "type">> = {
  confit: {
    explanation: "Cooked slowly in fat until very tender.",
  },
  aioli: {
    explanation: "A garlic-based sauce, often similar to mayonnaise.",
  },
  crudo: {
    explanation: "Raw fish or meat, usually sliced and lightly dressed.",
  },
};

const DISH_EXPLANATIONS: Record<string, Omit<ExplanationResult, "label" | "type">> = {
  ramen: {
    explanation:
      "A Japanese noodle soup with broth, noodles, and toppings such as pork, egg, or scallions.",
  },
  "duck confit": {
    explanation: "Duck cooked slowly until tender, then finished for a crisp exterior.",
    secondaryNote: "It is often served as a richer main dish.",
  },
  "hamachi crudo": {
    explanation: "A dish of sliced raw yellowtail served with light seasoning or dressing.",
  },
};

export function createMockExplanation(
  input: ExplanationRequest,
): ExplanationResult {
  const key = input.label.trim().toLowerCase();
  const source =
    input.type === "term"
      ? TERM_EXPLANATIONS[key]
      : DISH_EXPLANATIONS[key] ?? {
          explanation: `${input.label} is a dish name from the menu. The menu description provides the main ingredients and preparation style.`,
        };

  return {
    label: input.label,
    type: input.type,
    explanation: source.explanation,
    secondaryNote: source.secondaryNote,
  };
}
