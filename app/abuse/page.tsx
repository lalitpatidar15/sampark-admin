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

interface AbuseRow {
  id: string;
  state: string;
  category: string;
  description: string | null;
  reporterPublicId: string | null;
  resolution: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

export default function AbusePage() {
  const { user, ready, accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [state, setState] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAdminQuery<Page<AbuseRow>>(
    `/admin/abuse-reports?page=${page}&limit=25${state ? `&state=${state}` : ""}`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const review = async (row: AbuseRow) => {
    const resolution = window.prompt(`Resolution note for report ${row.category}:`);
    if (resolution === null) return;

    setBusyId(row.id);
    setActionError(null);
    try {
      await api.post(`/admin/abuse-reports/${row.id}/review`, { resolution }, accessToken);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not record the review");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Abuse reports">
      <RequirePermission permission="admin.fraud.manage">
        <Panel
          title="Reported tags and sessions"
          description="Reports carry no scanner identity by design; review with the risk score and session metadata."
          action={
            <select
              className="input w-40"
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All states</option>
              <option value="OPEN">Open</option>
              <option value="UNDER_REVIEW">Under review</option>
              <option value="DISMISSED">Dismissed</option>
              <option value="ACTIONED">Actioned</option>
            </select>
          }
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No abuse reports. Good.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>State</th>
                  <th>Description</th>
                  <th>Reporter</th>
                  <th>Resolution</th>
                  <th>Reported</th>
                  <th>Reviewed</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium">{row.category.replace(/_/g, " ")}</td>
                    <td>
                      <Badge tone={row.state}>{row.state.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="max-w-xs truncate text-slate-600">{row.description ?? "—"}</td>
                    <td className="font-mono text-xs text-slate-500">
                      {row.reporterPublicId ?? "anonymous"}
                    </td>
                    <td className="max-w-xs truncate text-slate-600">{row.resolution ?? "—"}</td>
                    <td className="text-slate-500">{timeAgo(row.createdAt)}</td>
                    <td className="text-slate-500">{timeAgo(row.reviewedAt)}</td>
                    <td className="text-right">
                      {row.state === "OPEN" || row.state === "UNDER_REVIEW" ? (
                        <button
                          className="btn-ghost"
                          disabled={busyId === row.id}
                          onClick={() => void review(row)}
                        >
                          {busyId === row.id ? "Saving…" : "Review"}
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
