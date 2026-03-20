import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDAn3llTqhmCmysQ0_lcX79RvuJsQMB2ks",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "kollectcare-rwe-study.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "kollectcare-rwe-study",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "kollectcare-rwe-study.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "940369281340",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:940369281340:web:d6b3f7e8c4a9b2f1e5d8c9a",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-QTWVYF3R19",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = process.env.E2E_DOCTOR_EMAIL || `doctor.e2e.${Date.now()}@kollectcare.com`;
const password = process.env.E2E_DOCTOR_PASSWORD || "KC@12345";

async function ensureDoctor() {
  let userCredential;

  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log(`[CREATE] Auth user created: ${email}`);
  } catch (error) {
    const code = String(error?.code || "");
    if (code === "auth/email-already-in-use") {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log(`[REUSE] Auth user exists and signed in: ${email}`);
    } else {
      throw error;
    }
  }

  const uid = userCredential.user.uid;
  const now = new Date().toISOString();

  const doctorPayload = {
    name: "Dr E2E Tester",
    registrationNumber: "REG-E2E-001",
    qualification: "MD",
    email,
    phone: "+910000000000",
    dateOfBirth: "1980-01-01",
    address: "E2E Test Address",
    studySiteCode: "RWE-99",
    createdAt: now,
    status: "active",
    firstName: "E2E",
    lastName: "Tester",
  };

  await setDoc(doc(db, "doctors", uid), doctorPayload, { merge: true });
  console.log(`[OK] Doctor profile ensured for UID: ${uid}`);
  console.log(`E2E_DOCTOR_EMAIL=${email}`);
  console.log(`E2E_DOCTOR_PASSWORD=${password}`);

  await signOut(auth);
}

ensureDoctor().catch(async (error) => {
  console.error("Doctor setup failed:", error);
  try {
    await signOut(auth);
  } catch {
    // ignore
  }
  process.exitCode = 1;
});
