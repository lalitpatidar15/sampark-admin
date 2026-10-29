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
  meta: { page: number; totalPages: number; total: number; hasNext: boolean; hasPrev: boolean };
}

interface TagRow {
  id: string;
  publicTagId: string;
  tagType: string;
  status: string;
  label: string | null;
  activatedAt: string | null;
  createdAt: string;
  owner: { publicId: string; role: string; status: string };
  asset: { assetType: string; displayName: string } | null;
  _count: { scannerSessions: number; communicationSessions: number };
}

export default function TagsPage() {
  const { user, ready, accessToken, can } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, error, loading, reload } = useAdminQuery<Page<TagRow>>(
    `/admin/tags?page=${page}&limit=25${status ? `&status=${status}` : ""}`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const suspend = async (row: TagRow) => {
    const reason = window.prompt(
      `Suspend tag ${row.publicTagId}?\n\nA reason is recorded in the audit log and shown to the owner.`,
    );
    if (!reason) return;

    setBusyId(row.id);
    setActionError(null);
    try {
      await api.post(`/admin/tags/${row.id}/suspend`, { reason }, accessToken);
      reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not suspend the tag");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Tags">
      <RequirePermission permission="admin.tags.read">
        <Panel
          title="Tags"
          description="Public tokens are never returned here, only opaque public IDs."
          action={
            <select
              className="input w-44"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="DEACTIVATED">Deactivated</option>
              <option value="CREATED">Created</option>
            </select>
          }
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {actionError ? <ErrorNote>{actionError}</ErrorNote> : null}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No tags match this filter.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Public tag</th>
                  <th>Type</th>
                  <th>Asset</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Scans</th>
                  <th>Sessions</th>
                  <th>Activated</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.publicTagId}</td>
                    <td>{row.tagType}</td>
                    <td className="text-slate-600">{row.asset?.displayName ?? "—"}</td>
                    <td className="font-mono text-xs text-slate-500">{row.owner.publicId}</td>
                    <td>
                      <Badge tone={row.status}>{row.status}</Badge>
                    </td>
                    <td className="tabular-nums">{row._count.scannerSessions}</td>
                    <td className="tabular-nums">{row._count.communicationSessions}</td>
                    <td className="text-slate-500">{timeAgo(row.activatedAt)}</td>
                    <td className="text-right">
                      {can("admin.tags.suspend") && row.status === "ACTIVE" ? (
                        <button
                          className="btn-danger"
                          disabled={busyId === row.id}
                          onClick={() => void suspend(row)}
                        >
                          {busyId === row.id ? "Working…" : "Suspend"}
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
