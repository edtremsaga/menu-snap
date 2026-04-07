"use client";

import Image from "next/image";

interface MenuPhotoViewProps {
  imagePreviewDataUrl: string;
}

export function MenuPhotoView({ imagePreviewDataUrl }: MenuPhotoViewProps) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-sm">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl">
        <Image
          src={imagePreviewDataUrl}
          alt="Uploaded menu"
          fill
          unoptimized
          className="object-contain"
        />
      </div>
    </div>
  );
}
