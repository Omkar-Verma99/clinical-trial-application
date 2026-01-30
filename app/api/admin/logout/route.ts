import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('adminAuth');
    cookieStore.delete('adminAuthData');

    return Response.json({ success: true });
  } catch (error: any) {
    console.error('Admin logout API error:', error);
    return Response.json(
      { success: false, error: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
