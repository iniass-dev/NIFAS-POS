import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/shared/api";

interface StockLevel {
  product_id: number;
  product_name: string;
  barcode: string | null;
  qty_on_hand: number;
}

export default function StockPage() {
  const qc = useQueryClient();
  const [adjusting, setAdjusting] = useState<StockLevel | null>(null);
  const [newQty, setNewQty] = useState("");
  const [note, setNote] = useState("");

  const { data: levels = [] } = useQuery<StockLevel[]>({
    queryKey: ["stock-levels"],
    queryFn: () => api.get("/stock/levels").then((r) => r.data),
  });

  const adjust = useMutation({
    mutationFn: (data: { product_id: number; qty: number; note?: string }) => api.post("/stock/adjust", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock-levels"] });
      toast.success("Stock ajusté");
      setAdjusting(null);
      setNewQty("");
      setNote("");
    },
    onError: () => toast.error("Erreur lors de l'ajustement"),
  });

  function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjusting) return;
    adjust.mutate({ product_id: adjusting.product_id, qty: parseFloat(newQty), note: note || undefined });
  }

  return (
    <div className="space-y-4">
      <h1 className="font-heading text-2xl text-marine">Stock</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Code-barres</th>
              <th className="px-4 py-3 text-right">Stock actuel</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {levels.map((l) => (
              <tr key={l.product_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{l.product_name}</td>
                <td className="px-4 py-3 text-gray-500">{l.barcode ?? "—"}</td>
                <td className={`px-4 py-3 text-right font-semibold ${l.qty_on_hand < 0 ? "text-red-500" : l.qty_on_hand === 0 ? "text-orange-500" : "text-green-600"}`}>
                  {l.qty_on_hand}
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setAdjusting(l); setNewQty(String(l.qty_on_hand)); }} className="text-gold hover:underline text-xs">
                    Ajuster
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-1">Ajuster le stock</h2>
            <p className="text-sm text-gray-500 mb-4">{adjusting.product_name}</p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Quantité théorique</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">Stock actuel : {adjusting.qty_on_hand}</p>
              </div>
              <input
                placeholder="Motif (optionnel)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm hover:bg-yellow-500">Confirmer</button>
                <button type="button" onClick={() => setAdjusting(null)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
