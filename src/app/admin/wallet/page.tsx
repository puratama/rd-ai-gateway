"use client";

import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import WalletTab from "@/components/admin/WalletTab";

function AdminWalletPageContent() {
  return (
    <AppShell variant="admin">
      <div className="h-full overflow-auto p-6 space-y-4">
        <WalletTab />
      </div>
    </AppShell>
  );
}

export default function AdminWalletPage() {
  return (
    <Suspense fallback={
      <AppShell variant="admin">
        <div className="flex h-full items-center justify-center">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </AppShell>
    }>
      <AdminWalletPageContent />
    </Suspense>
  );
}
