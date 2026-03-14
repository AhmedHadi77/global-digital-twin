import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, DEMO_USER } from "@/lib/demoAuth";

export async function POST(request: Request) {
  const { email, password } = await request.json();

  if (email !== DEMO_USER.email || password !== DEMO_USER.password) {
    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    );
  }

  const response = NextResponse.json({
    ok: true,
    user: {
      name: DEMO_USER.name,
      email: DEMO_USER.email,
    },
  });

  response.cookies.set(AUTH_COOKIE_NAME, "demo-admin-session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return response;
}
