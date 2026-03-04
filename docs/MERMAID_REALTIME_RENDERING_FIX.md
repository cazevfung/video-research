# Mermaid Real-Time Rendering Fix

## Problem
During real-time streaming of markdown content with Mermaid diagrams:
- Parse errors appeared repeatedly at the bottom of the page
- Page layout would jump around as diagrams failed/succeeded
- Multiple "Syntax error in text mermaid version 11.12.2" messages displayed
- Poor user experience during content streaming

## Root Cause
The `MermaidDiagram` component was attempting to parse incomplete Mermaid code character-by-character as it was being streamed, causing:
1. Continuous parse errors on incomplete syntax
2. Layout shifts as render attempts failed and succeeded
3. Error messages polluting the UI

## Solution Implemented

### 1. **Continuous Rendering with Smart Debouncing**
- Renders are attempted continuously (every 400ms) instead of waiting for "complete" code
- Users see diagrams update in real-time as code is typed/streamed
- Debouncing prevents excessive render attempts

### 2. **Intelligent Error Suppression**
- Errors are detected but NOT shown during active streaming
- Only displays errors after code has been stable for 2+ seconds
- Prevents error message spam during rapid changes

### 3. **Last Successful Render Preservation**
- Stores the last successfully rendered SVG
- On parse errors, keeps showing the last valid diagram
- Provides visual continuity during streaming

### 4. **Layout Stability**
- Captures and maintains container height
- Prevents page jumping as diagrams update
- Smooth opacity transitions during updates

### 5. **Visual Feedback**
- Subtle "Updating..." indicator during active parsing
- Warning badge when showing stale diagram due to errors
- Non-intrusive, doesn't distract from content

## Key Features

### Real-Time Updates
```typescript
// 400ms debounce - fast enough for real-time feel
renderTimerRef.current = setTimeout(async () => {
  // Attempt render...
}, 400);
```

### Error Handling
```typescript
// Only show errors after code is stable
errorTimerRef.current = setTimeout(() => {
  const timeSinceLastChange = Date.now() - lastCodeChangeRef.current;
  if (timeSinceLastChange > 2000) {
    setShowError(true);
  }
}, 2000);
```

### Height Preservation
```typescript
// Capture current height before updating
if (mermaidRef.current.firstElementChild) {
  const currentHeight = mermaidRef.current.firstElementChild.getBoundingClientRect().height;
  if (currentHeight > 0) {
    setContainerHeight(currentHeight);
  }
}
```

### Last Successful Render
```typescript
// Store and reuse on errors
lastSuccessfulSvgRef.current = svg;

// Keep showing last valid diagram on error
// Don't clear the display
```

## User Experience Improvements

### Before
- ❌ Parse errors everywhere
- ❌ Page jumping around
- ❌ Distracting error messages
- ❌ No diagram until code is complete
- ❌ Confusing for users

### After
- ✅ Clean, error-free streaming
- ✅ Stable layout
- ✅ Diagrams update in real-time
- ✅ Last valid diagram stays visible
- ✅ Subtle, non-intrusive feedback
- ✅ Professional appearance

## Technical Details

### State Management
- `isRendering`: Currently attempting to render
- `hasError`: Render failed (but don't show yet)
- `showError`: Persistent error to display to user
- `lastSuccessfulSvgRef`: Last valid SVG content
- `containerHeight`: Stable height to prevent jumping
- `isActivelyChanging`: Code is being typed/streamed

### Timing Constants
- **400ms**: Render debounce (real-time updates)
- **1000ms**: Active change detection window
- **2000ms**: Error display delay (wait for stability)

### Visual Indicators
- **Blue pulsing dot**: Actively parsing/updating
- **Yellow warning**: Showing stale diagram due to error
- **Opacity 0.7**: Diagram during update (subtle feedback)

## Testing Scenarios

1. **Streaming Content**: Diagram updates smoothly without errors
2. **Incomplete Code**: Shows last valid diagram, no error spam
3. **Syntax Errors**: Waits for stability before showing error
4. **Rapid Changes**: Debouncing prevents excessive renders
5. **Theme Changes**: Diagrams update correctly
6. **Large Diagrams**: Height is preserved, no jumping

## Files Modified
- `frontend/src/components/ui/Code.tsx`: Complete MermaidDiagram rewrite

## Configuration
All timing values can be adjusted:
- Render debounce: `setTimeout(..., 400)`
- Active change window: `setTimeout(..., 1000)`
- Error display delay: `setTimeout(..., 2000)`

## Future Enhancements
- [ ] Progressive rendering for very large diagrams
- [ ] Syntax validation before render attempt
- [ ] Better error messages with suggestions
- [ ] Retry logic for transient errors
- [ ] Performance metrics tracking
