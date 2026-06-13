import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendOtpEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invalid email address structure" },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Clean up older OTPs for this email
    await prisma.otp.deleteMany({
      where: { email: email.toLowerCase() }
    });

    // Store in database
    await prisma.otp.create({
      data: {
        email: email.toLowerCase(),
        code: otpCode,
        expiresAt
      }
    });

    // Send email
    const emailResult = await sendOtpEmail(email, otpCode, name);

    return NextResponse.json({
      success: true,
      message: `OTP sent successfully to ${email}.`,
      provider: emailResult.provider,
      // Dev helper: return the code if running locally without mail setup
      code: emailResult.provider === "console_fallback" ? otpCode : undefined
    });
  } catch (error: any) {
    console.error("Failed to send OTP:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
