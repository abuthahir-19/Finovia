import { Link, NavLink, Outlet } from "react-router-dom";
import { CreditCard, Eye, EyeOff, Gauge, Landmark, LogOut, PiggyBank, UserCog, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { usePrivacy } from "../lib/privacy";

const links = [
  {
    to: "/",
    label: "Dashboard",
    icon: Gauge,
    end: true,
    active: "bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-sm",
    pill: "bg-brand-50 text-brand-600",
    pillText: "text-brand-600",
  },
  {
    to: "/transactions",
    label: "Transactions",
    icon: CreditCard,
    end: false,
    active: "bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-sm",
    pill: "bg-sky-50 text-sky-600",
    pillText: "text-sky-600",
  },
  {
    to: "/goals",
    label: "Goals",
    icon: PiggyBank,
    end: false,
    active: "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm",
    pill: "bg-emerald-50 text-emerald-700",
    pillText: "text-emerald-700",
  },
  {
    to: "/budgets",
    label: "Budgets",
    icon: Landmark,
    end: false,
    active: "bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm",
    pill: "bg-amber-50 text-amber-600",
    pillText: "text-amber-600",
  },
  {
    to: "/profile",
    label: "Account",
    icon: UserCog,
    end: false,
    active: "bg-gradient-to-br from-violet-500 to-violet-600 text-white shadow-sm",
    pill: "bg-violet-50 text-violet-600",
    pillText: "text-violet-600",
  },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { isPrivate, toggle } = usePrivacy();
  const initial = (user?.email ?? "?").charAt(0).toUpperCase();

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-24 pt-6 sm:px-6 md:pb-8 xl:max-w-[90%]">
      <header className="mb-8 flex items-center justify-between gap-4">

        {/* Brand mark */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-indigo-600 text-white shadow-sm ring-1 ring-brand-700/20">
            <Wallet className="h-[18px] w-[18px]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-ink">Finovia</span>
        </div>

        {/* Desktop / tablet primary nav */}
        <nav className="hidden items-center gap-0.5 rounded-2xl border border-line bg-white/90 p-1 shadow-soft backdrop-blur-md md:flex">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm font-medium transition-all lg:px-3.5 ${
                  isActive ? l.active : "text-body hover:bg-slate-50 hover:text-ink"
                }`
              }
            >
              <l.icon className="h-4 w-4" />
              <span className="hidden lg:inline">{l.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-1.5">
          {/* Privacy toggle — tinted pill when active */}
          <button
            onClick={toggle}
            title={isPrivate ? "Show amounts" : "Hide amounts"}
            className={`btn-ghost inline-flex items-center gap-1.5 px-3 py-2 text-sm ${
              isPrivate
                ? "border-brand-200 bg-brand-50 text-brand-600 hover:bg-brand-100"
                : ""
            }`}
          >
            {isPrivate ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden xl:inline font-medium">
              {isPrivate ? "Show" : "Hide"}
            </span>
          </button>

          {/* User avatar pill (desktop) */}
          <Link
            to="/profile"
            className="hidden items-center gap-2 rounded-full border border-line bg-white py-1 pl-1 pr-1 shadow-soft transition hover:bg-slate-50 md:flex xl:pr-3"
            title="Account"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white shadow-sm">
              {initial}
            </span>
            <span className="hidden max-w-[10rem] truncate text-xs text-body xl:inline">{user?.email}</span>
          </Link>

          <button
            className="btn-ghost px-3"
            onClick={() => logout()}
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden xl:inline">Sign out</span>
          </button>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white/95 backdrop-blur-md md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid w-full grid-cols-5">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition"
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-12 items-center justify-center rounded-xl transition-all ${
                      isActive ? `${l.pill} shadow-sm` : "text-muted"
                    }`}
                  >
                    <l.icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className={`transition ${isActive ? l.pillText : "text-muted"}`}>
                    {l.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
