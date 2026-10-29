"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Empty, ErrorNote, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useAdminQuery } from "@/lib/hooks";

interface Revenue {
  grossSalesPaise: number;
  refundsPaise: number;
  netSalesPaise: number;
  orderCount: number;
}

export default function RevenuePage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<Revenue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
    if (ready) {
      setLoading(true);
      fetch("/api/admin/revenue", {
        headers: { authorization: `Bearer ${localStorage.getItem("sampark.admin.session") || ""}` },
      })
        .then((r) => r.json())
        .then((res) => {
          setData(res.data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message ?? "Failed to load revenue");
          setLoading(false);
        });
    }
  }, [ready]);

  if (!ready) return null;
  if (loading) return <Empty>Loading…</Empty>;

  const format = (paise: number) => (paise / 100).toFixed(2);

  return (
    <Shell title="Revenue">
      <RequirePermission permission="store.revenue.read">
        <Panel title="Revenue" description="Gross sales, refunds, and net sales (paise → currency).">
          {error && <ErrorNote>{error}</ErrorNote>}
          {!data && <Empty>No data.</Empty>}
          {data && (
            <table className="table">
              <tbody>
                <tr>
                  <td className="text-left text-slate-600 text-sm">Gross sales</td>
                  <td className="font-mono text-right text-sm">{format(data.grossSalesPaise)} INR</td>
                </tr>
                <tr>
                  <td className="text-left text-slate-600 text-sm">Refunds</td>
                  <td className="font-mono text-right text-sm text-red-700">-{format(data.refundsPaise)} INR</td>
                </tr>
                <tr>
                  <td className="text-left text-slate-600 text-sm">Net sales</td>
                  <td className="font-mono text-right text-sm font-semibold">{format(data.netSalesPaise)} INR</td>
                </tr>
                <tr>
                  <td className="text-left text-slate-600 text-sm">Paid orders</td>
                  <td className="font-mono text-right text-sm">{data.orderCount}</td>
                </tr>
              </tbody>
            </table>
          )}
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
