# Button placement: Option A vs Option B

## Option A — Buttons inside the result card (same line as content, then sticky)

The Copy / Share / Export buttons stay in the **main content area**, on the same row as the title. When you scroll, **that whole row** sticks to the top of the card.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Get Summary   Smart Research     [Theme] [English] [History] Guest │  ← header (no buttons)
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────┐
│  [Circular area]   │  DeepSeek R1...             │  ┌─────────────────────┐
│  Summary completed!│  1 Video • Feb 5, 2026      │  │ Copy  Share  Export │← "same line" as title
│  100% complete      │                            │  └─────────────────────┘   ← rectangular area (right)
│                     │  ──────────────────────────│
│                     │  Source Videos             │
│                     │  [video card]              │
│                     │                            │
│                     │  Article body...           │   (when you scroll down,
│                     │  ...                       │    the title + buttons
│                     │  ...                       │    row STICKS here)
└──────────────────────────────────────────────────┘
```

- **Rectangular area:** The right-hand block inside the card (same row as the title).
- **Same line:** Buttons are on the same horizontal line as the title and “1 Video Analyzed…”
- **Sticky:** When you scroll the page, that top row (title + buttons) stays fixed at the top of the card.

---

## Option B — Buttons in the header (always at top)

The Copy / Share / Export buttons move to the **top bar** of the app, next to Theme, Language, History, Guest. They are always at the top; the “rectangular area” is in the header.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Get Summary   Smart Research   [Theme] [English] [History] ┌──────┐ │
│                                                                    │ Copy │ │  ← buttons in header
│                                                                    │Share │ │  ← rectangular area
│                                                                    │Export│ │
│                                                                    └──────┘ Guest
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  [Circular area]   │  DeepSeek R1...                                       │
│  Summary completed!│  1 Video • Feb 5, 2026   (no buttons here)            │
│  100% complete      │  Source Videos                                         │
│                     │  [video card]                                          │
│                     │  Article body...                                       │
└─────────────────────────────────────────────────────────────────────────────┘
```

- **Rectangular area:** The empty slot in the **header** (top-right), next to Guest.
- **Same line:** The header is the “line” — buttons are in the same top strip as the rest of the nav.
- **Sticky:** The header is already sticky, so the buttons are always visible at the top when you scroll.

---

## Summary

| | Option A | Option B |
|---|----------|----------|
| **Where are the buttons?** | Inside the result card, on the right of the title row | In the app header, top-right (next to Guest) |
| **“Same line”** | Same row as the title and “1 Video Analyzed…” | Same strip as the header (Theme, Language, etc.) |
| **Sticky** | The title+buttons row sticks to the top of the **card** when you scroll | Buttons are in the header, so they’re always at the **top of the page** |

Tell me which option (or mix) you want and we can implement that.
