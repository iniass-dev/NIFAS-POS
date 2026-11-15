import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/shared/api";
import { formatCFA } from "@/shared/currency";

interface Product {
  id: number;
  name: string;
  barcode: string | null;
  reference: string | null;
  price: number;
  cost: number;
  tax_rate: number;
  track_stock: boolean;
  active: boolean;
  qty_on_hand: number;
  category_id: number | null;
  image_url: string | null;
}

interface Category {
  id: number;
  name: string;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showCatForm, setShowCatForm] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [barcodeError, setBarcodeError] = useState("");
  const [refValue, setRefValue] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  function generateRef(): string {
    return "PRD-" + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", search],
    queryFn: () => api.get("/products/", { params: { search: search || undefined } }).then((r) => r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/products/categories").then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Partial<Product>) =>
      editing
        ? api.patch(`/products/${editing.id}`, data)
        : api.post("/products/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success(editing ? "Produit mis à jour" : "Produit créé");
      setShowForm(false);
      setEditing(null);
      setBarcodeError("");
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "";
      if (detail.toLowerCase().includes("barcode") || detail.toLowerCase().includes("code")) {
        setBarcodeError("Ce code-barres est déjà utilisé par un autre produit.");
      } else {
        toast.error("Erreur lors de la sauvegarde");
      }
    },
  });

  const createCategory = useMutation({
    mutationFn: (name: string) => api.post("/products/categories", { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Catégorie créée");
      setShowCatForm(false);
      setNewCatName("");
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  function openEdit(p: Product) {
    setEditing(p);
    setBarcodeError("");
    setRefValue(p.reference ?? "");
    setImagePreview(p.image_url ?? null);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBarcodeError("");
    const fd = new FormData(e.currentTarget);
    const barcode = (fd.get("barcode") as string).trim() || null;

    // Vérification unicité code-barres côté client
    if (barcode) {
      const conflict = products.find(
        (p) => p.barcode === barcode && p.id !== editing?.id
      );
      if (conflict) {
        setBarcodeError(`Code-barres déjà utilisé par "${conflict.name}".`);
        return;
      }
    }

    save.mutate({
      name: fd.get("name") as string,
      barcode,
      reference: (fd.get("reference") as string).trim() || null,
      price: parseFloat(fd.get("price") as string),
      cost: parseFloat(fd.get("cost") as string) || 0,
      tax_rate: parseFloat(fd.get("tax_rate") as string) || 0,
      category_id: fd.get("category_id") ? parseInt(fd.get("category_id") as string) : null,
      track_stock: (fd.get("track_stock") as string) === "true",
      image_url: imagePreview,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-marine">Produits</h1>
        <button
          onClick={() => { setEditing(null); setBarcodeError(""); setRefValue(generateRef()); setImagePreview(null); setShowForm(true); }}
          className="bg-gold text-marine font-semibold px-4 py-2 rounded-lg text-sm hover:bg-yellow-500"
        >
          + Nouveau produit
        </button>
      </div>

      <input
        type="search"
        placeholder="Rechercher par nom ou code-barres..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Produit</th>
              <th className="px-4 py-3">Code-barres</th>
              <th className="px-4 py-3">Catégorie</th>
              <th className="px-4 py-3 text-right">Prix</th>
              <th className="px-4 py-3 text-right">Stock</th>
              <th className="px-4 py-3 text-right">TVA</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.barcode ?? "—"}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {categories.find((c) => c.id === p.category_id)?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-right">{formatCFA(p.price)}</td>
                <td className={`px-4 py-3 text-right font-medium ${p.qty_on_hand < 0 ? "text-red-500" : p.qty_on_hand === 0 ? "text-orange-400" : ""}`}>
                  {p.qty_on_hand}
                </td>
                <td className="px-4 py-3 text-right">{p.tax_rate}%</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openEdit(p)} className="text-gold hover:underline text-xs">
                    Modifier
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">
                  Aucun produit. Commencez par créer une catégorie puis un produit.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal produit */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-4">
              {editing ? "Modifier le produit" : "Nouveau produit"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Image produit */}
              <div className="flex items-center gap-3">
                <div
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0 cursor-pointer hover:border-gold transition"
                  onClick={() => document.getElementById("img-upload")?.click()}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="preview" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <input
                    id="img-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const img = new Image();
                      const url = URL.createObjectURL(file);
                      img.onload = () => {
                        const MAX = 400;
                        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
                        const canvas = document.createElement("canvas");
                        canvas.width = Math.round(img.width * scale);
                        canvas.height = Math.round(img.height * scale);
                        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
                        setImagePreview(canvas.toDataURL("image/jpeg", 0.82));
                        URL.revokeObjectURL(url);
                      };
                      img.src = url;
                    }}
                  />
                  <p className="text-xs text-gray-500">Cliquer pour ajouter une image</p>
                  {imagePreview && (
                    <button type="button" onClick={() => setImagePreview(null)} className="text-xs text-red-400 hover:text-red-600 mt-1">
                      Supprimer l'image
                    </button>
                  )}
                </div>
              </div>

              <input
                name="name"
                required
                placeholder="Nom *"
                defaultValue={editing?.name}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />

              <div>
                <input
                  name="barcode"
                  placeholder="Code-barres"
                  defaultValue={editing?.barcode ?? ""}
                  onChange={() => setBarcodeError("")}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 ${barcodeError ? "border-red-400 focus:ring-red-300" : "focus:ring-gold"}`}
                />
                {barcodeError && (
                  <p className="text-xs text-red-500 mt-1">{barcodeError}</p>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  name="reference"
                  placeholder="Référence interne"
                  value={refValue}
                  onChange={(e) => setRefValue(e.target.value)}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gold"
                />
                {!editing && (
                  <button
                    type="button"
                    onClick={() => setRefValue(generateRef())}
                    title="Générer une nouvelle référence"
                    className="border rounded-lg px-3 py-2 text-xs text-gold hover:bg-gray-50"
                  >
                    ↺
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <input
                    name="price"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="Prix *"
                    defaultValue={editing?.price}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  <p className="text-xs text-gray-400 mt-0.5 text-center">Prix vente</p>
                </div>
                <div>
                  <input
                    name="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Coût"
                    defaultValue={editing?.cost ?? 0}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  <p className="text-xs text-gray-400 mt-0.5 text-center">Coût achat</p>
                </div>
                <div>
                  <input
                    name="tax_rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="TVA %"
                    defaultValue={editing?.tax_rate ?? 18}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                  />
                  <p className="text-xs text-gray-400 mt-0.5 text-center">TVA %</p>
                </div>
              </div>

              {/* Catégorie + bouton créer */}
              <div className="flex gap-2">
                <select
                  name="category_id"
                  defaultValue={editing?.category_id ?? ""}
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowCatForm(true)}
                  title="Créer une catégorie"
                  className="border rounded-lg px-3 py-2 text-sm hover:bg-gray-50 text-gold font-bold"
                >
                  + Cat.
                </button>
              </div>

              <select
                name="track_stock"
                defaultValue={editing ? String(editing.track_stock) : "true"}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              >
                <option value="true">Suivi de stock activé</option>
                <option value="false">Sans suivi de stock</option>
              </select>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={save.isPending}
                  className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm hover:bg-yellow-500 disabled:opacity-50"
                >
                  {save.isPending ? "Enregistrement..." : "Enregistrer"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setBarcodeError(""); }}
                  className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal nouvelle catégorie */}
      {showCatForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-4">Nouvelle catégorie</h2>
            <div className="space-y-3">
              <input
                autoFocus
                type="text"
                placeholder="Nom de la catégorie *"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCatName.trim()) {
                    createCategory.mutate(newCatName.trim());
                  }
                }}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => newCatName.trim() && createCategory.mutate(newCatName.trim())}
                  disabled={!newCatName.trim() || createCategory.isPending}
                  className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm hover:bg-yellow-500 disabled:opacity-40"
                >
                  Créer
                </button>
                <button
                  onClick={() => { setShowCatForm(false); setNewCatName(""); }}
                  className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
