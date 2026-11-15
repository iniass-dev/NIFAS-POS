import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/shared/api";
import { formatCFA } from "@/shared/currency";

const REGISTER_ID = parseInt(window.localStorage.getItem("register_id") ?? "1");

interface PaymentLine {
  payment_method_id: number;
  payment_method_name: string;
  amount: number;
}

interface Props {
  total: number;
  onConfirm: (payments: { payment_method_id: number; amount: number }[]) => void;
  onClose: () => void;
  loading: boolean;
}

export default function PaymentModal({ total, onConfirm, onClose, loading }: Props) {
  const totalInt = Math.round(total);
  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [cashInput, setCashInput] = useState(totalInt.toString());
  const submitted = useRef(false);

  const { data: methods = [] } = useQuery({
    queryKey: ["register-pm", REGISTER_ID],
    queryFn: () => api.get(`/registers/${REGISTER_ID}/payment-methods`).then((r) => r.data),
  });

  // Reset anti-double-clic quand la mutation se termine (succès ou erreur)
  useEffect(() => {
    if (!loading) submitted.current = false;
  }, [loading]);

  // Si un seul paiement Espèces et que l'utilisateur modifie le champ → mettre à jour le montant en temps réel
  useEffect(() => {
    if (payments.length !== 1) return;
    const pm = methods.find((m: { id: number; type: string }) => m.id === payments[0].payment_method_id);
    if (pm?.type !== "cash") return;
    const v = parseInt(cashInput) || 0;
    if (v > 0 && v !== payments[0].amount) {
      setPayments([{ ...payments[0], amount: v }]);
    }
  }, [cashInput]);

  const totalPaid = Math.round(payments.reduce((s, p) => s + p.amount, 0));
  const remaining = Math.max(0, totalInt - totalPaid);
  const change = Math.max(0, totalPaid - totalInt);
  const inputAmount = parseInt(cashInput) || 0;

  function addPayment(method: { id: number; name: string; type: string }) {
    if (remaining <= 0) return;
    const isCash = method.type === "cash";
    // Espèces : le client peut payer plus (rendu monnaie). Autres : plafonné au reste.
    const amount = isCash ? (inputAmount || remaining) : Math.min(inputAmount || remaining, remaining);
    setPayments((prev) => {
      const existing = prev.find((p) => p.payment_method_id === method.id);
      if (existing) {
        return prev.map((p) =>
          p.payment_method_id === method.id ? { ...p, amount: p.amount + amount } : p
        );
      }
      return [...prev, { payment_method_id: method.id, payment_method_name: method.name, amount }];
    });
    const newRemaining = Math.max(0, remaining - amount);
    setCashInput(newRemaining > 0 ? newRemaining.toString() : "0");
  }

  function removePayment(id: number) {
    const removed = payments.find((p) => p.payment_method_id === id);
    setPayments((prev) => prev.filter((p) => p.payment_method_id !== id));
    if (removed) setCashInput((removed.amount).toString());
  }

  function handleConfirm() {
    if (totalPaid < totalInt || loading || submitted.current) return;
    submitted.current = true;
    onConfirm(payments.map((p) => ({ payment_method_id: p.payment_method_id, amount: p.amount })));
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 font-body">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="font-heading text-xl text-marine mb-4">Encaissement</h2>

        {/* Total */}
        <div className="bg-marine/5 rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-gray-500">Total à payer</p>
          <p className="font-heading font-bold text-3xl text-marine">{formatCFA(totalInt)}</p>
          {remaining > 0 && totalPaid > 0 && (
            <p className="text-sm text-orange-500 mt-1">Reste : {formatCFA(remaining)}</p>
          )}
        </div>

        {/* Champ montant — visible si reste à payer OU si Espèces est sélectionné */}
        {(remaining > 0 || payments.some((p) => methods.find((m: { id: number; type: string }) => m.id === p.payment_method_id)?.type === "cash")) && (
          <div className="mb-3">
            <label className="block text-xs text-gray-500 mb-1">
              {remaining > 0 ? `Montant à encaisser (reste : ${formatCFA(remaining)})` : "Montant donné"}
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={cashInput}
              onChange={(e) => setCashInput(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-2.5 text-lg text-center focus:outline-none focus:border-gold"
            />
          </div>
        )}

        {/* Boutons modes de paiement */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {methods.map((m: { id: number; name: string; type: string; logo?: string }) => (
            <button
              key={m.id}
              onClick={() => addPayment(m)}
              disabled={remaining <= 0}
              className="bg-marine text-white py-3 px-3 rounded-xl font-semibold hover:bg-marine/90 transition flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {m.logo && <img src={m.logo} alt={m.name} className="h-7 w-7 rounded object-cover" />}
              <span>{m.name}</span>
            </button>
          ))}
        </div>

        {/* Lignes de paiement */}
        <div className="border rounded-xl mb-4 overflow-hidden">
          {payments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Choisissez un mode de paiement</p>
          ) : (
            payments.map((p) => (
              <div key={p.payment_method_id} className="flex justify-between items-center px-3 py-2 border-b last:border-b-0 text-sm">
                <span className="text-gray-700">{p.payment_method_name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatCFA(p.amount)}</span>
                  <button
                    onClick={() => removePayment(p.payment_method_id)}
                    className="text-gray-300 hover:text-red-400 text-base leading-none"
                  >×</button>
                </div>
              </div>
            ))
          )}
          {payments.length > 0 && payments.some((p) => methods.find((m: { id: number; type: string }) => m.id === p.payment_method_id)?.type === "cash") && (
            <div className="flex justify-between px-3 py-2 bg-gray-50 text-sm font-semibold border-t">
              <span>Rendu monnaie</span>
              <span className={change > 0 ? "text-green-600" : "text-gray-400"}>{formatCFA(change)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            disabled={totalPaid < totalInt || loading || submitted.current}
            className="flex-1 bg-gold text-marine font-heading font-bold py-3 rounded-xl text-lg hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            {loading ? "Enregistrement..." : "Valider"}
          </button>
          <button onClick={onClose} className="px-4 border-2 rounded-xl text-gray-500 hover:bg-gray-50">×</button>
        </div>
      </div>
    </div>
  );
}
