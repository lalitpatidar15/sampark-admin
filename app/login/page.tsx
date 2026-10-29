"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ErrorNote } from "@/components/ui";

export default function LoginPage() {
  const { requestOtp, verifyOtp, user, ready, error } = useAuth();
  const router = useRouter();

  const [phone, setPhone] = React.useState("");
  const [code, setCode] = React.useState("");
  const [stage, setStage] = React.useState<"phone" | "code">("phone");
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [localError, setLocalError] = React.useState<string | null>(null);

  useEffect(() => {
    if (ready && user) router.replace("/dashboard");
  }, [ready, user, router]);

  const sendCode = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setLocalError(null);
    setNotice(null);
    try {
      const result = await requestOtp(phone);
      setStage("code");
      setNotice(
        result.devCode
          ? `Local mock provider: your code is ${result.devCode}`
          : `Code sent. You can request another in ${result.resendAfterSeconds}s.`,
      );
      if (result.devCode) setCode(result.devCode);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not send a code");
    } finally {
      setBusy(false);
    }
  };

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setLocalError(null);
    try {
      await verifyOtp(phone, code);
      router.replace("/dashboard");
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-600 text-lg font-bold text-white">
            S
          </span>
          <div>
            <h1 className="text-lg font-semibold">Sampark Admin</h1>
            <p className="text-sm text-slate-500">Staff sign in</p>
          </div>
        </div>

        <div className="panel space-y-4">
          {localError ? <ErrorNote>{localError}</ErrorNote> : null}
          {error ? <ErrorNote>{error}</ErrorNote> : null}
          {notice ? (
            <p className="rounded-lg border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-700">
              {notice}
            </p>
          ) : null}

          {stage === "phone" ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <label className="label" htmlFor="phone">
                  Staff mobile number
                </label>
                <input
                  id="phone"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="9000000001"
                  inputMode="numeric"
                  autoComplete="tel"
                  required
                />
              </div>
              <button className="btn-primary w-full" disabled={busy || phone.length < 10}>
                {busy ? "Sending…" : "Send code"}
              </button>
              <p className="text-xs text-slate-500">
                Seeded staff numbers: 9000000001 (admin), 9000000002 (support), 9000000003 (operator).
                Owner numbers cannot sign in here.
              </p>
            </form>
          ) : (
            <form onSubmit={signIn} className="space-y-4">
              <div>
                <label className="label" htmlFor="code">
                  Verification code
                </label>
                <input
                  id="code"
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                />
              </div>
              <button className="btn-primary w-full" disabled={busy || code.length !== 6}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              <button
                type="button"
                className="btn-ghost w-full"
                onClick={() => {
                  setStage("phone");
                  setCode("");
                  setNotice(null);
                }}
              >
                Use a different number
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
