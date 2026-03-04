# Local Storage Mode (Development/Testing)

## Overview

The backend can use **local file storage** instead of Firebase Firestore for storing summaries. This makes testing much simpler - no need to set up Firebase or Firestore emulators!

> 📖 **For complete local development setup instructions, see the [Local Development Guide](../../docs/LOCAL_DEVELOPMENT_GUIDE.md)**

## How to Enable

**Option 1: Environment Variable (Recommended)**

Set in `backend/.env`:

```bash
USE_LOCAL_STORAGE=true
```

**Option 2: Config File**

Open `backend/config.yaml` and set:

```yaml
system:
  use_local_storage: true  # Enable local file storage
```

**Note:** Environment variables take precedence over `config.yaml` settings.

When enabled, summaries are saved as JSON files in the `/data` directory instead of Firestore.

## Directory Structure

```
backend/
  data/
    summaries/
      <timestamp>-<random-id>.json    # Each summary is a separate JSON file
    users/
      <user-id>.json                   # User data files (if using local user storage)
```

**Configuration:** Directory paths can be customized in `backend/config.yaml`:

```yaml
local_storage:
  data_directory: "data"              # Base directory (default: "data")
  summaries_subdirectory: "summaries"  # Summaries subdirectory (default: "summaries")
  users_subdirectory: "users"          # Users subdirectory (default: "users")
```

All paths are resolved relative to the backend project root (`process.cwd()`).

## Advantages

✅ **Zero setup required** - No Firebase configuration needed  
✅ **Easy debugging** - Open JSON files directly to inspect data  
✅ **Fast** - No network calls, instant read/write  
✅ **Version controllable** - Can commit test data if needed  
✅ **Portable** - Works offline, no cloud dependencies  

## Example Summary File

```json
{
  "id": "1704509123456-abc123",
  "user_id": "dev-user-id",
  "job_id": "f68bf7fd-a458-4551-a4a7-d25e95121768",
  "batch_title": "Heartopia Game Analysis",
  "source_videos": [
    {
      "url": "https://www.youtube.com/watch?v=rT1ZtsSkiw0",
      "title": "I'm OBSESSED with this game!!⭐Heartopia",
      "channel": "froggycrossing",
      "thumbnail": "https://i.ytimg.com/vi/rT1ZtsSkiw0/maxresdefault.jpg",
      "duration_seconds": 575,
      "word_count": 1634,
      "was_pre_condensed": false
    }
  ],
  "preset_style": "deep_dive",
  "final_summary_text": "# Deep Dive: Heartopia – A Comprehensive Analysis...",
  "language": "English",
  "processing_stats": {
    "total_videos": 3,
    "condensed_videos": 0,
    "total_tokens_used": 8567,
    "processing_time_seconds": 107.45
  },
  "created_at": "2026-01-06T04:31:34.125Z",
  "updated_at": "2026-01-06T04:31:34.125Z"
}
```

## Switching to Firestore

To use Firestore instead of local storage, open `backend/config.yaml` and set:

```yaml
system:
  use_local_storage: false  # Disable local storage, use Firestore
```

Then configure Firestore:

### Option 1: Use Firestore Emulator (Recommended for Development)
```bash
# In .env
FIRESTORE_EMULATOR_HOST=localhost:8080

# In separate terminal
npx firebase emulators:start --only firestore
```

### Option 2: Use Production Firestore
```bash
# In .env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

## API Compatibility

The local storage implementation maintains **100% API compatibility** with Firestore. All endpoints work exactly the same way:

- `POST /api/summarize` - Creates summary
- `GET /api/history` - Lists summaries  
- `GET /api/summaries/:id` - Gets specific summary
- All pagination, filtering, and sorting work identically

## Testing

Test the local storage implementation:

```bash
cd backend
npm run test:api
```

Select option 3 (Create Summary Job) and submit some YouTube URLs. The summary will be saved to `backend/data/summaries/` as a JSON file!

## Development Tools

The backend includes several scripts to help with local development:

### Setup Script

Initialize local development environment:

```bash
npm run dev:setup
```

Creates required directories and validates configuration.

### Reset Script

Clear all local test data:

```bash
npm run dev:reset

# With backup
npm run dev:reset -- --backup
```

### Seed Script

Generate sample test data:

```bash
npm run dev:seed

# Generate specific number of summaries
npm run dev:seed -- 10
```

### Validation Script

Validate local development configuration:

```bash
npm run dev:validate
```

## Configuration Centralization

All local storage configuration is centralized:

- **Paths:** `backend/src/config/index.ts` → `getLocalStorageConfig()`
- **Storage Mode:** `backend/src/config/index.ts` → `useLocalStorage()`
- **Directory Resolution:** `backend/src/config/index.ts` → `getSummariesDirectory()`, `getUsersDirectory()`

No hardcoded paths - all values come from environment variables or `config.yaml`.

## Notes

- The `/data` directory is git-ignored by default
- Local storage is **only for development/testing**
- Production deployments should always use Firestore
- File IDs are timestamp-based for easy sorting
- All configuration values are centralized (no hardcoded paths)

## Related Documentation

- [Local Development Guide](../../docs/LOCAL_DEVELOPMENT_GUIDE.md) - Complete setup and troubleshooting guide
- [Backend README](./README.md) - General backend documentation
- [Configuration Guide](../../docs/local_development_environment_prd.md) - Detailed configuration reference

