"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Empty, ErrorNote, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { useAdminQuery } from "@/lib/hooks";

interface InventoryRow {
  id: string;
  productId: string;
  product: {
    id: string;
    sku: string;
    name: string;
    price: number;
  };
  quantityOnHand: number;
  quantityReserved: number;
}

export default function InventoryPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const { data, loading, reload } = useAdminQuery<{ items: InventoryRow[] }>(
    "/admin/inventory",
  );

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready) return null;

  const receive = async (productId: string) => {
    const qty = window.prompt("Quantity received:");
    if (!qty) return;
    const quantity = parseInt(qty, 10);
    if (!quantity || quantity <= 0) {
      setError("Enter a valid quantity");
      return;
    }
    setBusyId(productId);
    setError(null);
    try {
      await api.post("/admin/inventory/receive", { productId, quantity }, undefined);
      setNotice("Inventory received");
      reload();
    } catch (err: any) {
      setError(err.message ?? "Failed to receive inventory");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Shell title="Inventory">
      <RequirePermission permission="store.inventory.read">
        <Panel title="Stock" description="Physical tag inventory by product.">
          {error && <ErrorNote>{error}</ErrorNote>}
          {notice && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {notice}
            </p>
          )}

          {loading && !data ? (
            <Empty>Loading…</Empty>
          ) : !data?.items.length ? (
            <Empty>No inventory configured yet.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th className="text-left">SKU</th>
                  <th className="text-left">Product</th>
                  <th className="text-right">On Hand</th>
                  <th className="text-right">Reserved</th>
                  <th className="text-right">Available</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((row) => (
                  <tr key={row.id}>
                    <td className="font-mono text-xs">{row.product.sku}</td>
                    <td className="text-xs">{row.product.name}</td>
                    <td className="font-mono text-xs text-right">{row.quantityOnHand}</td>
                    <td className="font-mono text-xs text-right">{row.quantityReserved}</td>
                    <td className="font-mono text-xs text-right">
                      {row.quantityOnHand - row.quantityReserved}
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white disabled:opacity-50"
                        disabled={busyId === row.productId}
                        onClick={() => receive(row.productId)}
                      >
                        Receive Stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
