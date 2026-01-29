# DEEP BUG AUDIT - Advanced Issues
**Date**: January 2026  
**Status**: 5 Additional Bugs Found  
**Total Bugs Found**: 15 (9 from initial audit + 5 from deep audit)  

---

## CRITICAL BUGS FOUND IN DEEP AUDIT

### 🔴 BUG #10: Stale Closure in handleOnline Callback
**File**: `hooks/use-indexed-db-sync.ts` (Lines 141-144)  
**Severity**: CRITICAL  
**Issue**: `handleOnline` has empty dependency array but calls `performSync()` defined later:
```typescript
// BROKEN:
const handleOnline = useCallback(() => {
  setSyncStatus(prev => ({ ...prev, isOnline: true }))
  performSync()  // ❌ Stale closure - performSync not in dependency array!
}, [])  // ❌ Empty deps - will close over undefined/stale performSync

const performSync = useCallback(async () => {
  // ... sync logic
}, [])
```

**Impact**: 
- When device comes online, `handleOnline` runs but calls the OLD (or undefined) `performSync` function
- Sync may not execute properly or execute with outdated state
- Race condition between when callback is defined vs when performSync is defined

**Root Cause**: Function hoisting in JavaScript means `performSync` doesn't exist when `handleOnline` is created.

**Fix Required**:
```typescript
// FIXED:
const handleOnline = useCallback(() => {
  setSyncStatus(prev => ({ ...prev, isOnline: true }))
  performSync()
}, [performSync])  // ✅ Include performSync in deps

const performSync = useCallback(async () => {
  // ...
}, [syncStatus, updateSyncStatus, patientId])  // ✅ Proper deps
```

---

### 🔴 BUG #11: Stale State in saveFormData Callback
**File**: `hooks/use-indexed-db-sync.ts` (Lines 383-418)  
**Severity**: HIGH  
**Issue**: Callback closes over `syncStatus.isOnline` but doesn't include `syncStatus` in dependency array:
```typescript
// PROBLEMATIC:
const saveFormData = useCallback(
  async (formId: string, formType, data, isDraft, validationErrors) => {
    // ...
    if (!isDraft && syncStatus.isOnline) {  // ❌ Uses stale syncStatus
      setTimeout(() => performSync(), 100)
    }
  },
  [patientId, updateSyncStatus, syncStatus.isOnline, performSync, addError]
  //                             ↑ Object property in deps - ESLint violation!
)
```

**Root Cause**: Dependencies array includes `syncStatus.isOnline` (an individual property) instead of `syncStatus` or `syncStatus.current`.

**Impact**: If `syncStatus` changes, the callback won't update, potentially using stale `isOnline` value.

**Fix Required**:
```typescript
// FIXED:
const saveFormData = useCallback(
  async (formId: string, formType, data, isDraft, validationErrors) => {
    // ...
    // Use ref instead of state to avoid dependency issues
    if (!isDraft && syncStatusRef.current.isOnline) {
      setTimeout(() => performSync(), 100)
    }
  },
  [patientId, updateSyncStatus, performSync, addError]
  // ✅ Removed syncStatus.isOnline - use syncStatusRef instead
)
```

---

### 🔴 BUG #12: Logic Error in Validation
**File**: `components/followup-form.tsx` (Line 152)  
**Severity**: MEDIUM  
**Issue**: Redundant and incorrect validation condition:
```typescript
// BROKEN:
if (!formData.missedDoses && formData.missedDoses !== "0") {
  validationErrors.push("Missed doses information is required")
}
```

**Problem**: 
- If `!formData.missedDoses` is true (empty, "0", null), then `formData.missedDoses` is falsy
- Checking `!== "0"` after that is redundant
- If value is "0" (string zero), first condition is true, second is false → condition evaluates to false (doesn't push error)
- If value is 0 (number), first condition is true, second depends on type coercion

**Intended Logic**: Should require missedDoses to be filled OR be "0"

**Fix Required**:
```typescript
// FIXED:
if (formData.missedDoses === "" || formData.missedDoses === null || formData.missedDoses === undefined) {
  validationErrors.push("Missed doses information is required")
}
// OR more simply:
if (!formData.missedDoses) {
  validationErrors.push("Missed doses information is required")
}
```

---

### 🔴 BUG #13: Performance Bug - JSON.stringify for Deep Equality
**File**: `app/patients/[id]/page.tsx` (Lines 85-108)  
**Severity**: MEDIUM (Performance)  
**Issue**: Using `JSON.stringify()` for deep equality on every snapshot:
```typescript
// PROBLEMATIC:
const unsubPatient = onSnapshot(patientRef, (snap) => {
  if (snap.exists()) {
    const patientData = snap.data()
    
    setPatient(prevPatient => {
      // ❌ Stringifies ENTIRE patient object on every snapshot
      if (prevPatient && JSON.stringify(prevPatient) === JSON.stringify(newPatientData)) {
        return prevPatient
      }
      return newPatientData
    })
    
    // ❌ Stringifies baseline separately
    setBaseline(prevBaseline => {
      if (prevBaseline && JSON.stringify(prevBaseline) === JSON.stringify(patientData.baseline)) {
        return prevBaseline
      }
      return patientData.baseline
    })
    
    // ❌ Stringifies entire followups array separately
    setFollowUps(prevFollowUps => {
      if (prevFollowUps && JSON.stringify(prevFollowUps) === JSON.stringify(patientData.followups)) {
        return prevFollowUps
      }
      return patientData.followups
    })
  }
})
```

**Impact**: 
- With 10+ followups, each containing 50+ fields, this creates MASSIVE garbage strings
- Every snapshot (even with no actual changes) triggers multiple full object serializations
- Causes memory pressure and GC pauses, sluggish UI
- Defeats the purpose of Firestore real-time listeners

**Better Approach**:
```typescript
// FIXED - Use shallow equality with checksum:
setPatient(prevPatient => {
  const newHash = generateChecksum(newPatientData)
  if (prevPatient && currentPatientHashRef.current === newHash) {
    return prevPatient
  }
  currentPatientHashRef.current = newHash
  return newPatientData
})
```

---

### 🔴 BUG #14: Unsafe Object Mutation with Delete Operator
**File**: `hooks/use-indexed-db-sync.ts` (Lines 213, 223)  
**Severity**: MEDIUM  
**Issue**: Mutating data loaded from IndexedDB:
```typescript
// PROBLEMATIC:
if (baselineDb?.data) {
  baselineData = baselineDb.data
  delete (baselineData as any).createdAt  // ❌ Mutates loaded object!
}

// For followup data:
if (followupDb?.data) {
  const followupData = followupDb.data
  delete (followupData as any).createdAt  // ❌ Mutates loaded object!
  followupsData.push(followupData)
}
```

**Problem**: 
- `baselineDb.data` returns the actual stored object reference from IndexedDB
- `delete` operator mutates it in-place
- If this data is read again (e.g., in a listener or other sync), it will have `createdAt` deleted
- Violates immutability principle
- Could cause bugs if data is used elsewhere after sync

**Fix Required**:
```typescript
// FIXED - Copy before mutation:
if (baselineDb?.data) {
  baselineData = { ...baselineDb.data }
  delete baselineData.createdAt
}

// For followup data:
if (followupDb?.data) {
  const followupData = { ...followupDb.data }
  delete followupData.createdAt
  followupsData.push(followupData)
}

// OR better yet - don't use delete at all:
baselineData = { ...baselineDb.data }
const { createdAt, ...baselineDataWithoutCreatedAt } = baselineData
```

---

### 🔴 BUG #15: Type Unsafe Casts Hide Real Issues
**File**: `components/baseline-form.tsx` (Lines 38, 42, 46)  
**Severity**: LOW (Code Quality)  
**Issue**: Multiple `as any` casts bypass TypeScript:
```typescript
// PROBLEMATIC:
const [formData, setFormData] = useState({
  heartRate: (existingData as any)?.heartRate?.toString() || "",
  //         ^^^^^^^^ Unsafe cast!
  urinalysisSpecify: (existingData as any)?.urinalysisSpecify || "",
  //                 ^^^^^^^^ Unsafe cast!
  treatmentInitiationDate: (existingData as any)?.treatmentInitiationDate || new Date().toISOString().split('T')[0],
  //                        ^^^^^^^^ Unsafe cast!
})
```

**Why it's problematic**: 
- TypeScript doesn't check property existence
- If schema changes, no compile-time error
- If wrong field is accessed, no warning
- Makes code brittle and harder to refactor

**Better Approach**:
```typescript
// FIXED - Proper typing:
interface BaselineDataExtended extends BaselineData {
  heartRate?: number
  urinalysisSpecify?: string
  treatmentInitiationDate?: string
}

const [formData, setFormData] = useState({
  heartRate: (existingData as BaselineDataExtended)?.heartRate?.toString() || "",
  urinalysisSpecify: (existingData as BaselineDataExtended)?.urinalysisSpecify || "",
  treatmentInitiationDate: (existingData as BaselineDataExtended)?.treatmentInitiationDate || new Date().toISOString().split('T')[0],
})

// OR best approach - define proper interface in types.ts and use throughout
```

---

## SUMMARY OF ALL 15 BUGS

| # | Bug | File | Severity | Type |
|---|-----|------|----------|------|
| 1 | Timestamp string comparison | use-indexed-db-sync.ts | CRITICAL | Data Integrity |
| 2 | Missing NaN validation (followup) | followup-form.tsx | CRITICAL | Data Integrity |
| 3 | Missing NaN validation (baseline) | baseline-form.tsx | CRITICAL | Data Integrity |
| 4 | Missing NaN validation (add patient) | add/page.tsx | CRITICAL | Data Integrity |
| 5 | Empty sync data | use-indexed-db-sync.ts | MEDIUM | Efficiency |
| 6 | Invalid date handling | followup-form.tsx | MEDIUM | Error Handling |
| 7 | NaN in BMI calculation | add/page.tsx | HIGH | Data Integrity |
| 8 | Duplicate code | add/page.tsx | MEDIUM | Code Quality |
| 9 | Missing array validation | indexeddb-service.ts | MEDIUM | Safety |
| 10 | Stale closure in handleOnline | use-indexed-db-sync.ts | CRITICAL | Logic/Race |
| 11 | Stale state in saveFormData | use-indexed-db-sync.ts | HIGH | Logic/Race |
| 12 | Logic error in validation | followup-form.tsx | MEDIUM | Logic |
| 13 | Expensive deep equality checks | patients/[id]/page.tsx | MEDIUM | Performance |
| 14 | Object mutation with delete | use-indexed-db-sync.ts | MEDIUM | Immutability |
| 15 | Unsafe type casts | baseline-form.tsx | LOW | Code Quality |

---

## CRITICAL PATH ANALYSIS

**Must Fix Immediately** (Before Production):
- ✅ Bug #1 - Timestamp comparison (already fixed)
- ✅ Bug #2 - NaN validation followup (already fixed)
- ✅ Bug #3 - NaN validation baseline (already fixed)
- ✅ Bug #4 - NaN validation add patient (already fixed)
- ✅ Bug #5 - Empty sync (already fixed)
- ✅ Bug #6 - Invalid dates (already fixed)
- ✅ Bug #7 - NaN in BMI (already fixed)
- ✅ Bug #8 - Duplicate code (already fixed)
- ✅ Bug #9 - Array validation (already fixed)
- 🔴 Bug #10 - **Stale closure** - NOT YET FIXED
- 🔴 Bug #11 - **Stale state** - NOT YET FIXED
- 🔴 Bug #12 - **Logic error** - NOT YET FIXED
- ⚠️ Bug #13 - Performance (can defer to optimization phase)
- 🔴 Bug #14 - **Object mutation** - NOT YET FIXED
- ⚠️ Bug #15 - Type casts (code quality, can defer)

---

## NEXT STEPS

1. **Fix bugs #10, #11, #12, #14 immediately** (5-10 min each)
2. Address bug #13 if performance issues arise
3. Refactor type casts (#15) during next code review cycle
4. Add ESLint rules to catch stale closures automatically
5. Implement immutability checks in code review process
