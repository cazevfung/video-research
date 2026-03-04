# Directory Structure Guide

This document defines the directory structure for the YouTube Batch Summary Service and serves as a reference for where files should be placed.

## 📁 Root Structure

```
youtube-summary-service/
├── backend/          # Node.js/TypeScript backend service
├── frontend/         # Next.js 14+ frontend application
├── docs/             # All documentation, PRDs, planning, and investigation docs
├── shared/           # Shared types/utilities between frontend and backend
├── .gitignore
└── README.md
```

## 📋 Documentation Convention

**IMPORTANT:** All planning, investigation, PRD, and documentation files MUST be placed in the `docs/` folder. Do not scatter documentation across the codebase.

- ✅ Planning documents → `docs/`
- ✅ PRDs → `docs/`
- ✅ Investigation notes → `docs/`
- ✅ API specifications → `docs/`
- ✅ Architecture decisions → `docs/`
- ❌ Do NOT create README files in subdirectories (unless absolutely necessary)
- ❌ Do NOT create planning docs in `backend/` or `frontend/` folders

---

## 🔧 Backend Structure (`backend/`)

```
backend/
├── src/
│   ├── config/              # Configuration management
│   │   ├── index.ts         # Main config loader (reads config.yaml)
│   │   ├── database.ts      # MongoDB connection
│   │   ├── env.ts           # Environment variables validation
│   │   └── passport.ts      # Passport.js authentication config
│   │
│   ├── prompts/             # AI Prompt Templates ⭐
│   │   ├── index.ts         # Prompt loader/manager
│   │   ├── pre-condense.prompt.ts    # For qwen-flash (long video condensation)
│   │   ├── final-summary.prompt.ts   # For qwen-plus (final aggregation)
│   │   └── templates/                # Optional: preset-specific prompt variants
│   │       ├── detailed.prompt.ts
│   │       ├── bullet-points.prompt.ts
│   │       ├── tutorial.prompt.ts
│   │       └── tldr.prompt.ts
│   │
│   ├── models/              # MongoDB schemas/models
│   │   ├── User.ts
│   │   └── Summary.ts
│   │
│   ├── routes/              # Express/Fastify route handlers
│   │   ├── auth.routes.ts
│   │   ├── summarize.routes.ts
│   │   ├── history.routes.ts
│   │   └── status.routes.ts
│   │
│   ├── controllers/         # Business logic handlers
│   │   ├── auth.controller.ts
│   │   ├── summary.controller.ts
│   │   └── history.controller.ts
│   │
│   ├── jobs/                # Scheduled jobs
│   │   └── resetCredits.job.ts
│   │
│   ├── services/            # Core business logic
│   │   ├── transcript.service.ts    # Supadata integration
│   │   ├── ai.service.ts             # Qwen API integration (flash & plus)
│   │   ├── summary.service.ts        # Main pipeline orchestration
│   │   ├── quota.service.ts          # Credit/quota management
│   │   └── job.service.ts            # Job scheduling service
│   │
│   ├── middleware/          # Express/Fastify middleware
│   │   ├── auth.middleware.ts       # JWT validation
│   │   ├── quota.middleware.ts      # Rate limiting/quotas
│   │   ├── rateLimit.middleware.ts   # Rate limiting middleware
│   │   └── error.middleware.ts      # Error handling
│   │
│   ├── utils/               # Helper functions
│   │   ├── validators.ts    # URL validation, etc.
│   │   ├── logger.ts        # Logging utility
│   │   ├── sse.ts           # SSE helper functions
│   │   └── errors.ts        # Error utilities
│   │
│   ├── types/               # TypeScript type definitions
│   │   ├── auth.types.ts
│   │   └── summary.types.ts
│   │
│   └── server.ts            # Main entry point
│
├── config.yaml              # System configuration (pricing, limits)
├── scripts/                 # Build/utility scripts
│   └── copy-prompts.js      # Script to copy prompts to dist
├── package.json
├── tsconfig.json
├── nodemon.json
└── .env.example
```

### Backend File Placement Rules

- **Configuration files** → `src/config/`
- **AI Prompts** → `src/prompts/` (this is a dedicated folder for easy prompt management)
- **Database models** → `src/models/`
- **API routes** → `src/routes/`
- **Request handlers** → `src/controllers/`
- **Scheduled jobs** → `src/jobs/`
- **Business logic** → `src/services/`
- **Middleware** → `src/middleware/`
- **Utility functions** → `src/utils/`
- **Type definitions** → `src/types/`
- **Build scripts** → `scripts/`
- **Root config files** → `backend/` (package.json, tsconfig.json, etc.)

---

## 🎨 Frontend Structure (`frontend/`)

```
frontend/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Landing page (/)
│   │   ├── login/
│   │   │   └── page.tsx     # Login page
│   │   └── app/
│   │       ├── layout.tsx   # Protected layout with auth check
│   │       ├── page.tsx     # Main dashboard (/app)
│   │       └── history/
│   │           └── page.tsx # History/library page
│   │
│   ├── components/          # React components
│   │   ├── ui/              # Reusable UI primitives
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   └── Card.tsx
│   │   │
│   │   ├── dashboard/       # Dashboard-specific components
│   │   │   ├── UrlInputArea.tsx
│   │   │   ├── ControlPanel.tsx
│   │   │   ├── WhimsicalLoader.tsx
│   │   │   ├── MarkdownStreamer.tsx
│   │   │   └── ResultCard.tsx
│   │   │
│   │   └── history/         # History page components
│   │       └── SummaryGrid.tsx
│   │
│   ├── hooks/               # Custom React hooks
│   │   ├── useSummaryStream.ts    # SSE connection hook
│   │   ├── useAuth.ts             # Authentication hook
│   │   └── useHistory.ts          # History data fetching
│   │
│   ├── lib/                 # Utility libraries
│   │   ├── api.ts           # API client functions
│   │   ├── auth.ts          # Auth helpers (JWT storage)
│   │   └── utils.ts         # General utilities
│   │
│   ├── types/               # TypeScript types
│   │   ├── api.types.ts
│   │   └── summary.types.ts
│   │
│   └── styles/              # Global styles
│       └── globals.css      # Tailwind imports + custom CSS
│
├── public/                  # Static assets
│   └── images/
│
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

### Frontend File Placement Rules

- **Pages/Routes** → `src/app/` (follows Next.js App Router conventions)
- **Reusable UI components** → `src/components/ui/`
- **Feature-specific components** → `src/components/{feature}/` (e.g., `dashboard/`, `history/`)
- **Custom hooks** → `src/hooks/`
- **API clients & utilities** → `src/lib/`
- **Type definitions** → `src/types/`
- **Global styles** → `src/styles/`
- **Static assets** → `public/`
- **Config files** → `frontend/` root (next.config.js, tailwind.config.js, etc.)

---

## 🔗 Shared Structure (`shared/`)

```
shared/
├── types/                   # Shared TypeScript types
│   ├── summary.types.ts     # Summary request/response types
│   ├── api.types.ts         # Common API types
│   └── user.types.ts        # User-related types
│
└── constants/               # Shared constants
    └── presets.ts           # Preset style definitions
```

### Shared File Placement Rules

- **Types used by both frontend and backend** → `shared/types/`
- **Constants used by both** → `shared/constants/`
- Import from shared in both frontend and backend to maintain type consistency

---

## 📝 Documentation Structure (`docs/`)

```
docs/
├── backend_prd.md           # Backend Product Requirements Document
├── frontend_prd.md          # Frontend Product Requirements Document
├── directory_structure.md   # This file - directory structure guide
├── api_specification.md     # API endpoint documentation (future)
├── architecture.md          # System architecture decisions (future)
└── investigation/           # Investigation notes (future)
    └── ...
```

### Documentation File Placement Rules

- **All PRDs** → `docs/`
- **All planning documents** → `docs/`
- **All investigation notes** → `docs/` (optionally in `docs/investigation/`)
- **API specifications** → `docs/`
- **Architecture decisions** → `docs/`
- **This directory structure guide** → `docs/directory_structure.md`

---

## 🎯 Quick Reference: Where Should I Put This File?

| File Type | Location |
|-----------|----------|
| AI Prompt Template | `backend/src/prompts/` |
| Database Model | `backend/src/models/` |
| API Route Handler | `backend/src/routes/` |
| Scheduled Job | `backend/src/jobs/` |
| Business Logic | `backend/src/services/` |
| Middleware | `backend/src/middleware/` |
| Utility Function | `backend/src/utils/` or `frontend/src/lib/` |
| Type Definition | `backend/src/types/`, `frontend/src/types/`, or `shared/types/` |
| React Component (UI) | `frontend/src/components/ui/` |
| React Component (Feature) | `frontend/src/components/{feature}/` |
| Next.js Page | `frontend/src/app/{route}/page.tsx` |
| Custom Hook | `frontend/src/hooks/` |
| Planning Document | `docs/` |
| PRD | `docs/` |
| Investigation Notes | `docs/` |

---

## ✅ Best Practices

1. **Keep prompts organized**: All AI prompts go in `backend/src/prompts/` for easy management and versioning.

2. **Documentation centralization**: All planning, PRDs, and investigation docs go in `docs/` - never scatter them.

3. **Type safety**: Use `shared/types/` for types that both frontend and backend need.

4. **Separation of concerns**: 
   - Routes define endpoints
   - Controllers handle HTTP logic
   - Services contain business logic
   - Models define data structures

5. **Component organization**:
   - Generic UI components → `components/ui/`
   - Feature-specific components → `components/{feature}/`

6. **Follow Next.js conventions**: Use the App Router structure for pages and layouts.

---

## 📌 Notes

- This structure is designed to scale as the project grows
- All folders are created with placeholder files to maintain structure
- When creating new files, always refer to this guide to ensure proper placement
- If unsure where a file should go, add it to `docs/` for discussion or follow the closest matching pattern above

