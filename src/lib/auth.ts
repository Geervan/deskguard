import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { prisma } from "./db";

const JWT_SECRET = process.env.JWT_SECRET || "deskguard-super-secret-dev-key-123456789";
const SESSION_COOKIE_NAME = "deskguard_session";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "STUDENT" | "LIBRARIAN";
  name?: string;
}

export async function createSession(payload: SessionPayload) {
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  
  const cookieStore = await cookies();
  cookieStore.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionPayload(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, JWT_SECRET) as SessionPayload;
    return payload;
  } catch (e) {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSessionPayload();
  if (!session) return null;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    return user;
  } catch (e) {
    return null;
  }
}
