import nodemailer from "nodemailer";
import { getSiteSettings } from "@/lib/site-settings";

let transporter: nodemailer.Transporter | null = null;

/** Nama situs dari admin settings (untuk subject email). */
export async function getSiteName(): Promise<string> {
  const s = await getSiteSettings();
  return s.siteName;
}

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && port && user && pass) {
    transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: { user, pass },
    });
  }
  return transporter;
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> {
  const tr = getTransporter();

  if (tr) {
    await tr.sendMail({
      from: process.env.SMTP_FROM || `noreply@${new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").host}`,
      to,
      subject,
      html,
    });
    return;
  }

  // Dev fallback: log to console
  console.log("=".repeat(60));
  console.log(`📧 EMAIL TO: ${to}`);
  console.log(`📧 SUBJECT: ${subject}`);
  console.log("-".repeat(60));
  console.log(html.replace(/<[^>]+>/g, ""));
  console.log("=".repeat(60));
}

export function getVerifyUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/verify-email?token=${token}`;
}

export function getResetUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/reset-password?token=${token}`;
}

const BRAND_COLOR = "#6366f1"; // ikut --color-primary app

/** Kerangka email branded dari site settings (nama, logo, tagline). */
async function layoutHtml(body: string): Promise<string> {
  const s = await getSiteSettings();
  const showLogo = s.logoMode !== "name";
  const showName = s.logoMode !== "logo";

  // logoUrl bisa relatif ("/uploads/logo.png") — resolve ke URL absolut agar bisa dimuat email client.
  const base = (s.baseUrl || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  const logoSrc = s.logoUrl.trim()
    ? /^https?:\/\//i.test(s.logoUrl)
      ? s.logoUrl
      : `${base}${s.logoUrl.startsWith("/") ? "" : "/"}${s.logoUrl}`
    : "";

  const mark = logoSrc
    ? `<img src="${logoSrc}" alt="${s.siteName}" style="height:36px;width:auto;max-width:180px;vertical-align:middle;"/>`
    : `<span style="display:inline-block;width:36px;height:36px;border-radius:10px;background:linear-gradient(135deg,#6366f1,#d946ef);"></span>`;
  const nameHtml = showName
    ? `<span style="font-size:18px;font-weight:700;color:#18181b;margin-left:10px;vertical-align:middle;">${s.siteName}</span>`
    : "";

  return `
    <div style="background:#f4f4f5;padding:40px 16px;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7;">
        <div style="padding:28px 32px;border-bottom:1px solid #f0f0f1;text-align:center;">
          ${showLogo ? mark : ""}${nameHtml}
        </div>
        <div style="padding:32px;color:#3f3f46;font-size:14px;line-height:1.7;">
          ${body}
        </div>
        <div style="padding:20px 32px;background:#fafafa;border-top:1px solid #f0f0f1;color:#a1a1aa;font-size:12px;text-align:center;">
          ${s.siteName}${s.tagline ? ` · ${s.tagline}` : ""}
        </div>
      </div>
    </div>`;
}

function ctaButton(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;margin:16px 0;">${label}</a>`;
}

export async function buildVerifyHtml(verifyUrl: string): Promise<string> {
  const body = `
    <h1 style="font-size:20px;color:#18181b;margin:0 0 12px;">Verifikasi email kamu</h1>
    <p style="margin:0 0 8px;">Terima kasih sudah mendaftar. Klik tombol di bawah untuk mengaktifkan akun kamu:</p>
    ${ctaButton(verifyUrl, "Verifikasi Email")}
    <p style="color:#a1a1aa;font-size:13px;margin:0;">Link berlaku 24 jam. Abaikan email ini jika bukan kamu yang mendaftar.</p>`;
  return layoutHtml(body);
}

export async function buildResetHtml(resetUrl: string): Promise<string> {
  const body = `
    <h1 style="font-size:20px;color:#18181b;margin:0 0 12px;">Reset password</h1>
    <p style="margin:0 0 8px;">Kami menerima permintaan reset password untuk akun kamu. Klik tombol di bawah untuk membuat password baru:</p>
    ${ctaButton(resetUrl, "Reset Password")}
    <p style="color:#a1a1aa;font-size:13px;margin:0;">Link berlaku 1 jam. Abaikan email ini jika bukan kamu yang meminta.</p>`;
  return layoutHtml(body);
}
