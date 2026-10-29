"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Empty, ErrorNote, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAdminQuery } from "@/lib/hooks";

interface OrderItemRow {
  id: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
  total: number;
  tagSerial: string | null;
}

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  customerName: string | null;
  items: OrderItemRow[];
  address: {
    name: string;
    phone: string;
    addressLines: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  payments: Array<{ provider: string; status: string; amount: number }>;
  shipments: Array<{ carrier: string; trackingNumber: string | null; status: string }>;
}

function statusLabel(status: string) {
  const tones: Record<string, string> = {
    CREATED: "bg-slate-100 text-slate-700",
    CONFIRMED: "bg-blue-50 text-blue-700",
    PACKED: "bg-amber-50 text-amber-700",
    SHIPPED: "bg-blue-50 text-blue-700",
    DELIVERED: "bg-emerald-50 text-emerald-700",
    CANCELLED: "bg-red-50 text-red-700",
    REFUNDED: "bg-red-50 text-red-700",
  };
  return (
    <span
      className={`text-xs font-semibold px-2 py-1 rounded-full ${tones[status] ?? tones.CREATED}`}
    >
      {status}
    </span>
  );
}

export default function OrdersPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, loading, reload } = useAdminQuery<{ items: OrderRow[]; meta: any }>(
    `/admin/orders?page=${page}&limit=25${statusFilter ? `&status=${statusFilter}` : ""}`,
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const assignTag = async (orderItemId: string) => {
    setBusyId(orderItemId);
    setError(null);
    try {
      await api.post(`/admin/orders/${orderItemId}/assign-tag`, { orderItemId }, undefined);
      setError(null);
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to assign tag");
    } finally {
      setBusyId(null);
    }
  };

  const shipOrder = async (orderId: string) => {
    const carrier = window.prompt("Carrier (e.g. Blue Dart, India Post):");
    if (!carrier) return;
    const tracking = window.prompt("Tracking number (optional):");
    setBusyId(orderId);
    setError(null);
    try {
      await api.post(
        `/admin/orders/${orderId}/ship`,
        { carrier, trackingNumber: tracking || undefined },
        undefined,
      );
      setError(null);
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to ship order");
    } finally {
      setBusyId(null);
    }
  };

  const changeStatus = async (orderId: string, status: string) => {
    setBusyId(orderId);
    setError(null);
    try {
      await api.patch(`/admin/orders/${orderId}/status`, { status }, undefined);
      setError(null);
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to update status");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Tag Orders">
      <RequirePermission permission="store.orders.read">
        <Panel title="Orders" description="All tag orders across the platform.">
          {error && <ErrorNote>{error}</ErrorNote>}

          <div className="flex gap-2 mb-4">
            <select
              className="input w-48"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="CREATED">Created</option>
              <option value="CONFIRMED">Confirmed (Paid)</option>
              <option value="PACKED">Packed</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button
              type="button"
              className="input ml-2"
              onClick={() => reload()}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No orders match this filter.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">Order</th>
                  <th className="text-left">Customer</th>
                  <th className="text-left">Status</th>
                  <th className="text-right">Total</th>
                  <th className="text-left">Items</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((order) => (
                  <tr key={order.id}>
                    <td className="font-mono text-xs">{order.orderNumber}</td>
                    <td className="text-xs">{order.customerName ?? "—"}</td>
                    <td className="text-xs">{statusLabel(order.status)}</td>
                    <td className="font-mono text-xs text-right">
                      {(order.total / 100).toFixed(2)} {order.currency}
                    </td>
                    <td className="text-xs">
                      {order.items
                        .map((i) => `${i.quantity}× ${i.productName}`)
                        .join(", ")}
                    </td>
                    <td className="text-right gap-1">
                      {order.status === "CONFIRMED" && order.items.some((i) => !i.tagSerial) ? (
                        <button
                          type="button"
                          className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                          disabled={busyId === order.id}
                          onClick={() => {
                            const item = order.items.find((i) => !i.tagSerial);
                            if (item) assignTag(item.id);
                          }}
                        >
                          Assign Tag
                        </button>
                      ) : null}
                      {order.status === "CONFIRMED" ? (
                        <button
                          type="button"
                          className="rounded-md bg-slate-900 px-2 py-1 text-xs text-white disabled:opacity-50"
                          disabled={busyId === order.id}
                          onClick={() => shipOrder(order.id)}
                        >
                          Ship
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                        onClick={() => changeStatus(order.id, "CANCELLED")}
                      >
                        Cancel
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
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
              disabled={!data?.meta.hasNext}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
