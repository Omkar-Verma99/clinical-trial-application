# NETWORK SUSPENSION & TAB VISIBILITY BUG AUDIT

**Date**: January 30, 2026  
**Priority**: CRITICAL - Affects production reliability  
**Issue**: `net::ERR_NETWORK_IO_SUSPENDED` when switching tabs/apps  

---

## ROOT CAUSE ANALYSIS

### The Problem

When users:
1. **Switch to another tab** (or app on mobile)
2. **Browser suspends background requests** (battery/resource optimization)
3. **Firebase connection gets suspended** → `net::ERR_NETWORK_IO_SUSPENDED` error
4. **Real-time listeners hang** without restarting
5. **Data sync breaks silently** - user doesn't know

### Why It Happens

Firestore's `onSnapshot()` listener:
- Establishes **long-polling HTTP connection** to Firebase
- Browser suspends ALL background network when tab invisible
- Connection doesn't automatically restart when tab becomes visible
- Listeners remain "subscribed" but **receive no updates** silently

---

## CRITICAL BUGS FOUND

### 🔴 BUG #16: Firestore Listeners Not Restarting on Tab Visibility

**Files Affected**: 
- `hooks/use-indexed-db-sync.ts` ⚠️
- `app/dashboard/page.tsx` ⚠️
- `contexts/auth-context.tsx` ⚠️
- `app/patients/[id]/page.tsx` ⚠️

**Severity**: CRITICAL  
**Impact**: Silent data sync failures when switching tabs

#### Problem

```typescript
// ❌ UNSAFE: Listeners not restarted on tab visibility change
const unsubscribePatient = onSnapshot(
  patientDocRef,
  async (docSnapshot) => {
    // Listener gets suspended when tab hidden
    // Does NOT restart automatically when tab visible
    await indexedDBService.saveForm(...)
  }
)

// No visibility change handler to restart listeners!
// Users switch to another tab → no more updates
// Switch back → still no updates (silently broken)
```

#### Current Status

✅ **PARTIALLY FIXED** in `use-indexed-db-sync.ts`:
- Has `handleVisibilityChange` function
- Has `isTabVisibleRef` and `listenerRestartRef`
- Restarts listeners when tab becomes visible

❌ **NOT FIXED** in other files:
1. **dashboard/page.tsx** - Real-time listener has NO visibility restart
2. **auth-context.tsx** - Real-time patients listener has NO visibility restart  
3. **patients/[id]/page.tsx** - Likely has same issue

---

### 🔴 BUG #17: Multiple Firestore Listeners Not Cleaned Up Before Restart

**File**: `hooks/use-indexed-db-sync.ts`  
**Severity**: HIGH  
**Issue**: Potential memory leaks from old listeners not fully cleaned

#### Problem

```typescript
// Line 505+
const setupRealtimeSync = useCallback(() => {
  const unsubscribers: Array<() => void> = []
  
  try {
    const unsubscribePatient = onSnapshot(patientDocRef, async (docSnapshot) => {
      // Listener 1
    })
    unsubscribers.push(unsubscribePatient)
    
    // Additional listeners added here...
    
    unsubscribeRef.current = () => {
      unsubscribers.forEach(unsub => unsub())  // ✅ All cleaned up
    }
  }
})

// BUT in handleVisibilityChange:
const handleVisibilityChange = useCallback(() => {
  if (isVisible && syncStatusRef.current.isOnline) {
    // Unsubscribe from old listener
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    // Restart listeners
    if (listenerRestartRef.current) {
      listenerRestartRef.current()  // ✅ This recreates listeners
    }
  }
})
```

**Risk**: If `listenerRestartRef.current` is null, listeners are unsubscribed but NOT restarted → data sync breaks

---

### 🔴 BUG #18: Dashboard Real-Time Listener Not Handling Tab Visibility

**File**: `app/dashboard/page.tsx`  
**Lines**: 260-345  
**Severity**: CRITICAL  
**Impact**: Dashboard doesn't update when switching away and back

#### Problem

```typescript
// ❌ MISSING: No handling for tab visibility changes
const unsubscribe = onSnapshot(
  query(collection(db, "patients"), where("doctorId", "==", user?.uid), orderBy("createdAt", "desc")),
  async (querySnapshot) => {
    // Fires when online, but:
    // 1. If tab hidden → connection suspended
    // 2. If tab visible again → listener doesn't restart
    // 3. Patient list stays stale
  },
  (error) => {
    console.error("Error setting up real-time listener:", error)
    setLoadingPatients(false)
  }
)

// No cleanup of this listener on tab visibility change
return () => {
  unsubscribe()  // Only cleans up on unmount!
}
```

**Expected Fix**: 
- Listen for `visibilitychange` event
- Unsubscribe and resubscribe when tab becomes visible
- Show "reconnecting..." UI while restarting

---

### 🔴 BUG #19: Auth Context Patient Listener Not Handling Tab Visibility

**File**: `contexts/auth-context.tsx`  
**Lines**: 110-150  
**Severity**: CRITICAL  
**Impact**: Patient list cache doesn't update when app backgrounded

#### Problem

```typescript
// ❌ MISSING: No handling for tab visibility changes
unsubscribePatientsRef.current = onSnapshot(
  patientsQuery,
  async (snapshot) => {
    // Updates patient index to IndexedDB
    // But if tab hidden → suspended
    // If tab visible again → no automatic restart
    for (const doc of snapshot.docs) {
      await indexedDBService.savePatientIndex({...})
    }
  },
  (error) => {
    logError(syncError as Error, {
      action: "realtimeSyncPatients",
      userId: user.uid,
      severity: "medium"
    })
  }
)

// No visibility change handling
return () => {
  if (unsubscribePatientsRef.current) {
    unsubscribePatientsRef.current()  // Only on logout/unmount
  }
}
```

---

### 🔴 BUG #20: Service Worker Not Handling Network Suspension

**File**: `public/sw.js`  
**Severity**: HIGH  
**Issue**: Service Worker doesn't help restart Firestore listeners

#### Problem

Service Worker handles:
- ✅ Static assets (caching)
- ✅ Background sync events
- ❌ Real-time listener suspension (can't help here)

**Why**: Real-time listeners are on **main thread**, not Service Worker  
Service Worker **cannot** restart them

---

### 🔴 BUG #21: Connection Restoration Not Checking for Listener State

**File**: `lib/network.ts`  
**Severity**: HIGH  
**Issue**: When connection restored, listeners might still be suspended

#### Problem

```typescript
// ❌ INCOMPLETE: Only checks navigator.onLine
private async handleConnectionRestored(): Promise<void> {
  // Verify connection is working
  const isConnected = await this.verifyConnection()
  
  if (isConnected) {
    this.isOnline = true
    this.notifyListeners()
    
    // But does NOT restart Firestore listeners!
    // Only calls triggerSync() 
    // Listeners remain suspended
  }
}
```

**Issue**: `navigator.onLine` and `visibilitychange` are **different events**:
- `online` event = network came back
- `visibilitychange` event = tab became visible

Need to handle **BOTH** and restart listeners for each!

---

### 🔴 BUG #22: No Exponential Backoff for Listener Restart Failures

**File**: `hooks/use-indexed-db-sync.ts`  
**Severity**: MEDIUM  
**Issue**: If listener fails to restart, no retry logic

#### Problem

```typescript
const handleVisibilityChange = useCallback(() => {
  const isVisible = !document.hidden
  
  if (isVisible && syncStatusRef.current.isOnline) {
    // Try to restart listeners
    if (listenerRestartRef.current) {
      listenerRestartRef.current()  // ❌ If this throws, what happens?
    }
    
    // No try/catch, no retry logic, no error handling
  }
})
```

**Fix Needed**: 
- Wrap in try/catch
- If restart fails, retry with exponential backoff
- Show error UI to user

---

### 🔴 BUG #23: No Heartbeat/Health Check for Listeners

**File**: `hooks/use-indexed-db-sync.ts`, `app/dashboard/page.tsx`  
**Severity**: MEDIUM  
**Issue**: Can't detect when listener is silently broken (suspended)

#### Problem

```typescript
// ❌ No way to know if listener is still healthy
const unsubscribePatient = onSnapshot(
  patientDocRef,
  async (docSnapshot) => {
    // If browser suspends connection, this callback STOPS being called
    // But app doesn't know - silently receives no updates
    // User thinks app is broken, doesn't refresh page
  }
)

// No heartbeat: lastUpdateTime = null → listener broken?
// No health check: isListenerHealthy = false?
```

**Fix Needed**:
- Track `lastListenerUpdate` timestamp
- If no update for 5+ minutes while online, listener is broken
- Auto-restart broken listeners
- Show "syncing..." indicator to user

---

### 🔴 BUG #24: Tab Visibility Listener Added Multiple Times

**File**: `hooks/use-indexed-db-sync.ts`  
**Severity**: MEDIUM  
**Issue**: Event listener potentially added multiple times on re-renders

#### Problem

```typescript
useEffect(() => {
  // ...
  document.addEventListener('visibilitychange', handleVisibilityChange)
  // ...
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  }
}, [patientId])  // Dependency on patientId

// Risk: If patientId changes, old listener added but new one not removed
// Multiple copies of handler registered
```

**Risk**: Memory leak, multiple restart attempts on tab visibility

---

### 🔴 BUG #25: No Protection Against Listener Restart Spam

**File**: `hooks/use-indexed-db-sync.ts`  
**Severity**: MEDIUM  
**Issue**: If visibility changes rapidly, could restart listeners many times

#### Problem

```typescript
const handleVisibilityChange = useCallback(() => {
  const isVisible = !document.hidden
  
  if (isVisible && syncStatusRef.current.isOnline) {
    // PROBLEM: If user flicks between tabs rapidly:
    // Tab A visible → restart listeners
    // Tab B visible → restart again
    // Tab A visible → restart again
    // Can cause Firebase rate limiting!
    
    if (listenerRestartRef.current) {
      listenerRestartRef.current()  // ❌ No debounce/throttle
    }
  }
})
```

**Fix Needed**: Debounce listener restart (don't restart more than once per 500ms)

---

## SUMMARY TABLE

| Bug # | File | Issue | Severity | Status |
|-------|------|-------|----------|--------|
| 16 | dashboard/page.tsx | No tab visibility restart | CRITICAL | ❌ Not Fixed |
| 16 | auth-context.tsx | No tab visibility restart | CRITICAL | ❌ Not Fixed |
| 17 | use-indexed-db-sync.ts | Null listener restart ref | HIGH | ⚠️ Partially |
| 18 | dashboard/page.tsx | Missing visibility handler | CRITICAL | ❌ Not Fixed |
| 19 | auth-context.tsx | Missing visibility handler | CRITICAL | ❌ Not Fixed |
| 20 | sw.js | Can't restart listeners | HIGH | N/A |
| 21 | network.ts | No listener restart on online | HIGH | ❌ Not Fixed |
| 22 | use-indexed-db-sync.ts | No retry on restart failure | MEDIUM | ❌ Not Fixed |
| 23 | use-indexed-db-sync.ts | No heartbeat check | MEDIUM | ❌ Not Fixed |
| 24 | use-indexed-db-sync.ts | Multiple event listeners | MEDIUM | ❌ Not Fixed |
| 25 | use-indexed-db-sync.ts | No restart debounce | MEDIUM | ❌ Not Fixed |

---

## IMPACT ASSESSMENT

### When Will Users Hit These Bugs?

1. **Open app, fill patient form** (10 mins)
2. **Switch to another app/tab** (device suspends network)
3. **Switch back to app** (10 seconds later)
4. **See stale data** - form shows old info, listener never updated
5. **User refreshes page** - data suddenly appears

### Severity

- **High probability**: Anyone multi-tasking or using mobile
- **Silent failure**: No error message, just stale data
- **Data integrity risk**: User might enter form based on stale baseline data
- **Compliance risk**: HIPAA requires data consistency

---

## RECOMMENDED FIXES (Coming Next)

1. Add visibility change handlers to ALL Firestore listener locations
2. Add listener health check with heartbeat
3. Add exponential backoff retry on restart failure
4. Debounce listener restart
5. Add UI indicators for "syncing", "reconnecting", "listener broken"
6. Test: Open app, switch tabs every 10 seconds, verify updates

