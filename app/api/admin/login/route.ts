/// <reference path="../../../../types/bcryptjs.d.ts" />
import { cookies } from 'next/headers';
import { getFirestore, collection, getDocs, query, where, doc, setDoc } from 'firebase/firestore';
import bcrypt from 'bcryptjs';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/lib/firebase-config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return Response.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query for admin
    const adminsRef = collection(db, 'admins');
    const q = query(adminsRef, where('email', '==', email.toLowerCase()));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return Response.json(
        { success: false, error: 'Admin account not found' },
        { status: 401 }
      );
    }

    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();

    // Verify password
    const passwordMatch = await bcrypt.compare(password, adminData.passwordHash);
    if (!passwordMatch) {
      return Response.json(
        { success: false, error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (adminData.status !== 'active') {
      return Response.json(
        { success: false, error: 'Admin account is inactive' },
        { status: 403 }
      );
    }

    // Update last login
    const lastLoginTimestamp = new Date();
    await setDoc(
      doc(db, 'admins', adminDoc.id),
      {
        lastLogin: lastLoginTimestamp,
        loginCount: (adminData.loginCount || 0) + 1,
      },
      { merge: true }
    );

    // Set secure cookies
    const cookieStore = await cookies();
    cookieStore.set('adminAuth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    cookieStore.set('adminAuthData', JSON.stringify({
      adminId: adminDoc.id,
      email: adminData.email,
      role: adminData.role,
      firstName: adminData.firstName,
      lastName: adminData.lastName,
    }), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return Response.json({
      success: true,
      user: {
        id: adminDoc.id,
        email: adminData.email,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role,
      },
    });
  } catch (error: any) {
    console.error('Admin login API error:', error);
    return Response.json(
      { success: false, error: 'An error occurred during login' },
      { status: 500 }
    );
  }
}
