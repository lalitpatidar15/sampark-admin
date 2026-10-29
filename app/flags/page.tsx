"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Empty, ErrorNote, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo, useAdminQuery } from "@/lib/hooks";

interface Flag {
  key: string;
  enabled: boolean;
  rolloutPct: number;
  rules: unknown;
  updatedBy: string | null;
  updatedAt: string;
}

export default function FlagsPage() {
  const { user, ready, accessToken } = useAuth();
  const router = useRouter();
  const { data, error, loading, reload } = useAdminQuery<Flag[]>("/admin/feature-flags");
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const toggle = async (flag: Flag) => {
    setBusyKey(flag.key);
    setActionError(null);
    try {
      await api.patch(`/admin/feature-flags/${encodeURIComponent(flag.key)}`, {
        enabled: !flag.enabled,
      }, accessToken);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update the flag");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Shell title="Feature flags">
      <RequirePermission permission="admin.feature.flags">
        <Panel
          title="Flags"
          description="Super-admin only. Every change is written to the audit log with the acting staff member."
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.length ? (
            <Empty>No feature flags defined.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>State</th>
                  <th>Rollout</th>
                  <th>Updated</th>
                  <th>By</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.map((flag) => (
                  <tr key={flag.key}>
                    <td className="font-mono text-xs font-medium">{flag.key}</td>
                    <td>
                      <span
                        className={`badge ${
                          flag.enabled
                            ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                        }`}
                      >
                        {flag.enabled ? "enabled" : "disabled"}
                      </span>
                    </td>
                    <td className="tabular-nums">{flag.rolloutPct}%</td>
                    <td className="text-slate-500">{timeAgo(flag.updatedAt)}</td>
                    <td className="font-mono text-xs text-slate-500">
                      {flag.updatedBy?.slice(0, 8) ?? "—"}
                    </td>
                    <td className="text-right">
                      <button
                        className="btn-ghost"
                        disabled={busyKey === flag.key}
                        onClick={() => void toggle(flag)}
                      >
                        {busyKey === flag.key ? "Saving…" : flag.enabled ? "Disable" : "Enable"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
