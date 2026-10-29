"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RequirePermission, Shell } from "@/components/shell";
import { Badge, ErrorNote, Panel } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, unwrap } from "@/lib/api";

export default function MfaPage() {
  const { user, ready, accessToken } = useAuth();
  const router = useRouter();
  const [stage, setStage] = useState<"status" | "setup" | "verify">("status");
  const [mfa, setMfa] = useState<{
    enabled: boolean;
    uri?: string;
    recoveryCodes?: string[];
    showingCodes: boolean;
  }>({ enabled: false, showingCodes: false });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.get<{ enabled: boolean }>("/auth/mfa/status", accessToken);
      const data = unwrap(result);
      setMfa((prev) => ({ ...prev, enabled: data.enabled }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load MFA status");
    } finally {
      setBusy(false);
    }
  }, [accessToken]);

  useEffect(() => {
    load();
  }, [load]);

  const startSetup = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ uri: string; recoveryCodes: string[] }>(
        "/auth/mfa/setup",
        {},
        accessToken,
      );
      const data = unwrap(result);
      setMfa((prev) => ({
        ...prev,
        uri: data.uri,
        recoveryCodes: data.recoveryCodes,
        showingCodes: true,
      }));
      setStage("setup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start MFA setup");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/mfa/confirm", { token: code }, accessToken);
      setMfa((prev) => ({ ...prev, enabled: true }));
      setStage("status");
      setNotice("MFA is now enabled. Keep your recovery codes in a safe place.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid MFA code");
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code: string) => {
    setBusy(true);
    setError(null);
    try {
      const result = await api.post<{ valid: boolean }>(
        "/auth/mfa/verify",
        { token: code },
        accessToken,
      );
      const data = unwrap(result);
      if (data.valid) {
        setNotice("MFA code verified.");
      } else {
        setError("Invalid MFA code");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!window.confirm("Disable MFA for this account?")) return;
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/mfa/disable", {}, accessToken);
      setMfa((prev) => ({ ...prev, enabled: false, uri: undefined, recoveryCodes: undefined }));
      setStage("status");
      setNotice("MFA disabled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not disable MFA");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <Shell title="Multi-factor authentication">
      <RequirePermission permission="admin.mfa.manage">
        <Panel
          title="Authenticator app (TOTP)"
          description="Add a time-based one-time password as a second factor for admin sign-in and sensitive operations."
        >
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {notice && (
            <p className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
              {notice}
            </p>
          )}

          {mfa.enabled ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Badge tone={mfa.enabled ? "ACTIVE" : "CREATED"}>Enabled</Badge>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  disabled={busy}
                  onClick={disable}
                >
                  Disable MFA
                </button>
              </div>
              <p className="text-sm text-slate-600">
                A valid authenticator code will be required when signing in and
                before sensitive admin actions. Recovery codes shown during setup
                are single-use; regenerate them by re-running setup.
              </p>
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-500 mb-1">
                  Verify a code
                </p>
                <div className="flex gap-2">
                  <input
                    id="mfa-code"
                    type="text"
                    maxLength={6}
                    className="border border-slate-300 rounded-md px-3 py-2 text-sm w-32 text-center"
                    placeholder="123456"
                  />
                  <button
                    type="button"
                    className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={busy}
                    onClick={() => {
                      const el = document.getElementById("mfa-code") as
                        | HTMLInputElement
                        | null;
                      verify(el?.value.trim() ?? "");
                    }}
                  >
                    Verify
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Badge tone="CREATED">Not enabled</Badge>
              {stage === "setup" && mfa.recoveryCodes ? (
                <>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      Setup key (enter manually in your authenticator app)
                    </p>
                  <div className="flex gap-2 items-end mb-2">
                    <input
                      readOnly
                      value={mfa.uri ?? ""}
                      className="border border-slate-300 rounded-md px-3 py-2 text-xs break-all flex-1"
                    />
                      <button
                        type="button"
                        className="rounded-md bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                        onClick={() => {
                          navigator.clipboard.writeText(mfa.uri ?? "").then(() =>
                            setNotice("Provisioning URI copied"),
                          );
                        }}
                      >
                        Copy URI
                      </button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 mb-1">
                      Recovery codes (save these — shown only once)
                    </p>
                    <div className="grid grid-cols-4 gap-2 text-xs font-mono">
                      {mfa.recoveryCodes.map((code, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded border bg-slate-100"
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Each recovery code can be used once in place of an
                      authenticator code.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id="mfa-confirm"
                      type="text"
                      maxLength={6}
                      className="border border-slate-300 rounded-md px-3 py-2 text-sm w-32 text-center"
                      placeholder="123456"
                    />
                    <button
                      type="button"
                      className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                      disabled={busy}
                      onClick={() => {
                        const el = document.getElementById("mfa-confirm") as
                          | HTMLInputElement
                          | null;
                        confirm(el?.value.trim() ?? "");
                      }}
                    >
                      Enable MFA
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                    disabled={busy}
                    onClick={startSetup}
                  >
                    Set up MFA
                  </button>
                  <button
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setStage("verify")}
                  >
                    Verify existing code
                  </button>
                </div>
              )}
            </>
          )}
        </Panel>
      </RequirePermission>
    </Shell>
  );
}
