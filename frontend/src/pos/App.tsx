import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/shared/store/authStore";
import PinLoginPage from "./pages/PinLoginPage";
import SessionOpenPage from "./pages/SessionOpenPage";
import PosScreen from "./pages/PosScreen";
import SessionClosePage from "./pages/SessionClosePage";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<PinLoginPage />} />
      <Route path="/open-session" element={<ProtectedRoute><SessionOpenPage /></ProtectedRoute>} />
      <Route path="/pos" element={<ProtectedRoute><PosScreen /></ProtectedRoute>} />
      <Route path="/close-session" element={<ProtectedRoute><SessionClosePage /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
