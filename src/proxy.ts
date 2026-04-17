import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
    const token = request.cookies.get('auth_token')?.value
    const isLoginPath = request.nextUrl.pathname.startsWith('/login')
    const isProtectedPath = request.nextUrl.pathname.startsWith('/dashboard') ||
        request.nextUrl.pathname.startsWith('/students') ||
        request.nextUrl.pathname === '/'

    // 1. If no token and trying to access protected routes, redirect to login
    if (!token && isProtectedPath) {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    // 2. If token exists and trying to access login page, redirect to dashboard
    if (token && isLoginPath) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico).*)',
    ],
}
