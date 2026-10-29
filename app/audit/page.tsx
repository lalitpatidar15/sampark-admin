"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Empty, ErrorNote, Pager, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { timeAgo, useAdminQuery } from "@/lib/hooks";

interface Page<T> {
  items: T[];
  meta: { page: number; totalPages: number; total: number };
}

interface AuditRow {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  ipHash: string | null;
  metadata: unknown;
  createdAt: string;
}

export default function AuditPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");

  const { data, error, loading } = useAdminQuery<Page<AuditRow>>(
    `/admin/audit-logs?page=${page}&limit=50${action ? `&action=${encodeURIComponent(action)}` : ""}`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  return (
    <Shell title="Audit log">
      <RequirePermission permission="admin.audit.read">
        <Panel
          title="Audit trail"
          description="Append-only record of privileged actions. Actor IPs are stored as hashes, not addresses."
          action={
            <input
              className="input w-56"
              placeholder="Filter by action, e.g. tag.suspend"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
            />
          }
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No audit entries match.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="whitespace-nowrap text-slate-500">{timeAgo(row.createdAt)}</td>
                    <td className="font-mono text-xs font-medium">{row.action}</td>
                    <td className="text-slate-600">
                      {row.resourceType ? `${row.resourceType}/${row.resourceId ?? "—"}` : "—"}
                    </td>
                    <td className="font-mono text-xs text-slate-500">
                      {row.actorUserId?.slice(0, 8) ?? "system"}
                    </td>
                    <td className="max-w-sm">
                      <code className="block truncate text-xs text-slate-500">
                        {row.metadata ? JSON.stringify(row.metadata) : "—"}
                      </code>
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
