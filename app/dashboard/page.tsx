"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shell } from "@/components/shell";
import { Empty, ErrorNote, Panel, Stat } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useAdminQuery } from "@/lib/hooks";

interface Dashboard {
  users: number;
  activeTags: number;
  last24h: { scannerSessions: number; communications: number };
  emergencyAlertsOpen: number;
  supportTicketsOpen: number;
  communicationsByChannel: Record<string, number>;
  viewerRole: string;
}

export default function DashboardPage() {
  const { user, ready, accessToken } = useAuth();
  const router = useRouter();
  const { data, error, loading } = useAdminQuery<Dashboard>("/admin/dashboard");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !accessToken) return null;

  const channels = Object.entries(data?.communicationsByChannel ?? {}).sort((a, b) => b[1] - a[1]);

  return (
    <Shell title="Dashboard">
      {error ? <ErrorNote>{error}</ErrorNote> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active tags" value={data?.activeTags ?? "—"} hint="Live and scannable" />
        <Stat label="Active users" value={data?.users ?? "—"} hint="All accounts" />
        <Stat
          label="Scans (24h)"
          value={data?.last24h?.scannerSessions ?? "—"}
          hint="Public tag scans"
        />
        <Stat
          label="Emergencies open"
          value={data?.emergencyAlertsOpen ?? "—"}
          hint="Awaiting action"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Relay sessions by channel (24h)"
          description="How visitors are reaching owners"
        >
          {loading ? (
            <Empty>Loading…</Empty>
          ) : !channels.length ? (
            <Empty>No relay sessions in the last 24 hours.</Empty>
          ) : (
            <ul className="space-y-2">
              {channels.map(([channel, count]) => {
                const max = channels[0]?.[1] ?? 1;
                return (
                  <li key={channel} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 font-medium">{channel}</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <span
                        className="block h-full rounded-full bg-brand-500"
                        style={{ width: `${Math.round((count / max) * 100)}%` }}
                      />
                    </span>
                    <span className="w-8 shrink-0 text-right tabular-nums text-slate-600">
                      {count}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Operations" description="Queue depths for the current shift">
          {loading ? (
            <Empty>Loading…</Empty>
          ) : (
            <table className="table">
              <tbody>
                <tr>
                  <td>Relay sessions (24h)</td>
                  <td className="text-right tabular-nums">{data?.last24h?.communications ?? "—"}</td>
                </tr>
                <tr>
                  <td>Open support tickets</td>
                  <td className="text-right tabular-nums">{data?.supportTicketsOpen ?? "—"}</td>
                </tr>
                <tr>
                  <td>Open emergencies</td>
                  <td className="text-right tabular-nums">{data?.emergencyAlertsOpen ?? "—"}</td>
                </tr>
                <tr>
                  <td>Viewing as</td>
                  <td className="text-right">{data?.viewerRole?.replace(/_/g, " ") ?? "—"}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
