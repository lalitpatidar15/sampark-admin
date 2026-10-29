"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Badge, Empty, ErrorNote, Pager, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { timeAgo, useAdminQuery } from "@/lib/hooks";

interface Page<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

interface UserRow {
  id: string;
  publicId: string;
  role: string;
  status: string;
  phoneLookupHmac: string;
  enabledChannels: string[];
  lastLoginAt: string | null;
  createdAt: string;
}

/**
 * Shows the tail of the phone HMAC rather than a number.
 *
 * Support must be able to confirm which account a caller means without ever
 * learning the number, so the API only ever returns this fragment.
 */
function hmacHint(hmac: string): string {
  return hmac ? `…${hmac.slice(-6)}` : "—";
}

export default function UsersPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, error, loading } = useAdminQuery<Page<UserRow>>(
    `/admin/users?page=${page}&limit=25${status ? `&status=${status}` : ""}`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  return (
    <Shell title="Users">
      <RequirePermission permission="admin.users.read">
        <Panel
          title="Accounts"
          description="Staff-safe projection: no names, numbers or emails are returned by this endpoint."
          action={
            <select
              className="input w-40"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="PENDING_VERIFICATION">Pending</option>
            </select>
          }
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No users match this filter.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Public ID</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Channels</th>
                  <th>Phone ref</th>
                  <th>Last seen</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.publicId}</td>
                    <td>{row.role.replace(/_/g, " ")}</td>
                    <td>
                      <Badge tone={row.status}>{row.status.replace(/_/g, " ")}</Badge>
                    </td>
                    <td className="text-slate-600">
                      {row.enabledChannels.length ? row.enabledChannels.join(", ") : "none"}
                    </td>
                    <td className="font-mono text-xs text-slate-500">{hmacHint(row.phoneLookupHmac)}</td>
                    <td className="text-slate-500">{timeAgo(row.lastLoginAt)}</td>
                    <td className="text-slate-500">{timeAgo(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {data ? (
            <Pager page={data.meta.page} totalPages={data.meta.totalPages} total={data.meta.total} onChange={setPage} />
          ) : null}
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
