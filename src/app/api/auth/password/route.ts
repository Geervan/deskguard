import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth";
import crypto from "crypto";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const emailKey = email.toLowerCase();
    const hashedPassword = hashPassword(password);

    // Find User
    let user = await prisma.user.findUnique({
      where: { email: emailKey }
    });

    if (!user) {
      // Create user (Sign up)
      const isLibrarian = emailKey.includes("librarian") || emailKey.includes("admin");
      const resolvedRole = isLibrarian ? "LIBRARIAN" as const : "STUDENT" as const;
      let displayName = name || emailKey.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

      user = await prisma.user.create({
        data: {
          email: emailKey,
          name: displayName,
          role: resolvedRole,
          password: hashedPassword
        }
      });
    } else {
      // Existing User
      if (user.password) {
        // Validate password
        if (user.password !== hashedPassword) {
          return NextResponse.json(
            { success: false, error: "Invalid email or password" },
            { status: 401 }
          );
        }
      } else {
        // Set password for users that were only created via OTP previously
        user = await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedPassword }
        });
      }

      // Optionally update name if we didn't have it and it's provided now
      if (name && !user.name) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { name }
        });
      }
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
    console.error("Failed to authenticate with password:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
