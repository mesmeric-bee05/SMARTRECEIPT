# SmartReceipt Mobile

Offline-first receipt review and price intelligence for small retail businesses.

This project is the mobile adaptation of the uploaded SmartReceipt proposal and engineering implementation specification. It is built with the managed Expo/React Native/TypeScript starter. The core flow is local-first: review a receipt, validate it, save it, and understand price signals without a mandatory cloud dependency.

## Core workflow

Import → Process → Review → Validate → Save → Analyze → Search → Export

## Implementation notes

The source specification is desktop-oriented and names Tauri, Python, OpenCV, OCR engines, SQLite, and SQLCipher. The current Webdev Mobile build preserves the same domain boundaries and safety requirements using Expo-compatible local persistence and a replaceable extraction adapter. It does not claim that desktop sidecars, encrypted native storage, or a native OCR engine are bundled into Expo Preview. The current adapter is a transparent local review fixture; a production native OCR module can replace it behind the same boundary.

Local state is schema-versioned and validated on load. Corrupt state is quarantined instead of silently overwriting the ledger, writes are serialized, archived receipts can be restored, drafts upsert by identity, and user-triggered JSON export is explicitly unencrypted. Privacy mode redacts merchant and monetary summaries across the active screens.

## Commands

```bash
pnpm db:push
pnpm check
pnpm lint
pnpm test
pnpm dev
```

Receipt images, raw OCR output, credentials, database files, and generated binaries must not be committed.
