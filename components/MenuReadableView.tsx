"use client";

import type {
  ExplanationType,
  GlossaryTerm,
  MenuAnalysisResult,
  MenuItem,
} from "@/lib/menu/types";

interface MenuReadableViewProps {
  analysis: MenuAnalysisResult;
  onExplain: (args: {
    label: string;
    type: ExplanationType;
    contextText?: string;
    sectionTitle?: string;
  }) => void;
}

export function MenuReadableView({
  analysis,
  onExplain,
}: MenuReadableViewProps) {
  const sectionsToRender =
    analysis.sections.length > 0
      ? analysis.sections
      : analysis.flatItems.length > 0
        ? [
            {
              id: "detected-items",
              title: "Detected Items",
              items: analysis.flatItems,
            },
          ]
        : [];

  return (
    <div className="space-y-5">
      {analysis.warnings.length > 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted)] shadow-sm">
          <div className="space-y-2">
            {analysis.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        </div>
      ) : null}

      {analysis.parseStatus === "failed" ? (
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Readable Menu</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            We couldn’t turn this photo into a readable menu yet. You can still review
            the original photo and try another image.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {sectionsToRender.map((section) => (
          <section
            key={section.id}
            className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm"
          >
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <div className="mt-4 space-y-3">
              {section.items.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onExplain={() =>
                    onExplain({
                      label: item.name,
                      type: "dish",
                      contextText: item.description,
                      sectionTitle: item.sectionTitle,
                    })
                  }
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {analysis.glossaryCandidates.length > 0 ? (
        <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Glossary</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {analysis.glossaryCandidates.map((term) => (
              <GlossaryChip
                key={term.id}
                term={term}
                onPress={() =>
                  onExplain({
                    label: term.label,
                    type: "term",
                    contextText: term.contextText,
                  })
                }
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function MenuItemCard({
  item,
  onExplain,
}: {
  item: MenuItem;
  onExplain: () => void;
}) {
  return (
    <article className="rounded-2xl bg-[var(--background)] p-4">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          onClick={onExplain}
          className="text-left text-lg font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {item.name}
        </button>
        {item.price ? <span className="text-sm font-medium">{item.price}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{item.description}</p>
    </article>
  );
}

function GlossaryChip({
  term,
  onPress,
}: {
  term: GlossaryTerm;
  onPress: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="rounded-full border border-[var(--border)] bg-[var(--background)] px-4 py-3 text-sm font-medium"
    >
      {term.label}
    </button>
  );
}
