import { Link, NavLink, Outlet } from "react-router-dom";
import { CreditCard, Gauge, LogOut, PiggyBank, UserCog, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";

// Each section carries its own accent so the active state is colour-coded to match
// its page header (Dashboard=indigo, Transactions=sky, Goals=emerald, Account=violet).
const links = [
  {
    to: "/",
    label: "Dashboard",
    icon: Gauge,
    end: true,
    active: "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm",
    pill: "bg-brand-50 text-brand-600",
  },
  {
    to: "/transactions",
    label: "Transactions",
    icon: CreditCard,
    end: false,
    active: "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm",
    pill: "bg-sky-50 text-sky-600",
  },
  {
    to: "/goals",
    label: "Goals",
    icon: PiggyBank,
    end: false,
    active: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm",
    pill: "bg-emerald-50 text-emerald-700",
  },
  {
    to: "/profile",
    label: "Account",
    icon: UserCog,
    end: false,
    active: "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm",
    pill: "bg-violet-50 text-violet-600",
  },
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
                  isActive ? l.active : "text-body hover:bg-slate-50"
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
              className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-12 items-center justify-center rounded-full transition ${
                      isActive ? l.pill : "text-muted"
                    }`}
                  >
                    <l.icon className="h-5 w-5" />
                  </span>
                  <span className={isActive ? l.pill.split(" ")[1] : "text-muted"}>{l.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
