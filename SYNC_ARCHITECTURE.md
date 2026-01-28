# Event-Driven Sync Architecture ⚡

## Overview

The sync system uses **event-driven** approach instead of polling. No timer-based syncing - data syncs only when needed.

---

## Sync Triggers (3 Events - NOT Polling)

### **1️⃣ Form Submission (0ms)**
```typescript
// When user saves form
await saveFormData(formId, 'followup', data)

// Happens immediately:
✓ Save to IndexedDB (instant)
✓ If online: Trigger Firebase sync (immediate, not waiting)
```

### **2️⃣ Firebase Real-Time Listeners (onSnapshot)**
```typescript
// Automatic Firebase listener
const unsubscribeBaseline = onSnapshot(baselineQuery, async (snapshot) => {
  // When Firebase data changes:
  ✓ Update IndexedDB automatically
  ✓ Dashboard updates in real-time
})
```

### **3️⃣ Network Status Changes**
```typescript
// When device comes online
window.addEventListener('online', () => {
  // Happens automatically:
  ✓ Trigger sync of all pending items
  ✓ Restore Firebase listeners
  ✓ Dashboard refreshes with latest data
})
```

---

## NO POLLING ❌

**Removed from code:**
- ~~`setInterval(() => performSync(), 30000)`~~ ❌ DELETED
- ~~`setInterval(() => updateDashboard(), 30000)`~~ ❌ DELETED

**Why?** Wastes:
- ⚡ Battery (continuous checks)
- 🌐 Bandwidth (sync even when no changes)
- 💾 CPU (unnecessary database reads)

---

## Data Flow

### **Online Mode**
```
Form Input
   ↓
IndexedDB Save (0ms) ✓
   ↓
[Is Online?] → YES
   ↓
Firebase Sync (immediate) ✓
   ↓
Dashboard Updates (real-time) ✓
```

### **Offline Mode**
```
Form Input
   ↓
IndexedDB Save (0ms) ✓
   ↓
[Is Online?] → NO
   ↓
Queue for Later ⏳
   ↓
[Network Restored] → Automatic Sync ✓
```

---

## Performance Characteristics

| Scenario | Latency | Trigger |
|----------|---------|---------|
| Form save to IndexedDB | ~0-10ms | Instant |
| Form save to Firebase (online) | ~50-200ms | Immediate (not waiting) |
| Firebase change → IndexedDB | Real-time | onSnapshot listener |
| Dashboard update | <100ms | Event-driven |
| Network restoration sync | Immediate | `online` event |

---

## Key Code Locations

**Sync hook:**  
[hooks/use-indexed-db-sync.ts](hooks/use-indexed-db-sync.ts)

**Sync triggers:**
1. Form submission → [saveFormData()](hooks/use-indexed-db-sync.ts#L345)
2. Firebase listeners → [setupRealtimeSync()](hooks/use-indexed-db-sync.ts#L438)
3. Network online → [handleOnline()](hooks/use-indexed-db-sync.ts#L133)

**IndexedDB service:**  
[lib/indexeddb-service.ts](lib/indexeddb-service.ts)

---

## Testing Event-Driven Sync

### ✅ Test 1: Form Save → IndexedDB
1. Ensure browser is online
2. Fill followup form
3. Click "Save"
4. Open DevTools → Application → IndexedDB
5. **Verify:** Form saved instantly (<50ms)

### ✅ Test 2: Form Save → Firebase (Online)
1. Ensure browser is online
2. Fill followup form
3. Click "Save"
4. Open DevTools → Network tab
5. **Verify:** Firebase request sent immediately (not after 30s)
6. See POST to Firestore with form data

### ✅ Test 3: Firebase Change → IndexedDB (Real-time)
1. Open app in two browser windows (same patient)
2. Window 1: Save followup form
3. Window 2: Check IndexedDB immediately
4. **Verify:** Window 2's data updates without page refresh

### ✅ Test 4: Offline → Online Auto-Sync
1. Open DevTools → Network → Throttle to "Offline"
2. Fill followup form (will save to IndexedDB)
3. DevTools → Network → Go back "Online"
4. **Verify:** Form auto-syncs to Firebase immediately
5. No manual refresh needed

### ✅ Test 5: Network Monitor (No Polling)
1. DevTools → Network tab
2. Keep app open for 2 minutes
3. **Verify:** NO repeated requests every 30 seconds
4. Only see requests when:
   - Form submitted
   - Firebase data changes (listener updates)
   - Network comes online

---

## Benefits

✅ **Faster** - No waiting for 30s polling interval
✅ **Efficient** - Only syncs when data actually changes
✅ **Battery-friendly** - No continuous network checks
✅ **Real-time** - Firebase listeners catch all server changes
✅ **Offline-ready** - Works completely offline, auto-syncs when online

---

## Monitoring Sync Status

```typescript
// Component example
const { syncStatus } = useIndexedDBSync(patientId)

// Shows:
✓ isOnline: true/false (network status)
✓ isSyncing: true/false (currently syncing)
✓ pendingItems: 0-N (items waiting to sync)
✓ lastSyncTime: ISO timestamp (last successful sync)
✓ errors: string[] (recent sync errors)
```

---

## Migration Notes

If your app previously had polling:

1. ✅ **Removed:** `setInterval(performSync, 30000)`
2. ✅ **Kept:** `onSnapshot` real-time listeners
3. ✅ **Kept:** Form submission sync trigger
4. ✅ **Kept:** Network online/offline events
5. ✅ **Result:** Same data accuracy, much better performance

---

**Last Updated:** January 28, 2026  
**Sync Type:** Event-Driven (100% polling-free)  
**Status:** ✅ Production Ready
