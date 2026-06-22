import { Link, NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, LogOut, PiggyBank, Receipt, UserRound, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/transactions", label: "Transactions", icon: Receipt, end: false },
  { to: "/goals", label: "Goals", icon: PiggyBank, end: false },
  { to: "/profile", label: "Account", icon: UserRound, end: false },
];

export function Layout() {
  const { user, logout } = useAuth();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-24 pt-6 sm:px-6 md:pb-8">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold text-ink">Finovia</span>
        </div>

        {/* Desktop / tablet primary nav */}
        <nav className="hidden items-center gap-1 rounded-2xl border border-line bg-white/80 p-1 shadow-sm backdrop-blur md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive ? "bg-brand-600 text-white shadow-sm" : "text-body hover:bg-slate-50"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              <span>{l.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/profile"
            className="hidden items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-3 shadow-sm transition hover:bg-slate-50 md:flex"
            title="Account"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700">
              {initial}
            </span>
            <span className="max-w-[12rem] truncate text-xs text-body">{user?.email}</span>
          </Link>
          <button className="btn-ghost px-3" onClick={() => logout()} title="Sign out">
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto flex max-w-6xl items-stretch justify-around">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition ${
                  isActive ? "text-brand-600" : "text-muted"
                }`
              }
            >
              <l.icon className="h-5 w-5" />
              {l.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
