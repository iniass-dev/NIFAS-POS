import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/shared/api";

interface Register { id: number; name: string; description: string | null; active: boolean; }
interface PaymentMethod { id: number; name: string; type: string; active: boolean; sequence: number; }

const PM_TYPES = ["cash", "card", "check", "transfer", "voucher", "other"];
const PM_TYPE_LABELS: Record<string, string> = { cash: "Espèces", card: "Carte bancaire", check: "Chèque", transfer: "Virement", voucher: "Bon d'achat", other: "Autre" };

export default function RegistersPage() {
  const qc = useQueryClient();
  const [showRegForm, setShowRegForm] = useState(false);
  const [showPmForm, setShowPmForm] = useState(false);

  const { data: registers = [] } = useQuery<Register[]>({ queryKey: ["registers"], queryFn: () => api.get("/registers/").then((r) => r.data) });
  const { data: paymentMethods = [] } = useQuery<PaymentMethod[]>({ queryKey: ["payment-methods"], queryFn: () => api.get("/registers/payment-methods").then((r) => r.data) });

  const createRegister = useMutation({
    mutationFn: (d: { name: string; description: string }) => api.post("/registers/", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["registers"] }); toast.success("Caisse créée"); setShowRegForm(false); },
    onError: () => toast.error("Erreur"),
  });

  const createPm = useMutation({
    mutationFn: (d: { name: string; type: string; sequence: number }) => api.post("/registers/payment-methods", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["payment-methods"] }); toast.success("Mode de paiement créé"); setShowPmForm(false); },
    onError: () => toast.error("Erreur"),
  });

  return (
    <div className="space-y-6">
      <h1 className="font-heading text-2xl text-marine">Caisses & Paiements</h1>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-marine">Caisses</h2>
            <button onClick={() => setShowRegForm(true)} className="text-xs bg-gold text-marine font-semibold px-3 py-1.5 rounded-lg hover:bg-yellow-500">+ Ajouter</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {registers.map((r) => (
              <div key={r.id} className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-500">{r.description}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{r.active ? "Active" : "Inactive"}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-marine">Modes de paiement</h2>
            <button onClick={() => setShowPmForm(true)} className="text-xs bg-gold text-marine font-semibold px-3 py-1.5 rounded-lg hover:bg-yellow-500">+ Ajouter</button>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {paymentMethods.map((pm) => (
              <div key={pm.id} className="px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{pm.name}</p>
                  <p className="text-xs text-gray-500">{PM_TYPE_LABELS[pm.type] ?? pm.type}</p>
                </div>
                <span className="text-xs text-gray-400">#{pm.sequence}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showRegForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-4">Nouvelle caisse</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createRegister.mutate({ name: fd.get("name") as string, description: fd.get("description") as string }); }} className="space-y-3">
              <input name="name" required placeholder="Nom de la caisse *" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="description" placeholder="Description" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm">Créer</button>
                <button type="button" onClick={() => setShowRegForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPmForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-4">Nouveau mode de paiement</h2>
            <form onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); createPm.mutate({ name: fd.get("name") as string, type: fd.get("type") as string, sequence: parseInt(fd.get("sequence") as string) || 10 }); }} className="space-y-3">
              <input name="name" required placeholder="Libellé *" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <select name="type" className="w-full border rounded-lg px-3 py-2 text-sm">
                {PM_TYPES.map((t) => <option key={t} value={t}>{PM_TYPE_LABELS[t]}</option>)}
              </select>
              <input name="sequence" type="number" placeholder="Ordre (10)" defaultValue="10" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm">Créer</button>
                <button type="button" onClick={() => setShowPmForm(false)} className="flex-1 border py-2 rounded-lg text-sm">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
