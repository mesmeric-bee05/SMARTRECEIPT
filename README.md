# SmartReceipt Mobile

Offline-first receipt review and price intelligence for small retail businesses.

This project is the mobile adaptation of the uploaded SmartReceipt proposal and engineering implementation specification. It is built with the managed Expo/React Native/TypeScript starter. The core flow is local-first: review a receipt, validate it, save it, and understand price signals without a mandatory cloud dependency.

## Core workflow

Import → Process → Review → Validate → Save → Analyze → Search → Report

## Implementation notes

The source specification is desktop-oriented and names Tauri, Python, OpenCV, OCR engines, SQLite, and SQLCipher. The current Webdev Mobile build preserves the same domain boundaries and safety requirements using Expo-compatible local persistence and a replaceable extraction adapter. It does not claim that desktop sidecars or native OCR engines are bundled into Expo Preview.

## Commands

```bash
pnpm db:push
pnpm check
pnpm lint
pnpm test
pnpm dev
```

Receipt images, raw OCR output, credentials, database files, and generated binaries must not be committed.
