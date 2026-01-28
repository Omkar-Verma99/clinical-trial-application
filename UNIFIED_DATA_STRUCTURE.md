# Unified Data Structure - IndexedDB + Firebase

## Overview
Both IndexedDB and Firebase now use the **SAME patient-centric structure** for consistency and performance.

---

## Data Structure

### **Single Patient Document** (Both IndexedDB & Firebase)

```json
{
  "patientId": "6XPs02Xos4sPJmsFsQzI",
  "doctorId": "FFETvwt43aeYOaWB0HC7rrpALdW2",
  
  "patientInfo": {
    "id": "6XPs02Xos4sPJmsFsQzI",
    "patientCode": "P-001",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "dob": "1980-05-15",
    "age": 44,
    "gender": "Male",
    "durationOfDiabetes": 5,
    "createdAt": "2026-01-27T10:00:00Z",
    "updatedAt": "2026-01-27T10:00:00Z"
  },
  
  "baseline": {
    "formId": "baseline-123",
    "status": "submitted",
    "weight": 75,
    "height": 180,
    "bmi": 23.1,
    "systolicBP": 120,
    "diastolicBP": 80,
    "otherField1": "value1",
    "otherField2": "value2",
    "createdAt": "2026-01-27T10:05:00Z",
    "updatedAt": "2026-01-27T10:05:00Z",
    "syncedToFirebaseAt": "2026-01-27T10:06:00Z"
  },
  
  "followups": [
    {
      "formId": "followup-456",
      "visitNumber": 1,
      "visitDate": "2026-02-15",
      "status": "submitted",
      "weight": 74,
      "systolicBP": 118,
      "diastolicBP": 78,
      "otherField1": "value1",
      "createdAt": "2026-02-15T10:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z",
      "syncedToFirebaseAt": "2026-02-15T10:01:00Z"
    },
    {
      "formId": "followup-789",
      "visitNumber": 2,
      "visitDate": "2026-03-15",
      "status": "draft",
      "weight": 73,
      "systolicBP": 115,
      "diastolicBP": 75,
      "createdAt": "2026-03-15T10:00:00Z",
      "updatedAt": "2026-03-15T10:00:00Z",
      "syncedToFirebaseAt": null
    }
  ],
  
  "metadata": {
    "lastSynced": "2026-03-15T10:01:00Z",
    "isDirty": false,
    "syncError": null
  }
}
```

---

## Firestore Collections

### `patients/{patientId}`
One document per patient containing all data.

**Security Rules:**
- ✅ Can READ if `doctorId == auth.uid`
- ✅ Can CREATE if `doctorId == auth.uid`
- ✅ Can UPDATE if owns the document
- ✅ Can DELETE if owns the document

---

## Benefits

| Aspect | Before | After |
|--------|--------|-------|
| **Write Operations** | 3-5 writes per patient (baseline + followups + patient) | 1 write per patient |
| **Read Operations** | 3 queries to get all data | 1 query per patient |
| **Network Bandwidth** | Higher (multiple documents) | Lower (single document) |
| **Data Consistency** | Risk of partial updates | Atomic per patient |
| **IndexedDB Sync** | Match records across 3 stores | Single record sync |
| **Offline Performance** | Complex merge logic | Simple load/save |
| **Mobile Users** | More network traffic | Minimal bandwidth |

---

## Migration Path

1. ✅ **IndexedDB V4** - Using new patient-centric structure
2. ✅ **Firestore Rules** - Updated to accept unified structure
3. ⏳ **Sync Hook** - Will automatically use new structure
4. ⏳ **Forms** - Will save to unified patient record
5. ⏳ **Dashboard** - Will load from single document

---

## API Methods

```typescript
// Load all patients for a doctor
const patients = await indexedDBService.getPatientsByDoctor(doctorId)

// Load one patient with all data
const patient = await indexedDBService.getPatient(patientId)

// Save complete patient data
await indexedDBService.savePatient(patientDataRecord)

// Add followup visit
await indexedDBService.addFollowupForm(patientId, followupData)

// Get pending syncs
const queue = await indexedDBService.getSyncQueue()

// Mark as synced
await indexedDBService.markSynced(syncItemId)
```

---

## Example Firestore Write (Single Operation)

**Before:**
```typescript
// 3 separate writes
await setDoc(doc(db, 'patients', patientId), patientData)
await setDoc(doc(db, 'baselineData', baselineId), baselineData)
await updateDoc(doc(db, 'patients', patientId), { hasBaseline: true })
```

**After:**
```typescript
// 1 unified write
await setDoc(doc(db, 'patients', patientId), {
  patientId,
  doctorId,
  patientInfo: {...},
  baseline: {...},
  followups: [...],
  metadata: {...}
})
```

---

## Firestore Structure Visualization

```
Firestore Database
└── patients/
    ├── 6XPs02Xos4sPJmsFsQzI/
    │   ├── patientInfo: {id, code, name, ...}
    │   ├── baseline: {formId, fields, ...}
    │   ├── followups: [{visit1}, {visit2}, ...]
    │   └── metadata: {lastSynced, isDirty, ...}
    │
    ├── Wi67PGjG5kl6b9w6YmgD/
    │   ├── patientInfo: {...}
    │   ├── baseline: {...}
    │   ├── followups: [...]
    │   └── metadata: {...}
    │
    └── eXgoYYnJIO1bxwUeuvOn/
        └── ... (same structure)
```

---

## Performance Improvements

1. **Faster Reads**: Load 1 document instead of 3+
2. **Faster Writes**: 1 write operation instead of 3-5
3. **Lower Bandwidth**: Single document transfer
4. **Better Offline**: Complete data in 1 fetch
5. **Atomic Updates**: Patient record is atomic unit
6. **Reduced Firestore Costs**:
   - Read: 1 operation instead of 3
   - Write: 1 operation instead of 3-5
   - ~60-70% cost reduction

---

## Status
✅ **IndexedDB** - Updated to V4 (patient-centric)
✅ **Firestore Rules** - Updated for unified structure
⏳ **Auth Context** - Will use new methods
⏳ **Sync Hook** - Will sync unified records
⏳ **Form Components** - Will save unified data
