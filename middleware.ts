import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // DOCTOR ROUTES PROTECTION
  const doctorProtectedRoutes = ['/dashboard', '/patients', '/reports', '/forgot-password'];
  
  if (doctorProtectedRoutes.some((route) => pathname.startsWith(route))) {
    const doctorAuth = request.cookies.get('doctorAuth');
    
    if (!doctorAuth) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // ADMIN ROUTES PROTECTION
  const adminProtectedRoutes = ['/admin/dashboard', '/admin/doctors', '/admin/patients', '/admin/forms', '/admin/analytics', '/admin/exports', '/admin/audit-logs', '/admin/settings'];
  
  if (adminProtectedRoutes.some((route) => pathname.startsWith(route))) {
    const adminAuth = request.cookies.get('adminAuth');
    const adminAuthData = request.cookies.get('adminAuthData')?.value;
    
    if (!adminAuth && !adminAuthData) {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  // Redirect /admin to /admin/dashboard if authenticated
  if (pathname === '/admin') {
    const adminAuth = request.cookies.get('adminAuth');
    const adminAuthData = request.cookies.get('adminAuthData')?.value;
    
    if (adminAuth || adminAuthData) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }

  // Redirect /admin/login to dashboard if already authenticated
  if (pathname === '/admin/login') {
    const adminAuth = request.cookies.get('adminAuth');
    const adminAuthData = request.cookies.get('adminAuthData')?.value;
    
    if (adminAuth || adminAuthData) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // Redirect root to /dashboard or /admin based on auth type
  if (pathname === '/' || pathname === '') {
    const adminAuth = request.cookies.get('adminAuth');
    const adminAuthData = request.cookies.get('adminAuthData')?.value;
    const doctorAuth = request.cookies.get('doctorAuth');
    
    if (adminAuth || adminAuthData) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    
    if (doctorAuth) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/patients/:path*',
    '/reports/:path*',
    '/forgot-password/:path*',
    '/admin/:path*',
    '/',
  ],
};
