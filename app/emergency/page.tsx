"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Badge, Empty, ErrorNote, Pager, Panel } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { timeAgo, useAdminQuery } from "@/lib/hooks";

interface Page<T> {
  items: T[];
  meta: { page: number; totalPages: number; total: number };
}

interface EmergencyRow {
  id: string;
  status: string;
  reasonCode: string | null;
  riskScore: number;
  notifiedContactIds: string[];
  createdAt: string;
  resolvedAt: string | null;
  ownerId: string;
  scannerSession: {
    riskState: string;
    phoneVerified: boolean;
    tag: { publicTagId: string; tagType: string; status: string } | null;
  };
}

export default function EmergenciesPage() {
  const { user, ready, accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("RAISED");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAdminQuery<Page<EmergencyRow>>(
    `/admin/emergencies?page=${page}&limit=25${status ? `&status=${status}` : ""}`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const resolve = async (row: EmergencyRow) => {
    const note = window.prompt("Closing note (recorded in the audit log):");
    if (note === null) return;

    setBusyId(row.id);
    setActionError(null);
    try {
      await api.post(`/admin/emergencies/${row.id}/resolve`, { note }, accessToken);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not resolve the alert");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Emergencies">
      <RequirePermission permission="admin.communications.read">
        <Panel
          title="Emergency alerts"
          description="Raised anonymously by strangers scanning a tag. Scanner identity and the free-text note are not stored for staff to read."
          action={
            <select
              className="input w-40"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="RAISED">Raised</option>
              <option value="RESOLVED">Resolved</option>
              <option value="">All</option>
            </select>
          }
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No alerts with this status.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Tag</th>
                  <th>Reason</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>Scanner verified</th>
                  <th>Contacts reached</th>
                  <th>Raised</th>
                  <th>Resolved</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">
                      {row.scannerSession.tag?.publicTagId ?? "—"}
                    </td>
                    <td className="font-medium">{row.reasonCode?.replace(/_/g, " ") ?? "—"}</td>
                    <td>
                      <Badge tone={row.status}>{row.status}</Badge>
                    </td>
                    <td>
                      <span
                        className={
                          row.riskScore >= 60
                            ? "font-medium text-red-600"
                            : row.riskScore >= 30
                              ? "font-medium text-amber-600"
                              : "text-slate-600"
                        }
                      >
                        {row.riskScore} ({row.scannerSession.riskState})
                      </span>
                    </td>
                    <td className="text-slate-600">
                      {row.scannerSession.phoneVerified ? "yes" : "no"}
                    </td>
                    <td className="tabular-nums">{row.notifiedContactIds.length}</td>
                    <td className="text-slate-500">{timeAgo(row.createdAt)}</td>
                    <td className="text-slate-500">{timeAgo(row.resolvedAt)}</td>
                    <td className="text-right">
                      {row.status !== "RESOLVED" ? (
                        <button
                          className="btn-ghost"
                          disabled={busyId === row.id}
                          onClick={() => void resolve(row)}
                        >
                          {busyId === row.id ? "Saving…" : "Resolve"}
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data ? (
            <Pager
              page={data.meta.page}
              totalPages={data.meta.totalPages}
              total={data.meta.total}
              onChange={setPage}
            />
          ) : null}
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
