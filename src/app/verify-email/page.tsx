import Link from "next/link";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import AuthBrand from "@/components/auth/AuthBrand";

export const dynamic = "force-dynamic";

type View = "invalid" | "expired" | "success";

const VIEWS: Record<
  View,
  { icon: typeof CheckCircle2; iconClass: string; title: string; message: string; ctaText: string; ctaHref: string }
> = {
  invalid: {
    icon: XCircle,
    iconClass: "bg-destructive/10 text-destructive",
    title: "Token tidak valid",
    message: "Link verifikasi tidak ditemukan. Silakan daftar ulang untuk mendapatkan link baru.",
    ctaText: "Daftar Ulang",
    ctaHref: "/register",
  },
  expired: {
    icon: Clock,
    iconClass: "bg-warning/10 text-warning",
    title: "Link kedaluwarsa",
    message: "Link verifikasi sudah tidak berlaku (valid 24 jam). Coba login — dari sana kamu bisa kirim ulang email verifikasi.",
    ctaText: "Login",
    ctaHref: "/login",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "bg-success/10 text-success",
    title: "Email Terverifikasi",
    message: "Akun kamu sudah aktif. Kamu akan dialihkan ke halaman login.",
    ctaText: "Login Sekarang",
    ctaHref: "/login",
  },
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  let view: View = "invalid";

  if (typeof token === "string" && token) {
    const user = await prisma.user.findUnique({ where: { verifyToken: token } });
    if (user) {
      if (user.verifyExpiresAt && user.verifyExpiresAt >= new Date()) {
        await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified: new Date(), verifyToken: null, verifyExpiresAt: null },
        });
        view = "success";
      } else {
        view = "expired";
      }
    }
  }

  const v = VIEWS[view];
  const Icon = v.icon;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,color-mix(in_oklch,var(--color-primary)_18%,transparent),transparent_30rem),linear-gradient(180deg,var(--color-background),color-mix(in_oklch,var(--color-background)_78%,var(--color-card)))] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <AuthBrand />

        <Card className="bg-card ring-1 ring-border/40">
          <CardContent className="pt-8 text-center">
            <div className={`w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center ${v.iconClass}`}>
              <Icon className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight mb-2">{v.title}</h2>
            <p className="text-sm text-muted-foreground mb-6">{v.message}</p>
            <Link href={v.ctaHref} className={buttonVariants({ size: "lg", className: "w-full" })}>
              {v.ctaText}
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
