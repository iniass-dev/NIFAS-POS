import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";
import DashboardPage from "./pages/DashboardPage";
import ProductsPage from "./pages/ProductsPage";
import UsersPage from "./pages/UsersPage";
import StockPage from "./pages/StockPage";
import SessionsPage from "./pages/SessionsPage";
import RegistersPage from "./pages/RegistersPage";
import StoresPage from "./pages/StoresPage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="stock" element={<StockPage />} />
        <Route path="sessions" element={<SessionsPage />} />
        <Route path="registers" element={<RegistersPage />} />
        <Route path="stores" element={<StoresPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
