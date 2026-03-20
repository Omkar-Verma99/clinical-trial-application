import { cookies } from 'next/headers';
import { getFirebaseAdminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const adminAuthDataCook = cookieStore.get('adminAuthData')?.value;

    if (adminAuthDataCook) {
      try {
        const adminData = JSON.parse(adminAuthDataCook);
        const adminDb = getFirebaseAdminDb();
        await adminDb.collection('auditLogs').doc(`log_logout_${Date.now()}_${adminData.adminId}`).set({
          adminId: adminData.adminId,
          action: 'admin_logout',
          resourceType: 'system',
          details: { adminName: `${adminData.firstName || ''} ${adminData.lastName || ''}`.trim() || adminData.email },
          timestamp: FieldValue.serverTimestamp(),
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        });
      } catch (err) {
        console.error('Failed to log admin logout:', err);
      }
    }

    cookieStore.delete('adminAuth');
    cookieStore.delete('adminAuthData');
    cookieStore.delete('adminSession');
    cookieStore.delete('adminIdToken');
    cookieStore.delete('appRole');

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Admin logout API error:', error);
    return Response.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
