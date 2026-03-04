# Frontend SSE Connection Management - Implementation Guidance

**Purpose**: Prevent multiple SSE connections for the same research job  
**Status**: Backend implemented, Frontend pending  
**Priority**: High - Prevents race conditions and resource waste

---

## Problem Statement

If the frontend creates multiple SSE connections for the same job, it can cause:
- Duplicate event processing
- Race conditions in state updates
- Unnecessary server resources
- Inconsistent UI state
- Memory leaks

**Common Scenarios**:
1. React Strict Mode double-mounting (dev only)
2. Component re-renders triggering new connections
3. Reconnection logic creating duplicate connections
4. Multiple components connecting to same job

---

## Solution: Connection State Management

### Core Principle

**One connection per job, tracked globally, cleaned up properly.**

---

## Implementation Strategy

### 1. Connection State Tracking

Track active connections at the hook level using a ref:

```typescript
// In useResearchStream.ts
const eventSourceRef = useRef<EventSource | null>(null);
const isConnectingRef = useRef<boolean>(false);
const currentJobIdRef = useRef<string | null>(null);
```

### 2. Connection Check Before Creating

**Always check connection state before creating a new one:**

```typescript
const connect = useCallback((jobId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // ✅ CHECK 1: Already connected to this job?
    if (eventSourceRef.current && 
        currentJobIdRef.current === jobId &&
        eventSourceRef.current.readyState === EventSource.OPEN) {
      console.log(`[useResearchStream] Already connected to job ${jobId}`);
      resolve();
      return;
    }
    
    // ✅ CHECK 2: Currently connecting to this job?
    if (isConnectingRef.current && currentJobIdRef.current === jobId) {
      console.log(`[useResearchStream] Already connecting to job ${jobId}`);
      resolve();
      return;
    }
    
    // ✅ CHECK 3: Close existing connection if different job
    if (eventSourceRef.current && currentJobIdRef.current !== jobId) {
      console.log(`[useResearchStream] Closing connection to job ${currentJobIdRef.current}`);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      currentJobIdRef.current = null;
    }
    
    // ✅ CHECK 4: Don't create if already closed/connecting
    if (isConnectingRef.current) {
      console.warn(`[useResearchStream] Connection attempt while already connecting`);
      resolve();
      return;
    }
    
    // Mark as connecting
    isConnectingRef.current = true;
    currentJobIdRef.current = jobId;
    
    // Create new connection
    const url = `${apiBaseUrl}${apiEndpoints.researchStatus(jobId)}`;
    const eventSource = new AuthenticatedSSE(url, {
      withCredentials: false,
      enableAutoReconnect: false, // We handle reconnection manually
    });
    
    eventSourceRef.current = eventSource;
    
    eventSource.addEventListener('open', () => {
      isConnectingRef.current = false;
      setIsConnected(true);
      console.log(`[useResearchStream] Connected to job ${jobId}`);
      resolve();
    });
    
    eventSource.onerror = (error) => {
      isConnectingRef.current = false;
      console.error(`[useResearchStream] Connection error for job ${jobId}:`, error);
      reject(error);
    };
    
    // ... rest of connection setup
  });
}, []);
```

### 3. Cleanup on Unmount

**Always cleanup connections when component unmounts:**

```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    if (eventSourceRef.current) {
      console.log(`[useResearchStream] Cleaning up connection to job ${currentJobIdRef.current}`);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      currentJobIdRef.current = null;
      isConnectingRef.current = false;
    }
  };
}, []);
```

### 4. Disconnect Function

**Provide explicit disconnect function:**

```typescript
const disconnect = useCallback(() => {
  if (eventSourceRef.current) {
    console.log(`[useResearchStream] Disconnecting from job ${currentJobIdRef.current}`);
    eventSourceRef.current.close();
    eventSourceRef.current = null;
    currentJobIdRef.current = null;
    isConnectingRef.current = false;
    setIsConnected(false);
  }
}, []);
```

### 5. Reconnection Logic

**Smart reconnection that doesn't create duplicates:**

```typescript
const reconnect = useCallback((jobId: string) => {
  // ✅ Don't reconnect if already connected
  if (eventSourceRef.current && 
      currentJobIdRef.current === jobId &&
      eventSourceRef.current.readyState === EventSource.OPEN) {
    console.log(`[useResearchStream] Already connected, skipping reconnect`);
    return;
  }
  
  // Disconnect first, then reconnect
  disconnect();
  
  // Small delay to ensure cleanup
  setTimeout(() => {
    connect(jobId).catch(console.error);
  }, 100);
}, [connect, disconnect]);
```

---

## Complete Hook Structure

```typescript
export function useResearchStream(): UseResearchStreamReturn {
  // Connection state
  const eventSourceRef = useRef<EventSource | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const currentJobIdRef = useRef<string | null>(null);
  
  // Component state
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<ResearchStatus>('idle');
  // ... other state
  
  // Connect function (with all checks)
  const connect = useCallback((jobId: string): Promise<void> => {
    // Implementation with all checks above
  }, []);
  
  // Disconnect function
  const disconnect = useCallback(() => {
    // Implementation above
  }, []);
  
  // Reconnect function
  const reconnect = useCallback((jobId: string) => {
    // Implementation above
  }, [connect, disconnect]);
  
  // Start job (creates job, then connects)
  const startJob = useCallback(async (payload: ResearchRequest) => {
    // ... create job logic ...
    
    if (result.data?.job_id) {
      // ✅ Connect only after job created
      await connect(result.data.job_id);
    }
  }, [connect]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  // Auto-connect effect (if jobId provided)
  useEffect(() => {
    if (jobId && jobId !== currentJobIdRef.current) {
      connect(jobId).catch(console.error);
    }
    
    return () => {
      if (currentJobIdRef.current === jobId) {
        disconnect();
      }
    };
  }, [jobId, connect, disconnect]);
  
  return {
    startJob,
    connect,
    disconnect,
    reconnect,
    isConnected,
    // ... other return values
  };
}
```

---

## React Strict Mode Handling

**React Strict Mode mounts components twice in development.** Handle this:

```typescript
const isMountedRef = useRef(true);

useEffect(() => {
  isMountedRef.current = true;
  
  return () => {
    isMountedRef.current = false;
  };
}, []);

const connect = useCallback((jobId: string) => {
  // ✅ Check if still mounted before connecting
  if (!isMountedRef.current) {
    return Promise.resolve();
  }
  
  // ... connection logic ...
  
  eventSource.addEventListener('open', () => {
    // ✅ Check if still mounted before updating state
    if (!isMountedRef.current) {
      eventSource.close();
      return;
    }
    setIsConnected(true);
  });
}, []);
```

---

## Testing Checklist

### Manual Testing
- [ ] Create research job → only 1 SSE connection created
- [ ] Refresh page during processing → reconnects (not duplicate)
- [ ] Navigate away and back → reconnects correctly
- [ ] React Strict Mode (dev) → no duplicate connections
- [ ] Rapid job creation → each job gets own connection
- [ ] Component unmount → connection properly closed

### Console Logging
Add logging to verify behavior:
```typescript
console.log(`[useResearchStream] Connection state:`, {
  hasConnection: !!eventSourceRef.current,
  currentJobId: currentJobIdRef.current,
  isConnecting: isConnectingRef.current,
  readyState: eventSourceRef.current?.readyState,
  requestedJobId: jobId,
});
```

### Network Tab Verification
- Open DevTools → Network → Filter by "EventStream"
- Should see only 1 active connection per job
- Old connections should show "canceled" status

---

## Common Pitfalls to Avoid

### ❌ DON'T: Create connection in render
```typescript
// BAD - creates connection on every render
if (jobId) {
  connect(jobId);
}
```

### ✅ DO: Use useEffect with dependencies
```typescript
// GOOD - creates connection only when jobId changes
useEffect(() => {
  if (jobId) {
    connect(jobId);
  }
}, [jobId, connect]);
```

---

### ❌ DON'T: Ignore existing connection
```typescript
// BAD - creates new connection without checking
const connect = (jobId: string) => {
  const eventSource = new EventSource(url);
  // ...
};
```

### ✅ DO: Check before creating
```typescript
// GOOD - checks before creating
const connect = (jobId: string) => {
  if (eventSourceRef.current && currentJobIdRef.current === jobId) {
    return; // Already connected
  }
  // ... create connection
};
```

---

### ❌ DON'T: Forget cleanup
```typescript
// BAD - connection leaks on unmount
useEffect(() => {
  connect(jobId);
  // No cleanup!
}, [jobId]);
```

### ✅ DO: Always cleanup
```typescript
// GOOD - proper cleanup
useEffect(() => {
  connect(jobId);
  return () => {
    disconnect();
  };
}, [jobId, connect, disconnect]);
```

---

## Integration with Existing Code

### If Using useSummaryStream as Template

**Key Differences to Apply**:
1. Add `currentJobIdRef` to track which job is connected
2. Add connection state checks before creating
3. Ensure cleanup closes connection properly
4. Handle job ID changes (disconnect old, connect new)

### If Using AuthenticatedSSE Class

**Ensure**:
- `enableAutoReconnect: false` (we handle manually)
- Check connection state before creating new instance
- Close old instance before creating new one

---

## Backend Compatibility

**Backend Already Implements**:
- ✅ Connection deduplication (prevents same connection object)
- ✅ Connection tracking per job
- ✅ Proper cleanup on disconnect

**Frontend Must Ensure**:
- ✅ Only one connection per job
- ✅ Proper cleanup on unmount
- ✅ No duplicate connection attempts

---

## Quick Reference: Connection Lifecycle

```
1. startJob() called
   ↓
2. Check: Already connected? → Skip
   ↓
3. Check: Currently connecting? → Skip
   ↓
4. Check: Different job connected? → Disconnect old
   ↓
5. Create new EventSource
   ↓
6. Store in eventSourceRef
   ↓
7. Set currentJobIdRef
   ↓
8. Add event listeners
   ↓
9. On 'open': Set isConnected = true
   ↓
10. On 'error': Cleanup and retry (if needed)
   ↓
11. On unmount: Close connection, clear refs
```

---

## Success Criteria

✅ Only 1 SSE connection per job at any time  
✅ No duplicate connections in React Strict Mode  
✅ Proper cleanup on component unmount  
✅ Reconnection doesn't create duplicates  
✅ Connection state tracked correctly  
✅ No memory leaks from orphaned connections  

---

## Additional Resources

- See `CONSISTENCY_AND_RACE_CONDITION_ANALYSIS.md` for full context
- See `frontend/AI_RESEARCH_FEATURE_FRONTEND_PRD.md` for complete hook interface
- See `frontend/DETAILED_IMPLEMENTATION_PLAN.md` Task 2.1 for implementation details

---

**Last Updated**: 2026-01-22  
**Status**: Ready for Implementation
