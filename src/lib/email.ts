import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

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
  return `${base}/api/auth/verify-email?token=${token}`;
}

export function buildVerifyHtml(verifyUrl: string): string {
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <h2>Verifikasi Email</h2>
      <p>Klik tombol di bawah untuk verifikasi akun Anda:</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;border-radius:6px;margin:16px 0">
        Verifikasi Email
      </a>
      <p style="color:#888;font-size:13px">Link kedaluwarsa dalam 24 jam. Abaikan jika bukan Anda.</p>
    </div>`;
}
