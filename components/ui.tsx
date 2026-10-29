"use client";

import type { ReactNode } from "react";

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  const tones: Record<string, string> = {
    ACTIVE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    CREATED: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
    PENDING: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    RAISED: "bg-red-50 text-red-700 ring-1 ring-red-200",
    ACKNOWLEDGED: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    RESOLVED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    CLOSED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    COMPLETED: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    FAILED: "bg-red-50 text-red-700 ring-1 ring-red-200",
    SUSPENDED: "bg-red-50 text-red-700 ring-1 ring-red-200",
    DEACTIVATED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    OPEN: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    UNDER_REVIEW: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    DISMISSED: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    HIGH: "bg-red-50 text-red-700 ring-1 ring-red-200",
    MEDIUM: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    LOW: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  };
  return <span className={`badge ${tones[tone] ?? tones.CREATED}`}>{children}</span>;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-slate-500">{children}</p>;
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {children}
    </p>
  );
}

export function Pager({
  page,
  totalPages,
  total,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-slate-500">
        Page {page} of {Math.max(totalPages, 1)} · {total} total
      </span>
      <div className="flex gap-2">
        <button className="btn-ghost" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button className="btn-ghost" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
