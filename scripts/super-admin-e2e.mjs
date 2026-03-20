import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, signOut } from "firebase/auth";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  setDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kollectcare-rwe-study.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kollectcare-rwe-study",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kollectcare-rwe-study.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "940369281340",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:940369281340:web:d6b3f7e8c4a9b2f1e5d8c9a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QTWVYF3R19",
};

const email = process.env.E2E_ADMIN_EMAIL || "omkarverma8421@gmail.com";
const password = process.env.E2E_ADMIN_PASSWORD || "KC@123";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const results = [];

function addResult(step, ok, detail = "") {
  results.push({ step, ok, detail });
  const status = ok ? "PASS" : "FAIL";
  console.log(`[${status}] ${step}${detail ? ` :: ${detail}` : ""}`);
}

function nowIso() {
  return new Date().toISOString();
}

async function expectFail(step, fn) {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Firestore logs expected PERMISSION_DENIED noise for negative tests.
  // Filter that noise so the E2E output only surfaces unexpected failures.
  const filteredLogger = (...args) => {
    const text = args.map((a) => String(a)).join(" ");
    if (text.includes("PERMISSION_DENIED") || text.includes("permission-denied")) {
      return;
    }
    originalConsoleError(...args);
  };

  console.error = filteredLogger;
  console.warn = filteredLogger;

  try {
    await fn();
    addResult(step, false, "Unexpected success");
  } catch (error) {
    const code = String(error?.code || "");
    const message = String(error?.message || error);
    if (code.includes("permission-denied") || message.includes("PERMISSION_DENIED")) {
      addResult(step, true, code || "permission-denied");
    } else {
      addResult(step, false, message);
    }
  } finally {
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
  }
}

async function main() {
  let touchedPatientRef = null;
  let previousLock = null;

  try {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const uid = cred.user.uid;
    addResult("admin login", true, uid);

    const adminDocRef = doc(db, "admins", uid);
    const adminSnap = await getDoc(adminDocRef);
    if (!adminSnap.exists()) {
      addResult("admin profile exists", false, "admins/{uid} missing");
      return;
    }

    const adminData = adminSnap.data();
    addResult("admin profile exists", true, `role=${adminData.role || "unknown"}`);
    addResult("super admin role", adminData.role === "super_admin", String(adminData.role || "missing"));

    const doctorsSnap = await getDocs(query(collection(db, "doctors"), limit(5)));
    addResult("fetch doctors", true, `count=${doctorsSnap.size}`);

    const patientsSnap = await getDocs(query(collection(db, "patients"), limit(10)));
    addResult("fetch patients", true, `count=${patientsSnap.size}`);

    if (patientsSnap.size > 0) {
      touchedPatientRef = doc(db, "patients", patientsSnap.docs[0].id);
      const patientData = patientsSnap.docs[0].data() || {};
      previousLock = patientData.sectionLocks?.patient_info || null;

      await updateDoc(touchedPatientRef, {
        "sectionLocks.patient_info": {
          locked: true,
          lockedBy: uid,
          lockedByName: `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin",
          reason: "E2E lock check",
          lockedAt: nowIso(),
          updatedAt: nowIso(),
        },
      });
      addResult("lock patient_info", true, patientsSnap.docs[0].id);

      await updateDoc(touchedPatientRef, {
        "sectionLocks.patient_info": {
          locked: false,
          lockedBy: uid,
          lockedByName: `${adminData.firstName || ""} ${adminData.lastName || ""}`.trim() || "Admin",
          reason: "E2E unlock check",
          lockedAt: null,
          updatedAt: nowIso(),
        },
      });
      addResult("unlock patient_info", true, patientsSnap.docs[0].id);
    } else {
      addResult("lock/unlock patient_info", true, "skipped (no patient)");
    }

    const auditSnap = await getDocs(query(collection(db, "auditLogs"), limit(5)));
    addResult("fetch audit logs", true, `count=${auditSnap.size}`);

    const exportsSnap = await getDocs(query(collection(db, "exports"), limit(5)));
    addResult("fetch exports", true, `count=${exportsSnap.size}`);

    await expectFail("blocked write adminPanel", async () => {
      await setDoc(doc(db, "adminPanel", "e2e-write-test"), { updatedAt: nowIso(), marker: "should-fail" }, { merge: true });
    });

    await expectFail("blocked create export doc", async () => {
      await setDoc(doc(collection(db, "exports")), {
        adminId: uid,
        createdAt: nowIso(),
        type: "csv",
        filename: "blocked-test.csv",
      });
    });

    const failed = results.filter((r) => !r.ok);
    console.log("\n=== SUPER ADMIN E2E SUMMARY ===");
    console.log(`Total checks: ${results.length}`);
    console.log(`Passed: ${results.length - failed.length}`);
    console.log(`Failed: ${failed.length}`);

    if (failed.length > 0) {
      console.log("\nFailed checks:");
      for (const item of failed) {
        console.log(`- ${item.step} :: ${item.detail}`);
      }
      process.exitCode = 1;
    }

    // Best-effort restore of lock state if we touched one patient.
    if (touchedPatientRef) {
      try {
        if (previousLock) {
          await updateDoc(touchedPatientRef, {
            "sectionLocks.patient_info": previousLock,
          });
        }
      } catch {
        // ignore restore failures
      }
    }
  } catch (error) {
    console.error("Super admin E2E failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
  }
}

main();
