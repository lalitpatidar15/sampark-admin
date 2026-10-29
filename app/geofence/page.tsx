"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Badge, Empty, ErrorNote, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, unwrap } from "@/lib/api";
import { useAdminQuery } from "@/lib/hooks";

interface GeoRow {
  id: string;
  tagId: string;
  publicTagId: string;
  tagType: string;
  tagStatus: string;
  ownerId: string;
  radiusMeters: number;
  enabled: boolean;
  alertOnProximity: boolean;
  lastTriggeredAt: string | null;
  createdAt: string;
}

interface Page<T> {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
}

export default function GeofencePage() {
  const { user, ready, accessToken } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading, reload } = useAdminQuery<Page<GeoRow>>(
    `/admin/geofences?page=${page}&limit=25`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const upsert = async (tagId: string) => {
    const lat = window.prompt("Center latitude (e.g. 19.0760):");
    if (!lat) return;
    const lng = window.prompt("Center longitude (e.g. 72.8777):");
    if (!lng) return;
    const radius = window.prompt("Radius in meters (default 150):", "150");
    if (!radius) return;
    setBusyId(tagId);
    setError(null);
    try {
      await api.post(
        `/admin/geofences/${tagId}`,
        { latitude: parseFloat(lat), longitude: parseFloat(lng), radiusMeters: parseInt(radius, 10) || 150 },
        accessToken,
      );
      setNotice("Geo-fence saved");
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to save geo-fence");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (tagId: string) => {
    if (!window.confirm("Remove the geo-fence from this tag?")) return;
    setBusyId(tagId);
    setError(null);
    try {
      await api.delete(`/admin/geofences/${tagId}`, accessToken);
      setNotice("Geo-fence removed");
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to remove geo-fence");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Geo-fence Management">
      <RequirePermission permission="admin.geofence.manage">
        <Panel
          title="Geo-fences"
          description="Circular proximity boundaries per tag. Proximity alerts fire when a scanner enters the radius."
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
            <Empty>No geo-fences configured yet.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Public Tag ID</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Owner</th>
                  <th className="text-left">Radius (m)</th>
                  <th className="text-left">Enabled</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.publicTagId}</td>
                    <td className="text-xs">{row.tagType}</td>
                    <td className="text-xs">
                      <Badge tone={row.tagStatus === "ACTIVE" ? "ACTIVE" : "CREATED"}>
                        {row.tagStatus}
                      </Badge>
                    </td>
                    <td className="text-xs">{row.ownerId}</td>
                    <td className="font-mono text-xs">{row.radiusMeters}</td>
                    <td className="text-xs">
                      {row.enabled ? "Yes" : "No"}
                    </td>
                    <td className="text-right gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white disabled:opacity-50"
                        disabled={busyId === row.id}
                        onClick={() => upsert(row.tagId)}
                      >
                        Configure
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700 disabled:opacity-50"
                        disabled={busyId === row.id}
                        onClick={() => remove(row.tagId)}
                      >
                        Remove
                      </button>
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
            Page {page} of {data?.meta.totalPages ?? 1} ({data?.meta.total ?? 0} geo-fences)
          </p>
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
