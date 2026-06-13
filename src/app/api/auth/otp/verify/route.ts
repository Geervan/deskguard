import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, code, name } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, error: "Email and verification code are required" },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();

    // Look for matching OTP
    const dbOtp = await prisma.otp.findFirst({
      where: {
        email: emailKey,
        code: code.trim()
      }
    });

    if (!dbOtp) {
      return NextResponse.json(
        { success: false, error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check expiry
    if (new Date() > dbOtp.expiresAt) {
      // Clean up expired OTP
      await prisma.otp.delete({ where: { id: dbOtp.id } });
      return NextResponse.json(
        { success: false, error: "Verification code has expired" },
        { status: 400 }
      );
    }

    // Delete OTP now that it's verified
    await prisma.otp.delete({ where: { id: dbOtp.id } });

    // Find or create User
    let user = await prisma.user.findUnique({
      where: { email: emailKey }
    });

    if (!user) {
      // Determine role: librarians can log in with a 'librarian' or 'admin' email address
      const isLibrarian = emailKey.includes("librarian") || emailKey.includes("admin");
      const resolvedRole = isLibrarian ? "LIBRARIAN" as const : "STUDENT" as const;
      
      // Guess name from email if name not provided
      let displayName = name || emailKey.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

      user = await prisma.user.create({
        data: {
          email: emailKey,
          name: displayName,
          role: resolvedRole
        }
      });
    } else if (name && !user.name) {
      // Update name if we didn't have it
      user = await prisma.user.update({
        where: { id: user.id },
        data: { name }
      });
    }

    // Create session cookie
    await createSession({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name || undefined
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error: any) {
    console.error("Failed to verify OTP:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
