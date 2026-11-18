# Starter Kit Demo Package (`starter-kit/`)

This directory contains optional demo pages, sample blog posts, portfolio case studies, sample assets, demo navigation, and demo dictionary keys separated cleanly from the upstream core (`src/`) and client workspace (`client/`).

## Commands

Install the full demo kit into your client workspace:
```bash
npm run starter:seed -- --yes
```

Install selective pieces only:
```bash
npm run starter:seed -- --pages --nav --messages --yes
npm run starter:seed -- --blog --projects --assets --messages --yes
```

Remove seeded demo items and return to a clean minimal base (preserves `home` and any custom client pages/posts):
```bash
npm run starter:seed -- --clean --yes
```
