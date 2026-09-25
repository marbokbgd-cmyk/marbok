import { NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"));
const PROJECT_ID = "marbok-3a9e2";
const OWNER = "nikola.borisavljevic.bgd@gmail.com";

export async function middleware(request) {
    // The repository also builds a separate non-commercial Vercel project.
    if (process.env.NEXT_PUBLIC_SITE_VARIANT !== "commercial") return NextResponse.next();
    const path = request.nextUrl.pathname;
    if (path === "/auth/login" || path === "/api/auth/session" || path === "/api/security-check") return NextResponse.next();
    const token = request.cookies.get("marbok_session")?.value;
    try {
        if (!token) throw new Error("Missing session");
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: `https://securetoken.google.com/${PROJECT_ID}`,
            audience: PROJECT_ID, algorithms: ["RS256"],
        });
        if (!payload.sub || payload.email?.toLowerCase() !== OWNER || payload.firebase?.sign_in_provider === "anonymous") {
            throw new Error("Not owner");
        }
        return NextResponse.next();
    } catch {
        if (path.startsWith("/api/")) return NextResponse.json({ error: "Prijava je potrebna." }, { status: 401 });
        return NextResponse.redirect(new URL("/auth/login", request.url));
    }
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.ico|logo.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js)$).*)"] };
