# SmartReceipt Mobile Adaptation

The uploaded engineering specification targets a Tauri 2 desktop shell with a Python/OpenCV/OCR sidecar. This repository is being implemented as the explicitly requested Webdev Mobile application, so the same domain responsibilities are preserved with Expo-compatible boundaries.

## Preserved responsibilities

- Local-first receipt data and explicit currency-safe monetary representation.
- Secure import boundary, review-before-finalization, explainable validation, anomaly warnings, duplicate candidates, audit events, search, and reports.
- Typed extraction and analytics services isolated from presentation components.
- No mandatory external network dependency for the core workflow.
- Reduced-motion and low-power fallbacks.

## Mobile implementation choices

- Expo Router + React Native + TypeScript for the presentation layer.
- AsyncStorage repository for the prototype’s local-first data path; the fixed starter’s server/database adapter remains available but is not required by receipt processing.
- A transparent local extraction adapter with a replaceable interface. Native camera/document OCR can be added later as a platform-specific module; the app does not pretend that Tesseract, RapidOCR, OpenCV, or SQLCipher are available in the current fixed starter.
- No arbitrary filesystem paths are accepted from UI state; imported references are opaque values and are not used to construct commands or SQL.
- Text is rendered through React Native components and is never interpreted as HTML.

## Security posture

Receipt content is treated as sensitive business information. The app uses local-only sample data, typed state, explicit confirmation for destructive actions, safe identifiers, no raw content logging, and no default external OCR or AI call. The mobile prototype documents the remaining native-build gaps rather than claiming desktop-grade OS keychain or SQLCipher guarantees that are not present in the fixed Expo runtime.

## Delivery evidence

The current checkpoint has passed TypeScript diagnostics, Expo lint, 30 deterministic tests (plus one pre-existing skipped auth test), the starter database setup, the server production build, and portrait preview interaction checks for import, staged processing, review, finalization, dashboard, and detail views. The remaining native-only items are intentionally kept visible in Outcome 7 rather than marked as complete.
