"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

interface NavItem {
  href: string;
  label: string;
  permission?: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/users", label: "Users", permission: "admin.users.read" },
  { href: "/tags", label: "Tags", permission: "admin.tags.read" },
  { href: "/communications", label: "Communications", permission: "admin.communications.read" },
  { href: "/emergency", label: "Emergencies", permission: "admin.communications.read" },
  { href: "/abuse", label: "Abuse reports", permission: "admin.fraud.manage" },
  { href: "/audit", label: "Audit log", permission: "admin.audit.read" },
  { href: "/flags", label: "Feature flags", permission: "admin.feature.flags" },
  { href: "/mfa", label: "MFA", permission: "admin.mfa.manage" },
  { href: "/nfc", label: "NFC Tags", permission: "admin.nfc.manage" },
  { href: "/geofence", label: "Geo-fences", permission: "admin.geofence.manage" },
  { href: "/store/orders", label: "Orders", permission: "store.orders.read" },
  { href: "/store/inventory", label: "Inventory", permission: "store.inventory.read" },
  { href: "/store/revenue", label: "Revenue", permission: "store.revenue.read" },
];

export function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  const { user, permissions, logout, can } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const visible = NAV.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="min-h-screen lg:flex">
      <aside className="border-b border-slate-200 bg-white lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            S
          </span>
          <div>
            <p className="text-sm font-semibold leading-tight">Sampark</p>
            <p className="text-xs text-slate-500">Operations console</p>
          </div>
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col">
          {visible.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-3">
          <h1 className="text-lg font-semibold">{title}</h1>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs leading-tight">
              <p className="font-medium">{user?.name ?? user?.publicId}</p>
              <p className="text-slate-500">{user?.role.replace(/_/g, " ")}</p>
            </div>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                logout();
                router.push("/login");
              }}
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-5 p-5">
          <p className="text-xs text-slate-500">
            {permissions.length} permission{permissions.length === 1 ? "" : "s"} granted to this role.
            Views are filtered to what your role can read.
          </p>
          {children}
        </main>
      </div>
    </div>
  );
}

/** Gate for pages the signed-in role may not open. */
export function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) {
    return (
      <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Your role does not have <code className="font-mono">{permission}</code>. Ask a super admin if
        you need it.
      </p>
    );
  }
  return <>{children}</>;
}
