import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const doctorAuth = request.cookies.get('doctorAuth');
  const adminAuth = request.cookies.get('adminAuth');
  const appRole = request.cookies.get('appRole')?.value;

  const isDoctorSession = !!doctorAuth && appRole === 'doctor';
  const isAdminSession = !!adminAuth && (appRole === 'admin' || appRole === 'super_admin');

  // DOCTOR ROUTES PROTECTION
  // NOTE: /forgot-password is NOT protected - users can access it without login
  const doctorProtectedRoutes = ['/dashboard', '/patients', '/reports'];
  
  if (doctorProtectedRoutes.some((route) => pathname.startsWith(route))) {
    if (!isDoctorSession) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ADMIN ROUTES PROTECTION (canonical admin home: /admin)
  if (pathname === '/admin/login') {
    if (isAdminSession) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  } else if (pathname.startsWith('/admin')) {
    if (!isAdminSession) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Backward compatibility route handling.
  if (pathname === '/admin/dashboard') {
    return NextResponse.redirect(new URL('/admin', request.url));
  }
  
  // Prevent logged-in doctors from accessing login/signup/forgot-password
  if (['/login', '/signup'].includes(pathname)) {
    if (isDoctorSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // Redirect root to /dashboard or /admin based on auth type
  if (pathname === '/' || pathname === '') {
    if (isAdminSession) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    
    if (isDoctorSession) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    // Show landing page for unauthenticated users.
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/patients/:path*',
    '/reports/:path*',
    '/login',
    '/signup',
    '/admin/:path*',
    '/',
  ],
};
