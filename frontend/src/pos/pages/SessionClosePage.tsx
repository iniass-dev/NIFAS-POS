import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/shared/api";
import { usePosStore } from "@/shared/store/posStore";
import { formatCFA } from "@/shared/currency";

export default function SessionClosePage() {
  const navigate = useNavigate();
  const { session_id, setSession } = usePosStore();
  const [closingCash, setClosingCash] = useState("0");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleClose(e: React.FormEvent) {
    e.preventDefault();
    if (!session_id) return;
    setLoading(true);
    try {
      const { data } = await api.post(`/sessions/${session_id}/close`, {
        closing_cash: parseFloat(closingCash),
        notes: notes || null,
      });
      toast.success("Session clôturée");
      const diff = data.cash_difference ?? 0;
      if (diff !== 0) toast(`Écart de caisse : ${diff >= 0 ? "+" : ""}${formatCFA(diff)}`, { icon: diff >= 0 ? "✅" : "⚠️" });
      setSession(0, 0);
      navigate("/login");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Erreur lors de la clôture";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-marine flex items-center justify-center font-body">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <h1 className="font-heading text-2xl text-marine mb-1">Clôture de caisse</h1>
        <p className="text-sm text-gray-500 mb-6">Session #{session_id}</p>
        <form onSubmit={handleClose} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fond de caisse final compté (FCFA)</label>
            <input
              type="number"
              step="1"
              min="0"
              required
              value={closingCash}
              onChange={(e) => setClosingCash(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 text-lg text-center focus:outline-none focus:border-gold"
            />
          </div>
          <textarea
            placeholder="Notes (optionnel)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-gold resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" disabled={loading} className="flex-1 bg-gold text-marine font-heading font-bold py-3 rounded-xl hover:bg-yellow-500 disabled:opacity-50">
              {loading ? "Clôture..." : "Clôturer la session"}
            </button>
            <button type="button" onClick={() => navigate("/pos")} className="px-4 border-2 rounded-xl text-gray-500 hover:bg-gray-50">
              ←
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
