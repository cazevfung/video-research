# Video publish date – why it broke and how to verify

## Why "Unknown" happened

1. **First fix (centralized pipeline):** We fixed Supadata metadata and the summary service so `upload_date` was passed through. That only applied when metadata came from **Supadata**.
2. **Actual flow:** The app fetches metadata with **YouTube first**, then Supadata as fallback. For most videos, YouTube succeeds, so Supadata metadata is never used.
3. **Bug:** The **YouTube** metadata path did not return `upload_date`. The YouTube Data API provides `snippet.publishedAt`; we did not read it or add it to the returned metadata. So the primary path never had a date → citations showed "Unknown".

## What was fixed

- **Transcript service:** `fetchVideoMetadataFromYouTube` now reads `snippet.publishedAt`, formats it as YYYY-MM-DD, and returns it as `upload_date` on the metadata object.
- **Comment:** Above `fetchVideoMetadata()`: "Both paths must set upload_date when the API provides it."

## How to be confident it’s fixed

1. **Run a new summary or research** (existing results are unchanged).
2. **Open the result** and check the **Sources** section.
3. **Confirm** each source shows a real date (e.g. `2024-01-15` or similar), not `(duration, Unknown)`.
4. **Optional – unit tests:** Run the regression tests that lock the contract:
   - `__tests__/unit/constants/dates.test.ts` – `ensureVideoUploadDate` and `VIDEO_DATE_UNKNOWN`.
   - `__tests__/unit/services/citation-mapper.test.ts` – citation map keeps `upload_date` when present and uses the fallback only when missing.

If Sources still show "Unknown" after a **new** run, the next place to check is that the transcript service is actually returning `upload_date` (e.g. log it in `fetchTranscript` when building the result, or add an integration test that mocks YouTube + Supadata and asserts on the transcript result).
