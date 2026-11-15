import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/shared/api";
import { usePosStore, CartLine } from "@/shared/store/posStore";
import { useAuthStore } from "@/shared/store/authStore";
import PaymentModal from "../components/PaymentModal";
import { formatCFA } from "@/shared/currency";

interface Product {
  id: number;
  name: string;
  price: number;
  barcode: string | null;
  tax_rate: number;
  qty_on_hand: number;
  category_id: number | null;
  track_stock: boolean;
  image_url: string | null;
}

interface Category {
  id: number;
  name: string;
}

export default function PosScreen() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { session_id, register_id, cart, addToCart, updateQty, removeFromCart, clearCart, total } = usePosStore();
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const bufferTimeout = useRef<ReturnType<typeof setTimeout>>();
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: allProducts = [] } = useQuery<Product[]>({
    queryKey: ["products-pos"],
    queryFn: () => api.get("/products/", { params: { active_only: true } }).then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/products/categories").then((r) => r.data),
  });

  const products = allProducts.filter((p) => {
    const matchCat = selectedCat === null || p.category_id === selectedCat;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode?.includes(search);
    return matchCat && matchSearch;
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement === searchRef.current) return;
      if (e.key === "Enter" && barcodeBuffer.length > 2) {
        handleBarcode(barcodeBuffer);
        setBarcodeBuffer("");
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        setBarcodeBuffer((b) => b + e.key);
        clearTimeout(bufferTimeout.current);
        bufferTimeout.current = setTimeout(() => setBarcodeBuffer(""), 300);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [barcodeBuffer]);

  async function handleBarcode(code: string) {
    try {
      const { data } = await api.get(`/products/barcode/${code}`);
      addToCart({ product_id: data.id, product_name: data.name, barcode: data.barcode, unit_price: data.price, discount: 0, tax_rate: data.tax_rate });
    } catch {
      toast.error(`Code-barres non trouvé : ${code}`);
    }
  }

  const orderMutation = useMutation({
    mutationFn: (payments: { payment_method_id: number; amount: number }[]) =>
      api.post("/orders/", {
        session_id,
        register_id,
        lines: cart.map((l) => ({ product_id: l.product_id, qty: l.qty, unit_price: l.unit_price, discount: l.discount })),
        payments,
      }),
    onSuccess: (res) => {
      toast.success(`Commande ${res.data.reference} enregistrée`);
      clearCart();
      setShowPayment(false);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Erreur lors de l'enregistrement";
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (!session_id) navigate("/open-session");
  }, [session_id]);

  if (!session_id) return null;

  const orderTotal = total();
  const orderTax = cart.reduce((s, l) => s + l.unit_price * l.qty * (1 - l.discount / 100) * (l.tax_rate / 100), 0);
  const orderHT = orderTotal - orderTax;

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f5] font-body overflow-hidden">

      {/* Topbar */}
      <div className="h-12 bg-marine flex items-center px-4 gap-4 shrink-0">
        <span className="text-white font-heading font-bold text-sm tracking-wide">NIFAS POS</span>
        <div className="flex-1" />
        <span className="text-white/60 text-xs">{user?.user_name}</span>
        <button
          onClick={() => navigate("/close-session")}
          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition"
        >
          Clôturer la session
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Catégories — barre verticale gauche */}
        <div className="w-36 bg-white border-r overflow-y-auto shrink-0">
          <button
            onClick={() => setSelectedCat(null)}
            className={`w-full text-left px-4 py-3 text-sm font-medium border-b transition ${selectedCat === null ? "bg-gold text-marine" : "text-gray-600 hover:bg-gray-50"}`}
          >
            Catégories
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCat(c.id)}
              className={`w-full text-left px-4 py-3 text-sm border-b transition ${selectedCat === c.id ? "bg-gold text-marine font-semibold" : "text-gray-600 hover:bg-gray-50"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Zone produits */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Barre recherche */}
          <div className="px-4 py-2.5 bg-white border-b shrink-0">
            <input
              ref={searchRef}
              type="search"
              placeholder="Rechercher un produit ou scanner..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {/* Grille produits */}
          <div className="flex-1 overflow-auto p-3">
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3">
              {products.map((p) => {
                const inCart = cart.find((l) => l.product_id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart({ product_id: p.id, product_name: p.name, barcode: p.barcode, unit_price: p.price, discount: 0, tax_rate: p.tax_rate })}
                    className={`bg-white rounded-xl p-3 text-left shadow-sm border-2 transition hover:shadow-md hover:border-gold ${inCart ? "border-gold" : "border-transparent"}`}
                  >
                    {/* Image */}
                    <div className="w-full aspect-square rounded-lg bg-gray-100 flex items-center justify-center mb-2 relative overflow-hidden">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                      {inCart && (
                        <span className="absolute top-1 right-1 bg-gold text-marine text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                          {inCart.qty}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-xs text-marine leading-tight line-clamp-2">{p.name}</p>
                    <p className="text-gold font-bold text-sm mt-1">{formatCFA(p.price)}</p>
                    {p.track_stock && (
                      <p className={`text-xs mt-0.5 ${p.qty_on_hand <= 0 ? "text-red-400" : "text-gray-400"}`}>
                        Stock : {p.qty_on_hand}
                      </p>
                    )}
                  </button>
                );
              })}
              {products.length === 0 && (
                <div className="col-span-4 py-16 text-center text-gray-400 text-sm">Aucun produit</div>
              )}
            </div>
          </div>
        </div>

        {/* Panneau commande — style Odoo */}
        <div className="w-[380px] bg-white flex flex-col shadow-xl shrink-0 border-l">

          {/* En-tête commande */}
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <span className="font-heading font-bold text-marine text-sm">Commande</span>
              {cart.length > 0 && (
                <button onClick={clearCart} className="text-xs text-red-400 hover:text-red-600">
                  Vider
                </button>
              )}
            </div>
          </div>

          {/* Lignes commande */}
          <div className="flex-1 overflow-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-300 gap-2">
                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm">Panier vide</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50 sticky top-0">
                  <tr className="text-xs text-gray-400 text-left">
                    <th className="px-3 py-2 font-medium">Produit</th>
                    <th className="px-2 py-2 font-medium text-center">Qté</th>
                    <th className="px-3 py-2 font-medium text-right">Total</th>
                    <th className="w-6" />
                  </tr>
                </thead>
                <tbody>
                  {cart.map((line: CartLine) => (
                    <tr key={line.product_id} className="border-b border-gray-50 hover:bg-gold/5 group">
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-marine text-xs leading-tight">{line.product_name}</p>
                        <p className="text-gray-400 text-xs">{formatCFA(line.unit_price)}</p>
                      </td>
                      <td className="px-2 py-2.5">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQty(line.product_id, line.qty - 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-600 flex items-center justify-center">−</button>
                          <span className="w-7 text-center text-sm font-semibold">{line.qty}</span>
                          <button onClick={() => updateQty(line.product_id, line.qty + 1)} className="w-6 h-6 rounded bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-600 flex items-center justify-center">+</button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-xs">
                        {formatCFA(line.unit_price * line.qty * (1 - line.discount / 100))}
                      </td>
                      <td className="pr-2">
                        <button onClick={() => removeFromCart(line.product_id)} className="text-gray-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition text-base">×</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Totaux + bouton paiement */}
          <div className="border-t shrink-0">
            {cart.length > 0 && (
              <div className="px-4 py-2 space-y-1 border-b bg-gray-50 text-xs text-gray-500">
                <div className="flex justify-between">
                  <span>Sous-total HT</span>
                  <span>{formatCFA(orderHT)}</span>
                </div>
                <div className="flex justify-between">
                  <span>TVA</span>
                  <span>{formatCFA(orderTax)}</span>
                </div>
              </div>
            )}
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Total TTC</p>
                <p className="font-heading font-bold text-2xl text-marine">{formatCFA(orderTotal)}</p>
              </div>
            </div>
            <div className="px-4 pb-4">
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className="w-full bg-gold text-marine font-heading font-bold py-4 rounded-xl text-lg hover:bg-yellow-500 transition disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Encaisser
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPayment && (
        <PaymentModal
          total={orderTotal}
          onConfirm={(payments) => orderMutation.mutate(payments)}
          onClose={() => setShowPayment(false)}
          loading={orderMutation.isPending}
        />
      )}
    </div>
  );
}
