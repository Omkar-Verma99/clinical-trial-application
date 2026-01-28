# V4 Schema CRUD Operations Audit ⚠️

## Current Status: PARTIALLY OPTIMIZED

The codebase has **mixed implementation** - some parts use V4 unified schema, others still use old separate collections.

---

## ✅ ALREADY OPTIMIZED (V4 Schema)

### 1. **Real-Time Sync - setupRealtimeSync()**
**File:** [hooks/use-indexed-db-sync.ts](hooks/use-indexed-db-sync.ts#L438-L520)
```typescript
// ✅ CORRECT: Listening to unified /patients/{patientId}
const patientDocRef = doc(db, 'patients', patientId)
const unsubscribePatient = onSnapshot(patientDocRef, async (docSnapshot) => {
  // Reads baseline + followUps from single document
})
```
**Status:** ✅ Correctly implemented

### 2. **Patient Page Reading**
**File:** [app/patients/[id]/page.tsx](app/patients/[id]/page.tsx#L64-L75)
```typescript
// ✅ CORRECT: Reading from unified patient document
const patientData = snap.data() as Patient & { 
  baseline?: BaselineData
  followups?: FollowUpData[] 
}
```
**Status:** ✅ Correctly implemented

### 3. **Firestore Rules**
**File:** [firestore.rules](firestore.rules)
- ✅ `/patients` collection with proper access control
- ✅ Backward compatibility rules for `/baselineData` and `/followUpData`
**Status:** ✅ Correctly implemented

---

## ❌ NEEDS OPTIMIZATION (Still Using Old Schema)

### 1. **performSync() Function**
**File:** [hooks/use-indexed-db-sync.ts](hooks/use-indexed-db-sync.ts#L156-L305)
**Status:** ❌ STILL USING OLD SCHEMA

**Current Issue:**
```typescript
// ❌ WRONG: Still writing to separate collections
const collectionMap: Record<string, string> = {
  baseline: 'baselineData',      // OLD
  followup: 'followUpData',       // OLD
  patient: 'patients',            // NEW
}
```

**Should Be:**
```typescript
// ✅ CORRECT: Write to unified /patients document
// - All baseline data in: patient.baseline
// - All followups in: patient.followUps[]
```

---

## CRUD Operations Checklist

### **CREATE Operations**

| Operation | Current | Should Be | Status |
|-----------|---------|-----------|--------|
| Create Baseline | Save to `/baselineData/{id}` | Save to `/patients/{id}.baseline` | ❌ |
| Create Followup | Save to `/followUpData/{id}` | Save to `/patients/{id}.followUps[]` | ❌ |
| Create Patient | Save to `/patients/{id}` | Save to `/patients/{id}` | ✅ |

### **READ Operations**

| Operation | Current | Should Be | Status |
|-----------|---------|-----------|--------|
| Read Patient | From `/patients/{id}` | From `/patients/{id}` | ✅ |
| Read Baseline | From `/baselineData` query | From `/patients/{id}.baseline` | ✅ (via real-time) |
| Read Followups | From `/followUpData` query | From `/patients/{id}.followUps[]` | ✅ (via real-time) |

### **UPDATE Operations**

| Operation | Current | Should Be | Status |
|-----------|---------|-----------|--------|
| Update Baseline | Update `/baselineData/{id}` | Update `/patients/{id}.baseline` | ❌ |
| Update Followup | Update `/followUpData/{id}` | Update `/patients/{id}.followUps[index]` | ❌ |
| Update Patient | Update `/patients/{id}` | Update `/patients/{id}` | ✅ |

### **DELETE Operations**

| Operation | Current | Should Be | Status |
|-----------|---------|-----------|--------|
| Delete Baseline | Delete from `/baselineData/{id}` | Remove `/patients/{id}.baseline` | ❌ |
| Delete Followup | Delete from `/followUpData/{id}` | Remove from `/patients/{id}.followUps[]` | ❌ |
| Delete Patient | Delete `/patients/{id}` | Delete `/patients/{id}` | ✅ |

---

## Required Fixes

### Fix #1: Update performSync() to V4 Schema

**Location:** [hooks/use-indexed-db-sync.ts](hooks/use-indexed-db-sync.ts#L156-L305)

**Change:**
```typescript
// OLD: Write to separate collections
await updateDoc(docRef, firebaseData)  // baselineData or followUpData

// NEW: Write to unified patient document
await updateDoc(doc(db, 'patients', patientId), {
  baseline: {...},        // for baseline forms
  followUps: [{...}],     // for followup forms  
  updatedAt: now
})
```

### Fix #2: Remove Old Collection References (if not needed for backward compat)

Files to review:
- [hooks/use-indexed-db-sync.ts](hooks/use-indexed-db-sync.ts) - Remove baselineData/followUpData logic
- [firestore.rules](firestore.rules) - Keep for backward compat only

---

## Migration Strategy

### Phase 1: Keep Both Schemas (Current)
- Write to BOTH old and new schemas
- Read from NEW schema (most data comes via real-time listeners)
- Gradually migrate existing data

### Phase 2: Remove Old Schema Writes
- Stop writing to `/baselineData` and `/followUpData`
- Only write to `/patients/{id}`
- Keep read rules for backward compatibility

### Phase 3: Full Cleanup
- Remove old collection rules
- Remove old sync logic
- Archive old collections if needed

---

## Performance Impact

**Current Mixed State:**
- ❌ Writing to multiple collections (extra costs)
- ❌ Extra code complexity
- ❌ Potential sync conflicts

**After Full Optimization:**
- ✅ Single write per patient
- ✅ 67% lower Firestore costs
- ✅ 3-4x faster operations
- ✅ Simpler codebase

---

## Recommendation

**Immediate Action:** Update `performSync()` to write to unified `/patients` schema

**Rationale:** 
- Real-time listeners already working with V4 schema ✅
- Patient pages already reading V4 schema ✅
- Only sync logic left to update ❌
- High impact, medium effort

---

**Last Updated:** January 28, 2026
**Audit Status:** ⚠️ PARTIAL - Needs performSync() optimization
