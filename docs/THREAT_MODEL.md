# SmartReceipt Mobile Threat Model

| Threat | Risk | Current control |
|---|---|---|
| Malicious imported file reference | High | Treat references as opaque values; validate supported type/size at the UI boundary; never use user filenames as paths or commands. |
| OCR/XSS text injection | Medium | Render all extracted/user text through React Native `Text`; do not evaluate or render HTML. |
| Duplicate or anomaly misinterpretation | Medium | Warnings are explainable, reviewable, and never automatic rejection or fraud claims. |
| Accidental data loss | High | Draft state, confirmation dialogs, archive semantics, and local persistence transitions. |
| SQL/query injection | High | Receipt domain state does not build SQL from user values; managed server boundaries remain typed and parameterized. |
| External data leakage | High | Core receipt processing does not call external OCR/LLM services; no raw content is logged. |
| Unsupported security claims | High | Mobile adaptation documents the absence of Tauri/SQLCipher/native OCR guarantees and exposes safe fallbacks instead of claiming them. |

## Future native hardening

A production native build should add OS keychain-backed secrets, encrypted local storage, native image magic-byte and pixel-count validation, camera permission flow, native OCR, encrypted backup manifests, and signed release artifacts. Those controls require native modules or the desktop Tauri target and are intentionally not fabricated in Expo Preview.
