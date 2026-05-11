# Menu Snap

Menu Snap is a mobile-first prototype for helping people read and understand restaurant menus from a single photo.

## What it does

Menu Snap takes one menu photo, runs OCR, attempts to parse the text into a simpler readable menu, and offers lightweight explanations for dish names and culinary terms. The original photo remains available as a fallback when the parsed result is incomplete.

## Project status

This project is a prototype and is currently paused. It was built to explore whether a mobile-first single-photo menu reader could be useful in practice. The main blocker was real-world OCR reliability, not the basic app shell.

## Core product principles

- Fast help over exhaustive decoding
- Simple, accurate explanations
- No recommendations
- No foodie or critic tone
- Original photo remains available as fallback
- Do not invent details when OCR is uncertain

## What it does not do

- It is not a restaurant recommendation app.
- It is not a food review or dining guide.
- It is not a guaranteed accessibility, allergy-safety, or translation system.
- It does not promise complete or production-grade menu extraction from arbitrary photos.

## Tech stack

- Next.js
- React
- TypeScript
- Tesseract.js
- Sharp
- Tailwind CSS

## Local development

Requirements:

- Node.js
- npm

Run locally:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Useful scripts:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run typecheck`

## Known limitations

The main bottleneck was real-world OCR reliability. The prototype worked best on clean, straight-on, high-contrast menu photos and became much less reliable with:

- angled photos
- dim lighting
- shadows
- dense layouts
- stylized fonts
- low contrast
- partial crops

Even when OCR recovered some text, turning that text into a consistently useful menu structure was still difficult. The app is best understood as a prototype exploration rather than a production-ready OCR product.

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE).
