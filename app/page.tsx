import { ImageCapture } from "@/components/ImageCapture";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col px-5 py-8">
      <section className="pt-10">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Menu-reading utility
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--foreground)]">
          Menu Snap
        </h1>
        <p className="mt-4 max-w-sm text-base leading-7 text-[var(--muted)]">
          Take one menu photo and view a cleaner, easier-to-read version of the menu.
        </p>
      </section>

      <section className="mt-8 flex-1">
        <ImageCapture />
      </section>
    </main>
  );
}
