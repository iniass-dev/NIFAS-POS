import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { formatCFA } from "@/shared/currency";

interface Session {
  id: number;
  name: string;
  register_id: number;
  state: string;
  opening_cash: number;
  closing_cash: number | null;
  cash_difference: number | null;
  opened_at: string;
  closed_at: string | null;
  order_count?: number;
  total_sales?: number;
}

const STATE_LABELS: Record<string, string> = { open: "Ouverte", closing: "En clôture", closed: "Fermée" };
const STATE_COLORS: Record<string, string> = {
  open: "bg-green-100 text-green-700",
  closing: "bg-orange-100 text-orange-700",
  closed: "bg-gray-100 text-gray-500",
};

export default function SessionsPage() {
  const [storeId, setStoreId] = useState<number | "">("");

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => api.get("/stores/").then((r) => r.data),
  });

  const { data: sessions = [] } = useQuery<Session[]>({
    queryKey: ["sessions", storeId],
    queryFn: () =>
      api.get("/sessions/", { params: storeId ? { store_id: storeId } : {} }).then((r) => r.data),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-marine">Sessions de caisse</h1>
        <select
          value={storeId}
          onChange={(e) => setStoreId(e.target.value ? parseInt(e.target.value) : "")}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
        >
          <option value="">Tous les magasins</option>
          {stores.map((s: { id: number; name: string }) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Session</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Ouverture</th>
              <th className="px-4 py-3">Clôture</th>
              <th className="px-4 py-3 text-right">Fond d'ouv.</th>
              <th className="px-4 py-3 text-right">Fond clôt.</th>
              <th className="px-4 py-3 text-right">Écart</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATE_COLORS[s.state]}`}>{STATE_LABELS[s.state]}</span>
                </td>
                <td className="px-4 py-3 text-gray-500">{new Date(s.opened_at).toLocaleString("fr-FR")}</td>
                <td className="px-4 py-3 text-gray-500">{s.closed_at ? new Date(s.closed_at).toLocaleString("fr-FR") : "—"}</td>
                <td className="px-4 py-3 text-right">{formatCFA(s.opening_cash)}</td>
                <td className="px-4 py-3 text-right">{s.closing_cash != null ? formatCFA(s.closing_cash) : "—"}</td>
                <td className={`px-4 py-3 text-right font-medium ${s.cash_difference != null && s.cash_difference !== 0 ? "text-red-500" : "text-green-600"}`}>
                  {s.cash_difference != null ? `${s.cash_difference >= 0 ? "+" : ""}${formatCFA(s.cash_difference)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
