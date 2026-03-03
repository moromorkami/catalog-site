# Project rules for Codex

## Goal
Build a product catalog website (MVP) with:
- categories tree
- product page with tabs: Supplier photos / QC photos
- admin area for adding products and uploading images

## Working agreements
- Always run: npm run lint (and fix issues) after code changes.
- Always run: npm run dev only when needed; do not leave servers running in background.
- Prefer simple implementations over complex abstractions.
- Do not add heavy dependencies without explaining why.

## Safety
- Do not run destructive commands (rm, del, format) without explicit confirmation.