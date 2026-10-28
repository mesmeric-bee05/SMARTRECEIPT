# SmartReceipt Mobile — Implementation & Design Plan

## Product direction

SmartReceipt is an offline-first mobile receipt intelligence workspace for small retail businesses. The first delivery prioritizes the complete core workflow—import/capture, validation, preprocessing state, OCR/extraction review, correction, arithmetic validation, local persistence, price history, anomaly warnings, duplicate candidates, search, reports, and settings—before optional advanced visualization. The uploaded engineering specification is desktop-oriented (Tauri + Python sidecar), while this task explicitly targets Webdev Mobile. The mobile implementation preserves the specification’s boundaries and security intent using Expo/React Native/TypeScript, local device storage, typed domain services, and capability-safe native APIs; it does not claim that Tauri, Python/OpenCV, Tesseract, SQLCipher, or WebGL are running inside the Expo preview.

## Mobile architecture

- `app/` contains Expo Router screens and tab navigation.
- `components/` contains reusable mobile UI primitives and domain cards.
- `lib/smartreceipt/` contains typed domain models, seeded demo data, local repository logic, normalization, total validation, duplicate scoring, and anomaly analysis.
- `hooks/` contains screen state and local persistence hooks.
- `drizzle/` remains available for the generated starter’s managed server schema, but receipt data is intentionally kept in a local-first AsyncStorage repository for this mobile prototype so core flows remain available without network access.
- `server/` is retained as the fixed starter API boundary; the receipt workflow does not depend on it.
- `docs/` records the mobile adaptation, threat model, data model, and OCR limitations honestly.

The repository will not store receipt images, raw OCR, credentials, or generated binary artifacts. Imported image URIs are treated as opaque local references, never interpolated into SQL or paths, and user-entered OCR values are rendered as ordinary text.

## Domain behavior

The local repository models receipts, receipt items, products, price observations, anomaly warnings, duplicate candidates, validation results, audit events, and app settings. Monetary values use integer minor units (`amountCents`) plus an explicit currency code. Receipts move through `draft`, `processing`, `review`, `verified`, and `flagged` states. A receipt can be saved as a draft, reviewed and corrected, validated, and then finalized; warnings never silently reject or delete a record.

The demo OCR adapter is intentionally transparent: on mobile it provides a local extraction-review artifact from the bundled fixture and the entered receipt context, while the UI clearly labels confidence and requires confirmation. The service boundary is designed so a future native OCR module can replace the adapter without changing the review, validation, persistence, or analytics surfaces. No external OCR or LLM call is made by default.

Anomaly analysis is explainable and conservative: fewer than five prior observations produce an informational insufficient-history state; otherwise the engine compares the new unit price with the prior median and MAD, produces a warning only when the robust score crosses the configured threshold, and includes the baseline, sample size, score, and explanation. Total validation compares quantity × unit price + tax − discount with the stated total using a small currency-aware tolerance. Duplicate detection combines normalized merchant/date/total attributes with a deterministic image-reference similarity signal and returns reasons for human review.

## Screen and interaction plan

1. **Overview**: greeting, offline badge, spend summary, review queue, anomaly pulse, recent receipts, and a restrained “signal field” visualization that communicates activity without making 3D necessary.
2. **Receipts**: searchable receipt history with filter chips, status badges, totals, and tap-through details.
3. **Import / Review**: camera/library/file entry where available, validation feedback, processing stages, extracted fields, editable items, confidence badges, validation summary, save draft, rerun, and finalize.
4. **Insights**: anomaly center, price history cards, trend visualization, duplicate candidates, and readable explanations.
5. **Settings**: business profile, default currency, motion preference, privacy controls, export/backup affordances, diagnostics, and local data inventory.
6. **Receipt detail modal/screen**: original receipt metadata, line items, validation checks, anomaly/duplicate warnings, audit timeline, and reversible archive/delete confirmation.

All primary controls are at least 44pt high, use accessible labels, use icons from the installed icon set rather than emojis, and have text alternatives. Empty, loading, success, warning, and error states are explicit. Reduced-motion mode disables non-essential animation; all essential values remain available as text and tables.

## Design system

Three candidate directions were considered:

- **Graphite Ledger / restrained data-dense finance** — probability 0.07.
- **Warm paper studio / editorial receipt archive** — probability 0.06.
- **Emerald operations console / utilitarian supply intelligence** — probability 0.04.

**Chosen direction: Graphite Ledger.**

- **Design movement:** dark financial dashboard with tactile receipt-paper surfaces and a restrained instrument-panel rhythm.
- **Core principles:** clarity before decoration; warnings explain themselves; local confidence feels calm; motion signals state rather than competing with data.
- **Color philosophy:** graphite and ink create a quiet workspace, warm paper surfaces reference the source document, amber is reserved for review attention, emerald means verified, and red is only for actionable errors.
- **Layout paradigm:** stacked mobile ledger with a persistent bottom rail, edge-aligned summary cards, and horizontal “evidence strips” that let a user scan without opening every detail.
- **Signature elements:** warm-paper receipt cards with torn-edge visual separators; an amber “signal line” showing review pressure; a compact activity constellation using layered dots instead of decorative 3D.
- **Interaction philosophy:** every warning provides a reason and next action; destructive actions are reversible or confirmed; review fields preserve original OCR beside the corrected value.
- **Animation:** 180–240ms fade/translate for screen content, springy 300/30 panel transitions, subtle pulsing only for unresolved warnings, and no looping motion when reduced motion is enabled.
- **Typography system:** use the platform system sans for reliable offline rendering, with strong numeric hierarchy, compact uppercase metadata labels, and generous line-height for receipt values.
- **Brand essence:** “quiet intelligence for every receipt” for small retail operators; precise, reassuring, practical.
- **Brand voice:** direct and non-judgmental. Example lines: “Review the signal before it becomes a surprise.” and “Saved locally. Ready when you are.”
- **Wordmark/logo:** a compact receipt slip mark with a single amber scan line crossing a graphite square; bundled natively and used consistently in the header and icon.
- **Signature brand color:** `#F4B860` warm amber.

## Delivery workflow

1. Replace the starter home screen and tabs with the SmartReceipt information architecture.
2. Add typed local domain data and persistence helpers.
3. Implement receipt import/review/finalization and seed a realistic local dataset so the dashboard is meaningful on first launch.
4. Implement receipt history, insights, detail, and settings workflows.
5. Add the mobile-safe motion and data visualizations with reduced-motion and low-power fallbacks.
6. Add documentation, tests for domain calculations and repository behavior, and an explicit security/threat-model note.
7. Run database setup required by the starter, TypeScript diagnostics, lint, tests, Metro/API startup, and mobile web preview checks. Fix actionable errors before delivery.

## Known boundaries

Camera capture, native OCR engines, SQLCipher, OS keychains, and encrypted binary backups require native modules or a future native build configuration not present in the fixed Expo starter. The app therefore exposes honest local-first interfaces and safe fallback behavior rather than fabricating unsupported guarantees. The mobile implementation is the operational prototype; the specification’s Tauri/Python packaging remains a future desktop target.
