# Frontend - YouTube Batch Summary Service

This is the Next.js 14+ frontend application for the YouTube Batch Summary Service.

## Phase 1: Project Setup & Foundation ✅

Phase 1 has been completed with the following setup:

### Project Structure

```
frontend/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   │   └── ui/          # Base UI components (Button, Input, Card, Toast)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utility libraries
│   ├── styles/          # Global styles
│   └── types/           # TypeScript type definitions
├── public/              # Static assets
├── tailwind.config.ts   # Tailwind CSS configuration
├── tsconfig.json        # TypeScript configuration
└── package.json         # Dependencies
```

### Installed Dependencies

**Core:**
- Next.js 16.1.1
- React 19.2.3
- TypeScript 5

**Styling:**
- Tailwind CSS 3.4.19
- @tailwindcss/typography
- clsx & tailwind-merge

**Icons & Animation:**
- lucide-react
- framer-motion

**UI Components:**
- @radix-ui/react-tooltip
- @radix-ui/react-accordion
- @radix-ui/react-toggle-group
- @radix-ui/react-dropdown-menu
- @radix-ui/react-alert-dialog
- @radix-ui/react-progress

**Utilities:**
- react-markdown & remark-gfm
- zod
- date-fns

### Configuration

- **Tailwind CSS:** Configured with dark mode (`class` mode), monochrome slate palette
- **TypeScript:** Strict mode enabled with path aliases (`@/*` → `./src/*`)
- **Dark Mode:** Enabled by default via `dark` class on `<html>` element
- **Fonts:** Inter and JetBrains Mono via Next.js font optimization

### Base UI Components

All components are located in `src/components/ui/`:

- **Button:** Reusable button with variants (default, outline, ghost) and sizes
- **Input:** Text input with dark mode styling
- **Card:** Card container with Header, Title, Description, Content, Footer sub-components
- **Toast:** Toast notification component (basic implementation)

### Environment Variables

Copy `env.example` to `.env.local` and configure:

**For Local Development:**

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:5000

# Skip authentication (for local dev)
NEXT_PUBLIC_SKIP_AUTH=true

# Development User Configuration (must match backend DEV_USER_ID)
NEXT_PUBLIC_DEV_USER_ID=dev-user-id
NEXT_PUBLIC_DEV_USER_EMAIL=dev@example.com
NEXT_PUBLIC_DEV_USER_NAME=Development User

# Firebase Auth (disabled for local dev)
NEXT_PUBLIC_USE_FIREBASE_AUTH=false
```

**Important:** `NEXT_PUBLIC_DEV_USER_ID` must match `DEV_USER_ID` in backend `.env` for history to work correctly.

**For Production:**

```env
NEXT_PUBLIC_API_URL=https://your-cloud-run-url.run.app
NEXT_PUBLIC_SKIP_AUTH=false
NEXT_PUBLIC_USE_FIREBASE_AUTH=true
# Share Feature Configuration
NEXT_PUBLIC_FRONTEND_URL=https://video-research-40c4b.web.app
# ... Firebase configuration
```

> 📖 **For complete local development setup, see the [Local Development Guide](../../docs/LOCAL_DEVELOPMENT_GUIDE.md)**

### Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Local Development

### Quick Start

1. **Configure environment:**
   ```bash
   cp env.example .env.local
   # Edit .env.local with your settings
   ```

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Verify setup:**
   - Open `http://localhost:3000`
   - Look for development mode indicator (yellow badge) in bottom-right corner
   - Check browser console for any errors

### Configuration

All frontend configuration is centralized in `src/config/`:

- **Environment:** `src/config/env.ts` - Environment detection and dev user config
- **API:** `src/config/api.ts` - API endpoints and base URL
- **Visual Effects:** `src/config/visual-effects.ts` - Animation and styling configs
- **Streaming:** `src/config/streaming.ts` - SSE streaming configuration

**No hardcoded values** - all configuration comes from environment variables or centralized config files.

### Development Mode Detection

The frontend automatically detects development mode from:
- `NODE_ENV === 'development'`
- `NEXT_PUBLIC_DEV_MODE === 'true'`
- API URL contains `localhost`

When in development mode:
- Development mode indicator is displayed
- Authentication can be skipped (`NEXT_PUBLIC_SKIP_AUTH=true`)
- Dev user is used instead of real authentication

### Troubleshooting

For common issues and troubleshooting, see the [Local Development Guide](../../docs/LOCAL_DEVELOPMENT_GUIDE.md#troubleshooting).

**Common Issues:**

- **History page empty:** Ensure `NEXT_PUBLIC_DEV_USER_ID` matches backend `DEV_USER_ID`
- **API connection failed:** Check `NEXT_PUBLIC_API_URL` points to running backend
- **CORS errors:** Verify backend `FRONTEND_URL` includes `http://localhost:3000`

## Share Feature (Phase 4)

The share feature allows users to generate persistent, reusable shareable links for their research summaries.

**Features:**
- Share button in research summary view
- Persistent share links (reusable for same research)
- Public read-only view at `/shared/[shareId]`
- Environment-aware URL generation (dev vs. production)

**Configuration:**
- `NEXT_PUBLIC_FRONTEND_URL` - Frontend URL for share link generation (optional)
- Development: Defaults to `http://localhost:3000/shared`
- Production: Uses `NEXT_PUBLIC_FRONTEND_URL` or `window.location.origin`

**Firebase Hosting:**
- Configured in `firebase.json` with rewrites for `/shared/*` routes
- Includes caching headers for shared pages

**Routes:**
- `/shared/[shareId]` - Public shared research page (no authentication required)

For complete share feature documentation, see [`docs/SHARE_FEATURE_PRD.md`](../docs/SHARE_FEATURE_PRD.md).

### Next Steps

Phase 1 is complete. Ready to proceed with:
- Phase 2: Basic Routing & App Layout
- Phase 3: Core Dashboard Components
- Phase 4: State Management & API Integration

See `docs/frontend_implementation_plan.md` for the complete implementation plan.
