"use client";

import { useCallback, useEffect, useState } from "react";
import { api, unwrap } from "./api";
import { useAuth } from "./auth";

interface QueryState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Fetches an admin endpoint whenever the path or the signed-in token changes.
 *
 * Requests are abandoned on unmount or when the path changes, so a slow response
 * for a previous filter can never overwrite the current page's rows.
 */
export function useAdminQuery<T>(path: string | null): QueryState<T> {
  const { accessToken, user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    if (!path || !accessToken) return;

    let active = true;
    setLoading(true);
    setError(null);

    api
      .get<T>(path, accessToken)
      .then((result) => {
        if (!active) return;
        setData(unwrap(result));
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Request failed");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [path, accessToken, nonce, user?.publicId]);

  return { data, error, loading, reload };
}

/** Renders a short relative time, falling back to a dash for missing values. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.round((Date.now() - then) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(then).toLocaleDateString();
}
