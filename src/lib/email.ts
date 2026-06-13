import { Resend } from "resend";
import nodemailer from "nodemailer";

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

// Resend sender — defaults to resend.dev test address which works without domain setup
const resendFrom = process.env.RESEND_FROM || "DeskGuard <onboarding@resend.dev>";

// SMTP config
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || "DeskGuard <otp@deskguard.college>";

export async function sendOtpEmail(email: string, code: string, name?: string) {
  const subject = `${code} is your DeskGuard verification code`;
  const textBody = `Hello ${name || "Student"},\n\nYour DeskGuard verification code is: ${code}\n\nThis code will expire in 5 minutes.\n\nBest regards,\nDeskGuard Team`;
  const htmlBody = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px; background-color: #ffffff; color: #171717;">
      <h2 style="font-size: 24px; font-weight: bold; margin-bottom: 24px; color: #000000; text-align: center;">DeskGuard</h2>
      <p style="font-size: 16px; line-height: 24px; color: #374151;">Hello ${name || "Student"},</p>
      <p style="font-size: 16px; line-height: 24px; color: #374151;">Use the verification code below to sign in to your DeskGuard account:</p>
      <div style="text-align: center; margin: 32px 0;">
        <span style="font-family: monospace; font-size: 36px; font-weight: bold; letter-spacing: 4px; background-color: #f3f4f6; padding: 12px 24px; border-radius: 6px; color: #000000; border: 1px solid #e5e7eb;">${code}</span>
      </div>
      <p style="font-size: 14px; line-height: 20px; color: #6b7280; text-align: center;">This code will expire in 5 minutes. If you did not request this code, please ignore this email.</p>
      <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 32px 0 16px 0;" />
      <p style="font-size: 12px; line-height: 16px; color: #9ca3af; text-align: center; margin: 0;">DeskGuard © ${new Date().getFullYear()} College Library Seat Management</p>
    </div>
  `;

  // 1. Try Resend
  if (resend) {
    try {
      console.log(`[Email] Sending via Resend to ${email} from ${resendFrom}...`);
      const result = await resend.emails.send({
        from: resendFrom,
        to: email,
        subject: subject,
        html: htmlBody,
      });
      console.log("[Email] Resend result:", result);
      return { success: true, provider: "resend" };
    } catch (error) {
      console.error("[Email] Resend delivery failed:", error);
    }
  }

  // 2. Try Nodemailer / SMTP
  if (smtpHost && smtpUser && smtpPass) {
    try {
      console.log(`[Email] Sending via SMTP to ${email}...`);
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465, // true for 465, false for other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: subject,
        text: textBody,
        html: htmlBody,
      });
      return { success: true, provider: "smtp" };
    } catch (error) {
      console.error("[Email] SMTP delivery failed:", error);
    }
  }

  // 3. Fallback: Console logging
  console.log("\n==================================================");
  console.log("🔑 [DESKGUARD LOCAL DEV OTP FALLBACK]");
  console.log(`📧 Target Email: ${email}`);
  console.log(`🔐 Verification Code: ${code}`);
  console.log(`👤 Name: ${name || "N/A"}`);
  console.log("⚠️ No SMTP or Resend credentials set in env. Please configure RESEND_API_KEY or SMTP_* to send real emails.");
  console.log("==================================================\n");

  return { success: true, provider: "console_fallback", code };
}
