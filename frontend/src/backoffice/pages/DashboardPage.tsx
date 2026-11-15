import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { api } from "@/shared/api";
import { formatCFA } from "@/shared/currency";

const COLORS = ["#131a2e", "#f7a720", "#6366f1", "#10b981", "#ef4444"];

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-heading font-bold text-marine mt-1">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const [storeId, setStoreId] = useState<number | "">("");

  const { data: stores = [] } = useQuery({
    queryKey: ["stores"],
    queryFn: () => api.get("/stores/").then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", storeId],
    queryFn: () =>
      api.get("/dashboard/", { params: storeId ? { store_id: storeId } : {} }).then((r) => r.data),
  });

  if (isLoading) return <div className="text-gray-500">Chargement...</div>;
  if (!data) return null;

  const { summary, top_products, revenue_by_day, payment_breakdown } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-marine">Tableau de bord</h1>
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

      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Chiffre d'affaires" value={formatCFA(summary.total_revenue)} />
        <StatCard label="Commandes" value={summary.total_orders.toString()} />
        <StatCard label="Panier moyen" value={formatCFA(summary.average_basket)} />
        <StatCard label="TVA collectée" value={formatCFA(summary.total_tax)} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-marine mb-4">CA par jour</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenue_by_day}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCFA(v)} />
              <Bar dataKey="revenue" fill="#f7a720" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-heading font-semibold text-marine mb-4">Répartition paiements</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={payment_breakdown} dataKey="amount" nameKey="payment_method" cx="50%" cy="50%" outerRadius={80} label>
                {payment_breakdown.map((_: unknown, i: number) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v: number) => formatCFA(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-heading font-semibold text-marine mb-4">Top 10 produits</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="pb-2">Produit</th>
              <th className="pb-2 text-right">Qté vendue</th>
              <th className="pb-2 text-right">CA</th>
            </tr>
          </thead>
          <tbody>
            {top_products.map((p: { product_id: number; product_name: string; qty_sold: number; revenue: number }) => (
              <tr key={p.product_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2">{p.product_name}</td>
                <td className="py-2 text-right">{p.qty_sold}</td>
                <td className="py-2 text-right font-medium">{formatCFA(p.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
