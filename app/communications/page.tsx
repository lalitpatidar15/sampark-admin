"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Badge, Empty, ErrorNote, Pager, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { timeAgo, useAdminQuery } from "@/lib/hooks";

interface Page<T> {
  items: T[];
  meta: { page: number; totalPages: number; total: number };
}

interface SessionRow {
  id: string;
  publicSessionId: string;
  channel: string;
  status: string;
  reasonCode: string | null;
  provider: string | null;
  riskScore: number;
  requiresOtp: boolean;
  startedAt: string | null;
  createdAt: string;
  tag: { publicTagId: string; tagType: string } | null;
  owner: { publicId: string };
  _count: { messages: number };
}

export default function CommunicationsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [channel, setChannel] = useState("");
  const [status, setStatus] = useState("");

  const query = new URLSearchParams({ page: String(page), limit: "25" });
  if (channel) query.set("channel", channel);
  if (status) query.set("status", status);

  const { data, error, loading } = useAdminQuery<Page<SessionRow>>(`/admin/communications?${query}`);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  return (
    <Shell title="Communications">
      <RequirePermission permission="admin.communications.read">
        <Panel
          title="Relay sessions"
          description="Metadata only. Message bodies, relay numbers and both parties' numbers are not exposed to this console."
          action={
            <div className="flex gap-2">
              <select
                className="input w-36"
                value={channel}
                onChange={(e) => {
                  setChannel(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All channels</option>
                {["VOICE", "SMS", "WHATSAPP", "CHAT", "VIDEO"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <select
                className="input w-36"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All statuses</option>
                {["PENDING", "ACTIVE", "COMPLETED", "EXPIRED", "CLOSED", "FAILED"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          }
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No relay sessions match this filter.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Channel</th>
                  <th>Reason</th>
                  <th>Tag</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Risk</th>
                  <th>OTP</th>
                  <th>Msgs</th>
                  <th>Started</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.publicSessionId}</td>
                    <td>{row.channel}</td>
                    <td className="text-slate-600">{row.reasonCode?.replace(/_/g, " ") ?? "—"}</td>
                    <td className="font-mono text-xs text-slate-500">
                      {row.tag?.publicTagId ?? "—"}
                    </td>
                    <td className="font-mono text-xs text-slate-500">{row.owner.publicId}</td>
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
                        {row.riskScore}
                      </span>
                    </td>
                    <td className="text-slate-500">{row.requiresOtp ? "required" : "—"}</td>
                    <td className="tabular-nums">{row._count.messages}</td>
                    <td className="text-slate-500">{timeAgo(row.startedAt ?? row.createdAt)}</td>
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
