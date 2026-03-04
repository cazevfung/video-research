# Connection Crash Issue - Visual Flow Diagram

## Normal Operation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     APPLICATION START                        │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Firebase Auth - Fresh Token                     │
│              Valid for: 60 minutes                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   POLLING HOOKS START   │
              └─────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ useUserData │ │   useTier   │ │useTaskMgr   │
    │  /auth/me   │ │/tier/status │ │/tasks/active│
    │  Every 30s  │ │  Every 60s  │ │  Every 5s   │
    └─────────────┘ └─────────────┘ └─────────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │   ✅ 200 OK Responses    │
              │   App works normally    │
              └─────────────────────────┘
```

## Cascading Failure Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   AFTER 60+ MINUTES                          │
│              Firebase Token Expires                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ PROBLEM 1: Token Not Force-Refreshed                     │
│  getIdToken() returns cached expired token                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  All API Requests Fail  │
              │      401 UNAUTHORIZED    │
              └─────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ useUserData │ │   useTier   │ │useTaskMgr   │
    │   ❌ 401    │ │   ❌ 401    │ │   ❌ 401    │
    │  Continues  │ │  Continues  │ │  Continues  │
    │  Polling!   │ │  Polling!   │ │  Polling!   │
    └─────────────┘ └─────────────┘ └─────────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ PROBLEM 2: Polling Doesn't Stop on Auth Failure          │
│  Hooks keep making requests every few seconds               │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Request Rate Explosion │
              │                         │
              │  Before: 15 req/min     │
              │  After:  50+ req/min    │
              │  (all failing)          │
              └─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  BACKEND RATE LIMITER TRIGGERED                          │
│  Limit: 100 requests per 15 minutes (6.67/min avg)         │
│  Actual: 50+ requests per minute                            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │   429 TOO MANY REQUESTS │
              │   retryAfter: 900s      │
              │   (15 minutes)          │
              └─────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│  ❌ PROBLEM 3: Independent Rate Limit Pause                  │
│  Each hook instance has its own pause timer                 │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ Instance 1  │ │ Instance 2  │ │ Instance 3  │
    │ Pauses 60s  │ │ Pauses 60s  │ │ Pauses 60s  │
    │   t=0s      │ │   t=5s      │ │   t=15s     │
    └─────┬───────┘ └─────┬───────┘ └─────┬───────┘
          │               │               │
          │ Resumes t=60s │               │
          ▼               │               │
    ┌─────────────┐       │               │
    │   ❌ 429    │       │               │
    │ Rate Limited│       │               │
    │ Again!      │       │               │
    └─────┬───────┘       │               │
          │               │ Resumes t=65s │
          │ Pauses 60s    ▼               │
          │         ┌─────────────┐       │
          │         │   ❌ 429    │       │
          │         │ Rate Limited│       │
          │         │ Again!      │       │
          │         └─────┬───────┘       │
          │               │               │ Resumes t=75s
          │               │ Pauses 60s    ▼
          │               │         ┌─────────────┐
          │               │         │   ❌ 429    │
          │               │         │ Rate Limited│
          │               │         │ Again!      │
          │               │         └─────┬───────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │  ♾️  INFINITE LOOP      │
              │  App Permanently Broken │
              │  User Must Refresh      │
              └─────────────────────────┘
```

## Multiple Hook Instances Problem

```
┌─────────────────────────────────────────────────────────────┐
│                     BROWSER TAB                              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │   React App   │
                    └───────┬───────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
       ┌─────────┐   ┌──────────┐  ┌──────────┐
       │UserMenu │   │TaskPanel │  │ Account  │
       │Component│   │Component │  │   Page   │
       └────┬────┘   └─────┬────┘  └────┬─────┘
            │              │             │
            │              │             │
    ┌───────▼──────┐       │     ┌───────▼──────┐
    │ useUserData  │       │     │ useUserData  │
    │ Instance #1  │       │     │ Instance #3  │
    │  Polls 30s   │       │     │  Polls 30s   │
    └──────────────┘       │     └──────────────┘
                           │
                   ┌───────▼──────┐
                   │useTaskManager│
                   │ Instance #1  │
                   │  Polls 5s    │
                   └───────┬──────┘
                           │
                   ┌───────▼──────┐
                   │ useUserData  │
                   │ Instance #2  │
                   │ (dependency) │
                   │  Polls 30s   │
                   └──────────────┘

TOTAL POLLING RATE:
├─ 3x useUserData instances × 2 req/min = 6 req/min
├─ 1x useTaskManager × 12 req/min      = 12 req/min
└─ 1x useTier × 1 req/min              = 1 req/min
                                        ──────────
                                        19 req/min

WITH 401 ERRORS (retry logic):
├─ Failed requests still count
├─ Retry attempts multiply the rate
└─ Actual rate: 30-50 req/min

RATE LIMIT: 6.67 req/min average → EXCEEDED in 2-3 minutes
```

## Proposed Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   APPLICATION START                          │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│         Firebase Auth with Force Refresh                    │
│         getIdToken(true) - Always fresh                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              CENTRALIZED DATA CONTEXT                        │
│         Single Source of Truth for User Data                │
│         ✅ Only ONE instance of each hook                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ useUserData │ │   useTier   │ │useTaskMgr   │
    │   SINGLE    │ │   SINGLE    │ │   SINGLE    │
    │  Instance   │ │  Instance   │ │  Instance   │
    └─────────────┘ └─────────────┘ └─────────────┘
          │               │               │
          └───────────────┴───────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │  Global Rate Limiter    │
              │     Coordinator         │
              └─────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  Circuit Breaker │    │ Request Deduper  │
    │   Pattern        │    │   Pattern        │
    └──────────────────┘    └──────────────────┘
                          │
                          ▼
              ┌─────────────────────────┐
              │   API Requests          │
              │   Controlled Rate       │
              │   Coordinated Pausing   │
              └─────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ▼                       ▼
    ┌──────────────────┐    ┌──────────────────┐
    │  ✅ 200 Success  │    │  ⚠️  Error       │
    │  Continue        │    │  Detected        │
    │  Polling         │    │                  │
    └──────────────────┘    └────────┬─────────┘
                                     │
                         ┌───────────┴───────────┐
                         │                       │
                         ▼                       ▼
              ┌─────────────────┐    ┌─────────────────┐
              │  401 UNAUTHORIZED│    │  429 RATE LIMIT │
              │  Stop All Polling│    │  Global Pause   │
              │  Attempt Refresh │    │  All Hooks      │
              └─────────────────┘    └─────────────────┘
                         │                       │
                         ▼                       ▼
              ┌─────────────────┐    ┌─────────────────┐
              │ Show User Toast │    │ Exponential     │
              │ "Session Expired│    │ Backoff with    │
              │  Please Refresh"│    │ Jitter          │
              └─────────────────┘    └─────────────────┘

RESULT:
✅ No cascading failures
✅ Graceful error handling
✅ Reduced server load
✅ Better user experience
✅ Application stays stable indefinitely
```

## Request Rate Comparison

### Current (Broken)

```
Time: 0-15 min
├─ Multiple useUserData instances: 90 requests
├─ Multiple useTier instances:     15 requests
├─ Multiple useTaskManager:       180 requests
                                  ──────────────
                                  285 requests

Rate Limit: 100 requests → EXCEEDED at ~5 minutes
Status: ❌ APPLICATION CRASHES
```

### Proposed (Fixed)

```
Time: 0-15 min
├─ Single useUserData instance:    30 requests
├─ Single useTier instance:        15 requests
├─ Single useTaskManager:          60 requests
├─ Request deduplication:         -20 requests
├─ Exponential backoff on error:  -10 requests
                                  ──────────────
                                  75 requests

Rate Limit: 100 requests (increased to 300)
Status: ✅ WELL WITHIN LIMITS
```

## Error Recovery Flow

### Current (No Recovery)

```
401 Error → Continue Polling → 429 Error → Pause 60s → Resume → 429 Again → Loop Forever
```

### Proposed (Automatic Recovery)

```
401 Error 
    ↓
Stop All Polling
    ↓
Attempt Token Refresh (force: true)
    ↓
┌───────────┴───────────┐
│                       │
▼                       ▼
Success               Failure
    ↓                   ↓
Resume Polling    Show Toast + Logout
    ↓                   ↓
✅ App Recovered   User Re-authenticates
```


