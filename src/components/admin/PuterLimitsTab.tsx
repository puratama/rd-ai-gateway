"use client";

import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertTriangle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface PuterLimitData {
  id: string;
  freeRequestsPerMonth: number;
  freeTokensPerMonth: number;
  appMaxRequestsPerDay: number;
  appMaxTokensPerMonth: number;
  updatedAt: string;
}

const fmtNum = (n: number) => n.toLocaleString("id-ID");

export default function PuterLimitsTab() {
  const [limits, setLimits] = useState<PuterLimitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ freeRequestsPerMonth: "", freeTokensPerMonth: "", appMaxRequestsPerDay: "", appMaxTokensPerMonth: "" });
  const [saving, setSaving] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/puter-limits");
      if (res.ok) {
        const data: PuterLimitData | null = await res.json();
        if (data) {
          setLimits(data);
          setForm({
            freeRequestsPerMonth: String(data.freeRequestsPerMonth),
            freeTokensPerMonth: String(data.freeTokensPerMonth),
            appMaxRequestsPerDay: String(data.appMaxRequestsPerDay),
            appMaxTokensPerMonth: String(data.appMaxTokensPerMonth),
          });
        }
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchLimits(); }, [fetchLimits]);

  const handleSave = async () => {
    setSaving(true);
    setWarnings([]);
    setSaved(false);
    try {
      const res = await fetch("/api/admin/puter-limits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          freeRequestsPerMonth: parseInt(form.freeRequestsPerMonth, 10) || 0,
          freeTokensPerMonth: parseInt(form.freeTokensPerMonth, 10) || 0,
          appMaxRequestsPerDay: parseInt(form.appMaxRequestsPerDay, 10) || 0,
          appMaxTokensPerMonth: parseInt(form.appMaxTokensPerMonth, 10) || 0,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setWarnings(data.warnings || []);
        setLimits(data.record);
        setSaved(true);
      }
    } catch { /* ignore */ }
    setSaving(false);
  };

  const appExceedsFree =
    parseInt(form.appMaxRequestsPerDay, 10) > parseInt(form.freeRequestsPerMonth, 10) ||
    parseInt(form.appMaxTokensPerMonth, 10) > parseInt(form.freeTokensPerMonth, 10);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Free Tier Limits</h2>
          <p className="text-xs text-muted-foreground">Configure Puter free-tier quotas and app-level limits for users.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLimits} className="cursor-pointer">
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Info */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            How it works
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground space-y-1">
          <p><strong>Free Tier Limits</strong> are the maximum quotas users on the free plan can use per period.</p>
          <p><strong>App Limits</strong> are what the app enforces (should be ≤ free tier limits to stay within Puter quotas).</p>
          <p>When a user exceeds their free tier quota, they see a &quot;Quota habis&quot; message and are prompted to buy a package or subscribe.</p>
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Free Tier Limits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Free Tier (Puter) Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Requests / Month</label>
              <Input type="number" value={form.freeRequestsPerMonth} onChange={(e) => setForm((p) => ({ ...p, freeRequestsPerMonth: e.target.value }))} min="0" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Tokens / Month</label>
              <Input type="number" value={form.freeTokensPerMonth} onChange={(e) => setForm((p) => ({ ...p, freeTokensPerMonth: e.target.value }))} min="0" />
            </div>
          </CardContent>
        </Card>

        {/* App Limits */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">App-Enforced Limits</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Requests / Day</label>
              <Input
                type="number"
                value={form.appMaxRequestsPerDay}
                onChange={(e) => setForm((p) => ({ ...p, appMaxRequestsPerDay: e.target.value }))}
                min="0"
                className={parseInt(form.appMaxRequestsPerDay, 10) > parseInt(form.freeRequestsPerMonth, 10) ? "border-amber-500" : ""}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Per day — resets daily</p>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max Tokens / Month</label>
              <Input
                type="number"
                value={form.appMaxTokensPerMonth}
                onChange={(e) => setForm((p) => ({ ...p, appMaxTokensPerMonth: e.target.value }))}
                min="0"
                className={parseInt(form.appMaxTokensPerMonth, 10) > parseInt(form.freeTokensPerMonth, 10) ? "border-amber-500" : ""}
              />
              <p className="text-[10px] text-muted-foreground mt-1">Per month — resets monthly</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning if app exceeds free */}
      {appExceedsFree && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400 flex items-start gap-2">
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>App limits exceed free tier limits. Users may exhaust their free quota before hitting app limits.</span>
        </div>
      )}

      {/* Save */}
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="cursor-pointer">
          {saving ? "Saving..." : "Save Limits"}
        </Button>
        {saved && <span className="text-xs text-emerald-400">Saved successfully.</span>}
      </div>

      {/* Current values summary */}
      {limits && (
        <div className="text-xs text-muted-foreground border-t border-border pt-3">
          Last updated: {new Date(limits.updatedAt).toLocaleString("id-ID")} · Free: {fmtNum(limits.freeRequestsPerMonth)} req/mo, {fmtNum(limits.freeTokensPerMonth)} tok/mo · App: {fmtNum(limits.appMaxRequestsPerDay)} req/day, {fmtNum(limits.appMaxTokensPerMonth)} tok/mo
        </div>
      )}
    </div>
  );
}