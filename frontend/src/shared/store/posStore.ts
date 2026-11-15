import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartLine {
  product_id: number;
  product_name: string;
  barcode: string | null;
  qty: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
}

interface PosState {
  session_id: number | null;
  register_id: number | null;
  cart: CartLine[];
  setSession: (session_id: number, register_id: number) => void;
  addToCart: (line: Omit<CartLine, "qty">) => void;
  updateQty: (product_id: number, qty: number) => void;
  removeFromCart: (product_id: number) => void;
  setDiscount: (product_id: number, discount: number) => void;
  clearCart: () => void;
  total: () => number;
  totalTax: () => number;
}

export const usePosStore = create<PosState>()(persist((set, get) => ({
  session_id: null,
  register_id: null,
  cart: [],

  setSession: (session_id, register_id) => set({ session_id, register_id }),

  addToCart: (line) => {
    const cart = get().cart;
    const existing = cart.find((l) => l.product_id === line.product_id);
    if (existing) {
      set({ cart: cart.map((l) => l.product_id === line.product_id ? { ...l, qty: l.qty + 1 } : l) });
    } else {
      set({ cart: [...cart, { ...line, qty: 1 }] });
    }
  },

  updateQty: (product_id, qty) => {
    if (qty <= 0) {
      set({ cart: get().cart.filter((l) => l.product_id !== product_id) });
    } else {
      set({ cart: get().cart.map((l) => l.product_id === product_id ? { ...l, qty } : l) });
    }
  },

  removeFromCart: (product_id) => set({ cart: get().cart.filter((l) => l.product_id !== product_id) }),

  setDiscount: (product_id, discount) =>
    set({ cart: get().cart.map((l) => l.product_id === product_id ? { ...l, discount } : l) }),

  clearCart: () => set({ cart: [] }),

  total: () =>
    get().cart.reduce((sum, l) => {
      const base = l.unit_price * (1 - l.discount / 100) * l.qty;
      return sum + base + base * (l.tax_rate / 100);
    }, 0),

  totalTax: () =>
    get().cart.reduce((sum, l) => {
      const base = l.unit_price * (1 - l.discount / 100) * l.qty;
      return sum + base * (l.tax_rate / 100);
    }, 0),
}), { name: "nifas-pos-session", partialize: (s) => ({ session_id: s.session_id, register_id: s.register_id }) }));
