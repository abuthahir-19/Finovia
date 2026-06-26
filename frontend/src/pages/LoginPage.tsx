import { useState } from "react";
import { BarChart3, Lightbulb, PiggyBank, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

export function LoginPage() {
  const { loginEmail, registerEmail, loginGoogle } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await loginEmail(email, password);
      else await registerEmail(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
        {/* Brand / value panel */}
        <div className="hidden flex-col justify-between p-12 lg:flex">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Wallet className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-ink">Finovia</span>
          </div>

          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-semibold leading-tight text-ink">
              Take control of your money, beautifully.
            </h1>
            <p className="text-body">
              Track expenses and income, set savings goals, and get clear, actionable insights —
              all in one clean dashboard.
            </p>
            <ul className="space-y-3">
              {[
                { icon: BarChart3, text: "Visual analytics & spending breakdowns" },
                { icon: PiggyBank, text: "Goal tracking with progress at a glance" },
                { icon: Lightbulb, text: "Smart, rule-based budgeting insights" },
              ].map((f) => (
                <li key={f.text} className="flex items-center gap-3 text-sm text-body">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-card">
                    <f.icon className="h-4 w-4 text-brand-600" />
                  </span>
                  {f.text}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-muted">© {new Date().getFullYear()} Finovia</p>
        </div>

        {/* Auth card */}
        <div className="flex items-center justify-center p-6">
          <div className="card w-full max-w-sm space-y-5 shadow-pop">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm lg:hidden">
                <Wallet className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {mode === "login" ? "Sign in to continue" : "Start tracking in seconds"}
              </p>
            </div>

            <form onSubmit={submit} className="space-y-3">
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              {error && <p className="text-sm text-expense">{error}</p>}
              <button className="btn-primary w-full" disabled={busy}>
                {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              or
              <span className="h-px flex-1 bg-line" />
            </div>

            <button className="btn-ghost w-full" onClick={() => loginGoogle()}>
              Continue with Google
            </button>

            <p className="text-center text-sm text-muted">
              {mode === "login" ? "No account?" : "Already have an account?"}{" "}
              <button
                className="font-medium text-brand-600 hover:underline"
                onClick={() => setMode(mode === "login" ? "register" : "login")}
              >
                {mode === "login" ? "Sign up" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
    </div>
  );
}
