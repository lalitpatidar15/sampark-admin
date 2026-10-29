"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Badge, Empty, ErrorNote, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, unwrap } from "@/lib/api";
import { useAdminQuery } from "@/lib/hooks";

interface NfcRow {
  id: string;
  publicTagId: string;
  tagType: string;
  status: string;
  nfcUidHash: string | null;
  nfcUidTail: string | null;
  ownerId: string;
  createdAt: string;
}

interface Page<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export default function NfcPage() {
  const { user, ready, accessToken, can } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading, reload } = useAdminQuery<Page<NfcRow>>(
    `/admin/nfc?page=${page}&limit=25`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const linkNfc = async (tagId: string) => {
    const uid = window.prompt("Enter the NFC UID to bind to this tag:");
    if (!uid) return;
    setBusyId(tagId);
    setError(null);
    try {
      await api.post(`/admin/nfc/${tagId}/link`, { nfcUid: uid }, accessToken);
      setNotice("NFC UID linked");
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to link NFC UID");
    } finally {
      setBusyId(null);
    }
  };

  const unlinkNfc = async (tagId: string) => {
    if (!window.confirm("Unlink the NFC UID from this tag?")) return;
    setBusyId(tagId);
    setError(null);
    try {
      await api.delete(`/admin/nfc/${tagId}`, accessToken);
      setNotice("NFC UID unlinked");
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to unlink NFC UID");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="NFC Tag Management">
      <RequirePermission permission="admin.nfc.manage">
        <Panel
          title="NFC Tags"
          description="Bind NFC UIDs to tags so a tap opens the tag's public page. UIDs are hashed before storage."
        >
          {error && <ErrorNote>{error}</ErrorNote>}
          {notice && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {notice}
            </p>
          )}
          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No tags have an NFC UID linked yet.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Public Tag ID</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Owner</th>
                  <th className="text-left">NFC UID (tail)</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.publicTagId}</td>
                    <td className="text-xs">{row.tagType}</td>
                    <td className="text-xs">
                      <Badge tone={row.status === "ACTIVE" ? "ACTIVE" : "CREATED"}>
                        {row.status}
                      </Badge>
                    </td>
                    <td className="text-xs">{row.ownerId}</td>
                    <td className="font-mono text-xs">{row.nfcUidTail ?? "—"}</td>
                    <td className="text-right gap-2">
                      {row.nfcUidHash ? (
                        <button
                          type="button"
                          className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
                          disabled={busyId === row.id}
                          onClick={() => unlinkNfc(row.id)}
                        >
                          Unlink
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                          disabled={busyId === row.id}
                          onClick={() => linkNfc(row.id)}
                        >
                          Link NFC
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
              disabled={busyId !== null}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
              }}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
              disabled={!data?.meta.hasNext || busyId !== null}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Page {page} of {data?.meta.totalPages ?? 1} ({data?.meta.total ?? 0} tags)
          </p>
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
