# History Page & Date Parsing Fix Plan

## Overview
This document outlines a comprehensive plan to fix critical issues preventing the history page from loading and causing date parsing errors.

## Issues Identified

### Issue 1: History API 500 Error
**Symptoms:**
- `GET /api/history?page=1&limit=20` returns 500 Internal Server Error
- Error message: "Failed to retrieve history"
- History page fails to load any data

**Root Causes:**
1. **Date Sorting Failure**: In `backend/src/storage/local-summary.storage.ts` (lines 326-330), the code sorts summaries by `created_at` but doesn't handle invalid dates gracefully
2. **Missing Date Validation**: The `created_at` field might be null, undefined, or an invalid date string in some summary files
3. **Date Type Mismatch**: The code tries to handle both string and Date types but the conversion might fail

### Issue 2: Invalid Time Value Error
**Symptoms:**
- `RangeError: Invalid time value` in frontend
- Error occurs when trying to format dates using `date-fns` `format()` function
- Affects multiple components: `SummaryCard`, `SummaryDetailView`, `ResultCard`, `cardSizeCalculator`

**Root Causes:**
1. **Unsafe Date Parsing**: Components call `format(new Date(summary.created_at), 'PPp')` without validating the date first
2. **Null/Undefined Dates**: Some summaries might have `created_at` as null or undefined
3. **Invalid Date Strings**: Some dates might be in an invalid format that `new Date()` can't parse

### Issue 3: Transition Issue from Summary to History
**Symptoms:**
- User suspects issue when transitioning from summary finished state to history page
- History page fails to load after summary completion
- Possible race condition or state management issue

**Root Causes:**
1. **Date Format Mismatch**: When summary completes, the `created_at` field in the SSE response might be a Date object (line 1131 in `summary.service.ts`), but the frontend expects a string
2. **State Not Cleared**: The summary stream state might interfere with history page loading
3. **Navigation Timing**: History page might be trying to load before the summary is fully saved

### Issue 4: Controlled/Uncontrolled Component Warning
**Symptoms:**
- React warning: "Switch is changing from uncontrolled to controlled"
- Components should not switch from controlled to uncontrolled (or vice versa)

**Root Causes:**
1. **Initial Value Issue**: A Switch component is initialized with `undefined` or `null` and later receives a value
2. **Missing Default Props**: Component doesn't have a default value for controlled state

---

## Fix Strategy

### Phase 1: Backend Date Handling Fixes

#### 1.1 Fix Date Sorting in Local Storage
**Location**: `backend/src/storage/local-summary.storage.ts`
**Lines**: 326-330

**Current Code:**
```typescript
allSummaries.sort((a, b) => {
  const dateA = typeof a.created_at === 'string' ? new Date(a.created_at) : a.created_at;
  const dateB = typeof b.created_at === 'string' ? new Date(b.created_at) : b.created_at;
  return new Date(dateB as any).getTime() - new Date(dateA as any).getTime();
});
```

**Issues:**
- Doesn't handle null/undefined dates
- Doesn't validate if date is valid before using `getTime()`
- Double conversion (already converted to Date, then converted again)

**Fix:**
- Add helper function to safely parse dates
- Handle null/undefined dates (treat as oldest)
- Validate dates before sorting
- Add error handling for invalid dates

#### 1.2 Fix Date Validation in Summary Model
**Location**: `backend/src/storage/local-summary.storage.ts`
**Function**: `validateSummaryFile()`

**Changes:**
- Ensure `created_at` is always a valid ISO string
- Add default value if missing: `new Date().toISOString()`
- Validate date format before saving

#### 1.3 Fix Date Format in SSE Response
**Location**: `backend/src/services/summary.service.ts`
**Line**: 1131

**Current Code:**
```typescript
created_at: typeof summary.created_at === 'string' ? new Date(summary.created_at) : summary.created_at,
```

**Issue:**
- Converting to Date object, but frontend expects ISO string
- Should always send ISO string format

**Fix:**
- Always send `created_at` as ISO string
- Convert Date objects to ISO strings before sending

#### 1.4 Add Error Handling in History Controller
**Location**: `backend/src/controllers/history.controller.ts`
**Function**: `getHistory()`

**Changes:**
- Add try-catch around date formatting
- Log specific errors for debugging
- Return more detailed error messages in development mode
- Handle cases where summaries have invalid dates gracefully

---

### Phase 2: Frontend Date Handling Fixes

#### 2.1 Create Safe Date Utility Function
**Location**: `frontend/src/utils/date.ts` (new file)

**Purpose:**
- Centralize date parsing and formatting logic
- Provide safe date formatting that handles invalid dates
- Consistent date handling across the app

**Functions:**
- `safeFormatDate(date: string | Date | null | undefined, format: string): string`
- `isValidDate(date: any): boolean`
- `parseDate(date: string | Date | null | undefined): Date | null`

#### 2.2 Fix SummaryCard Component
**Location**: `frontend/src/components/history/SummaryCard.tsx`
**Line**: 37-39

**Current Code:**
```typescript
const formattedDate = summary.created_at
  ? format(new Date(summary.created_at), 'PPp')
  : 'Unknown date';
```

**Fix:**
- Use safe date utility function
- Handle invalid dates gracefully
- Show fallback text for invalid dates

#### 2.3 Fix SummaryDetailView Component
**Location**: `frontend/src/components/history/SummaryDetailView.tsx`
**Line**: 174-175

**Fix:**
- Use safe date utility function
- Same pattern as SummaryCard

#### 2.4 Fix ResultCard Component
**Location**: `frontend/src/components/dashboard/ResultCard.tsx`
**Line**: 98-100

**Fix:**
- Use safe date utility function
- Handle case where summary might not have created_at

#### 2.5 Fix cardSizeCalculator Utility
**Location**: `frontend/src/utils/cardSizeCalculator.ts`
**Function**: `getDaysSince()`
**Line**: 64-68

**Current Code:**
```typescript
function getDaysSince(createdAt: string | Date): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - created.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
```

**Issues:**
- Doesn't validate if date is valid
- Will throw error if date is invalid

**Fix:**
- Add date validation
- Return default value (e.g., 0 or large number) for invalid dates

#### 2.6 Fix History Page Sorting
**Location**: `frontend/src/app/app/history/page.tsx`
**Line**: 116-117

**Current Code:**
```typescript
const dateA = new Date(a.created_at).getTime();
const dateB = new Date(b.created_at).getTime();
```

**Fix:**
- Use safe date parsing
- Handle invalid dates in sorting

---

### Phase 3: Data Validation & Sanitization

#### 3.1 Enhance History Response Validation
**Location**: `frontend/src/utils/validation.ts`
**Function**: `sanitizeHistoryResponse()`
**Line**: 207

**Current Code:**
```typescript
created_at: item.created_at || new Date().toISOString(),
```

**Issues:**
- Doesn't validate if existing `created_at` is valid
- Should validate before using fallback

**Fix:**
- Validate date before using it
- Only use fallback if date is invalid
- Log warnings for invalid dates

#### 3.2 Add Date Validation to SummaryListItem Type
**Location**: `frontend/src/types/index.ts`

**Changes:**
- Document that `created_at` should always be a valid ISO string
- Add JSDoc comments about date format expectations

---

### Phase 4: State Management & Navigation

#### 4.1 Fix Summary Stream Date Handling
**Location**: `frontend/src/hooks/useSummaryStream.ts`
**Function**: `handleSSEEvent()` - 'completed' case
**Line**: 353-365

**Changes:**
- Ensure `data.data.created_at` is always an ISO string
- Convert Date objects to ISO strings if needed
- Validate date before storing in state

#### 4.2 Add History Page Error Recovery
**Location**: `frontend/src/app/app/history/page.tsx`

**Changes:**
- Add retry mechanism for failed API calls
- Show user-friendly error messages
- Add "Refresh" button to retry loading
- Log detailed errors in development mode

#### 4.3 Fix Navigation Timing
**Location**: `frontend/src/components/dashboard/ResultCard.tsx` (if navigation exists)

**Changes:**
- Ensure summary is fully saved before navigating
- Add loading state during save operation
- Handle navigation errors gracefully

---

### Phase 5: Controlled/Uncontrolled Component Fix

#### 5.1 Find and Fix Switch Component
**Location**: Search for Switch components in frontend

**Steps:**
1. Search for all Switch/Toggle components
2. Identify which one is causing the warning
3. Ensure all controlled components have initial values
4. Use `defaultValue` for uncontrolled or `value` for controlled consistently

**Common Locations:**
- Settings pages
- Form components
- Toggle switches in UI

---

## Implementation Priority

### Critical (Fix First)
1. **Backend Date Sorting Fix** (1.1) - Prevents 500 errors
2. **Safe Date Utility Function** (2.1) - Foundation for all date fixes
3. **SummaryCard Date Fix** (2.2) - Prevents Invalid time value errors
4. **SSE Date Format Fix** (1.3) - Ensures consistent date format

### High Priority
5. **History Controller Error Handling** (1.4) - Better error messages
6. **All Component Date Fixes** (2.3, 2.4, 2.5, 2.6) - Prevents all date errors
7. **Data Validation** (3.1, 3.2) - Prevents invalid data from causing issues

### Medium Priority
8. **State Management Fixes** (4.1, 4.2, 4.3) - Improves user experience
9. **Switch Component Fix** (5.1) - Removes React warnings

---

## Testing Plan

### Backend Tests
1. **Date Sorting Test**: Create summaries with various date formats (valid, invalid, null) and verify sorting works
2. **Invalid Date Handling**: Test with corrupted summary files that have invalid dates
3. **SSE Response Test**: Verify `created_at` is always sent as ISO string

### Frontend Tests
1. **Date Formatting Test**: Test all components with various date formats (valid, invalid, null, undefined)
2. **History Page Load Test**: Verify history page loads correctly with valid and invalid dates
3. **Error Recovery Test**: Test error states and recovery mechanisms
4. **Navigation Test**: Test transition from summary completion to history page

### Integration Tests
1. **End-to-End Flow**: Create summary → Complete → Navigate to history → Verify display
2. **Error Scenarios**: Test with corrupted data, network errors, invalid dates

---

## Files to Modify

### Backend Files
1. `backend/src/storage/local-summary.storage.ts` - Date sorting and validation
2. `backend/src/services/summary.service.ts` - SSE date format
3. `backend/src/controllers/history.controller.ts` - Error handling

### Frontend Files
1. `frontend/src/utils/date.ts` - **NEW FILE** - Safe date utilities
2. `frontend/src/components/history/SummaryCard.tsx` - Date formatting
3. `frontend/src/components/history/SummaryDetailView.tsx` - Date formatting
4. `frontend/src/components/dashboard/ResultCard.tsx` - Date formatting
5. `frontend/src/utils/cardSizeCalculator.ts` - Date parsing
6. `frontend/src/app/app/history/page.tsx` - Date sorting and error handling
7. `frontend/src/utils/validation.ts` - Date validation
8. `frontend/src/hooks/useSummaryStream.ts` - Date handling in SSE
9. `frontend/src/types/index.ts` - Type documentation

---

## Success Criteria

### Backend
- ✅ History API returns 200 OK with valid data
- ✅ No errors when sorting summaries with invalid dates
- ✅ All dates in SSE responses are ISO strings
- ✅ Invalid dates are handled gracefully (defaulted or filtered)

### Frontend
- ✅ No "Invalid time value" errors
- ✅ History page loads and displays summaries correctly
- ✅ All date displays show valid formatted dates or fallback text
- ✅ Smooth transition from summary completion to history page
- ✅ No React warnings about controlled/uncontrolled components

### User Experience
- ✅ History page loads reliably
- ✅ Dates display correctly in all contexts
- ✅ Error messages are clear and actionable
- ✅ No crashes or unhandled errors

---

## Notes

- All date handling should be defensive and assume data might be invalid
- Use ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ) for all date strings
- Log warnings in development mode when invalid dates are encountered
- Consider adding data migration script to fix existing invalid dates in storage
- The controlled/uncontrolled warning is likely in a settings or form component

---

## Additional Considerations

### Data Migration
If there are existing summaries with invalid dates:
1. Create a migration script to fix invalid dates
2. Set invalid dates to file creation time or current time
3. Log which summaries were fixed

### Monitoring
Add logging for:
- Invalid dates encountered
- Date parsing failures
- History API errors with details

### Performance
- Date parsing should be efficient
- Consider caching formatted dates if needed
- Avoid repeated date parsing in render cycles

