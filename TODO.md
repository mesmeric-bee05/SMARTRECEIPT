# SmartReceipt Mobile — Delivery Outcomes

## [x] Outcome 1 — Local-first app foundation and secure mobile shell

- The app opens without mandatory Internet access.
- The primary navigation exposes Overview, Receipts, Insights, and Settings in a portrait-friendly bottom rail.
- The app shows an explicit offline/local status and does not send receipt images or OCR content to an external service by default.
- Local receipt data uses typed domain models, explicit currency codes, integer minor units for money, stable internal identifiers, and safe text rendering.
- All destructive actions require a confirmation step and never silently delete or reject receipts.

## [x] Outcome 2 — Receipt import, processing state, and review

- The user can begin a receipt import from the Overview or Receipts screens.
- The app validates the selected receipt reference and presents actionable errors rather than crashing.
- Processing displays real stages rather than an artificial 100% animation: validating, preparing, extracting, reviewing, and ready.
- The review surface shows merchant, date, currency, subtotal, tax, discount, total, item descriptions, quantities, unit prices, line totals, confidence, and validation state.
- The user can edit extracted values, add or remove line items, save a draft, rerun the transparent local extraction fixture, and finalize only after required fields and arithmetic checks pass.
- User-corrected review actions are captured in the audit timeline; immutable field-level original snapshots remain a native OCR follow-up item.

## [x] Outcome 3 — Validation, persistence, history, and details

- Finalization validates itemized math against the stated total using a currency-aware tolerance and visibly reports the calculated value and delta.
- Finalized receipts are stored locally and remain available after app restart.
- Receipt history supports search and status filters and displays merchant, date, total, and review state.
- Receipt detail shows metadata, line items, validation checks, anomaly/duplicate warnings, and audit history in one readable view.
- Archive/delete actions are reversible or confirmed and do not mutate unrelated records.

## [x] Outcome 4 — Price history and explainable anomaly center

- The app maintains product-level price observations when receipts are finalized.
- The Insights screen displays price history, trend movement, observation counts, and anomaly status.
- Fewer than five prior observations produce an informational insufficient-history result rather than a high-confidence anomaly.
- With sufficient history, the app calculates a median/MAD-based score, stores the baseline method and explanation, and treats anomalies as review warnings rather than fraud findings.
- Users can mark anomaly warnings as reviewed, valid, ignored, or unresolved, and the current status remains visible.

## [x] Outcome 5 — Duplicate and consistency warnings

- The app compares new receipts with existing records using normalized merchant/date/total attributes and an additional deterministic image-reference signal.
- Possible duplicates show a similarity score and human-readable reasons.
- The app never deletes or blocks a receipt solely because a duplicate candidate exists.
- Receipt-total warnings include the calculated total, stated total, and exact difference.

## [x] Outcome 6 — Mobile-safe visual system and accessibility

- The UI uses the Graphite Ledger design direction: graphite base, warm receipt-paper panels, amber review signals, emerald verified states, and red only for actionable errors.
- Motion is restrained, state-driven, and disabled for reduced-motion preference.
- Essential information is always available as text; visualizations do not replace accessible tables or labels.
- Touch targets are suitable for one-handed use, text reflows without clipping, and empty/loading/error states are explicit.
- The app uses bundled/local assets and does not depend on remote fonts, remote images, or cloud-only UI content.

## [x] Outcome 7 — Settings, privacy, diagnostics, and recovery

- The user can configure business name, default currency, motion preference, privacy mode, and diagnostic logging preference locally.
- The settings surface explains the local data inventory and the mobile-native limitations of OCR/camera/encrypted backup capabilities.
- The app provides user-triggered JSON export without exposing raw secrets or arbitrary filesystem paths and clearly warns that the export is unencrypted; encrypted native backup remains a documented follow-up.
- Interrupted or failed processing leaves the database state valid and lets the user retry or discard the draft safely.
- Diagnostics report local repository health, record counts, and last local activity without logging receipt contents or credentials.

## [x] Outcome 8 — Engineering quality and delivery checks

- TypeScript diagnostics, linting, tests, database setup, and Metro/API startup checks pass or have an explicit documented blocker.
- Domain calculations, anomaly handling, duplicate scoring, persistence, and review transitions have deterministic test coverage.
- The project documentation states the mobile adaptation boundary and does not claim unsupported desktop-sidecar, SQLCipher, or native OCR behavior.
- Branding assets and app configuration are updated consistently before checkpointing.
