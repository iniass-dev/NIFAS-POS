import { NavLink, Outlet } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import clsx from "clsx";

const nav = [
  { to: "/", label: "Dashboard", exact: true },
  { to: "/stores", label: "Magasins" },
  { to: "/products", label: "Produits" },
  { to: "/stock", label: "Stock" },
  { to: "/sessions", label: "Sessions" },
  { to: "/users", label: "Utilisateurs" },
  { to: "/registers", label: "Paiements" },
];

export default function Layout() {
  const { user, logout } = useAuthStore();

  return (
    <div className="flex h-screen bg-gray-50 font-body">
      {/* Sidebar */}
      <aside className="w-56 flex flex-col bg-marine text-white">
        <div className="px-6 py-5 border-b border-white/10">
          <span className="font-heading text-xl text-gold">NIFAS</span>
          <p className="text-xs text-white/50 mt-0.5">Gestion</p>
        </div>
        <nav className="flex-1 py-4 space-y-1 px-3">
          {nav.map(({ to, label, exact }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                clsx(
                  "block px-3 py-2 rounded-md text-sm transition-colors",
                  isActive ? "bg-gold text-marine font-semibold" : "text-white/70 hover:bg-white/10"
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-4 border-t border-white/10 text-xs text-white/50">
          <p className="font-medium text-white/80">{user?.user_name}</p>
          <p>{user?.role}</p>
          <button onClick={logout} className="mt-2 text-gold hover:underline">
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
