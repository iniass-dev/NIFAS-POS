import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/shared/api";

interface Store {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  active: boolean;
}

interface Register {
  id: number;
  name: string;
  description: string | null;
  store_id: number | null;
  active: boolean;
}

export default function StoresPage() {
  const qc = useQueryClient();
  const [showStoreForm, setShowStoreForm] = useState(false);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showRegForm, setShowRegForm] = useState(false);

  const { data: stores = [] } = useQuery<Store[]>({
    queryKey: ["stores"],
    queryFn: () => api.get("/stores/").then((r) => r.data),
  });

  const { data: registers = [] } = useQuery<Register[]>({
    queryKey: ["registers-by-store", selectedStore?.id],
    queryFn: () => api.get(`/registers/by-store/${selectedStore!.id}`).then((r) => r.data),
    enabled: !!selectedStore,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api.get("/registers/payment-methods").then((r) => r.data),
  });

  const saveStore = useMutation({
    mutationFn: (data: Partial<Store>) =>
      editingStore
        ? api.patch(`/stores/${editingStore.id}`, data)
        : api.post("/stores/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stores"] });
      toast.success(editingStore ? "Magasin mis à jour" : "Magasin créé");
      setShowStoreForm(false);
      setEditingStore(null);
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  const createRegister = useMutation({
    mutationFn: (data: { name: string; description: string; store_id: number; payment_method_ids: number[] }) =>
      api.post("/registers/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["registers-by-store"] });
      toast.success("Caisse créée");
      setShowRegForm(false);
    },
    onError: () => toast.error("Erreur lors de la création"),
  });

  function handleStoreSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    saveStore.mutate({
      name: fd.get("name") as string,
      address: (fd.get("address") as string) || null,
      city: (fd.get("city") as string) || null,
      phone: (fd.get("phone") as string) || null,
    });
  }

  function handleRegSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const pmIds = Array.from(e.currentTarget.querySelectorAll<HTMLInputElement>("input[name=pm]:checked"))
      .map((el) => parseInt(el.value));
    createRegister.mutate({
      name: fd.get("name") as string,
      description: (fd.get("description") as string) || "",
      store_id: selectedStore!.id,
      payment_method_ids: pmIds,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-marine">Magasins</h1>
        <button
          onClick={() => { setEditingStore(null); setShowStoreForm(true); }}
          className="bg-gold text-marine font-semibold px-4 py-2 rounded-lg text-sm hover:bg-yellow-500"
        >
          + Nouveau magasin
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stores.map((store) => (
          <div
            key={store.id}
            onClick={() => setSelectedStore(store)}
            className={`bg-white rounded-xl p-4 shadow-sm border-2 cursor-pointer transition ${
              selectedStore?.id === store.id ? "border-gold" : "border-transparent hover:border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-marine">{store.name}</p>
                {store.city && <p className="text-sm text-gray-500">{store.city}</p>}
                {store.address && <p className="text-xs text-gray-400">{store.address}</p>}
                {store.phone && <p className="text-xs text-gray-400">{store.phone}</p>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingStore(store); setShowStoreForm(true); }}
                className="text-xs text-gold hover:underline"
              >
                Modifier
              </button>
            </div>
            <span className={`mt-2 inline-block text-xs px-2 py-0.5 rounded-full ${store.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
              {store.active ? "Actif" : "Inactif"}
            </span>
          </div>
        ))}
      </div>

      {selectedStore && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold text-marine">
              Caisses — {selectedStore.name}
            </h2>
            <button
              onClick={() => setShowRegForm(true)}
              className="text-xs bg-marine text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-marine/90"
            >
              + Ajouter une caisse
            </button>
          </div>

          {registers.length === 0 ? (
            <p className="text-sm text-gray-400">Aucune caisse pour ce magasin.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {registers.map((r) => (
                <div key={r.id} className="border rounded-xl p-3">
                  <p className="font-medium text-sm text-marine">{r.name}</p>
                  {r.description && <p className="text-xs text-gray-500 mt-0.5">{r.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">ID caisse : <span className="font-mono font-bold">{r.id}</span></p>
                  <p className="text-xs text-gray-400 mt-0.5 italic">À renseigner dans l'installeur POS</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal magasin */}
      {showStoreForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-4">
              {editingStore ? "Modifier le magasin" : "Nouveau magasin"}
            </h2>
            <form onSubmit={handleStoreSubmit} className="space-y-3">
              <input name="name" required placeholder="Nom du magasin *" defaultValue={editingStore?.name} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="city" placeholder="Ville" defaultValue={editingStore?.city ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="address" placeholder="Adresse" defaultValue={editingStore?.address ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="phone" placeholder="Téléphone" defaultValue={editingStore?.phone ?? ""} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm hover:bg-yellow-500">Enregistrer</button>
                <button type="button" onClick={() => { setShowStoreForm(false); setEditingStore(null); }} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal caisse */}
      {showRegForm && selectedStore && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-1">Nouvelle caisse</h2>
            <p className="text-sm text-gray-500 mb-4">{selectedStore.name}</p>
            <form onSubmit={handleRegSubmit} className="space-y-3">
              <input name="name" required placeholder="Nom de la caisse *" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="description" placeholder="Description (optionnel)" className="w-full border rounded-lg px-3 py-2 text-sm" />
              {paymentMethods.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-600 mb-2">Modes de paiement acceptés</p>
                  <div className="space-y-1.5">
                    {paymentMethods.map((pm: { id: number; name: string }) => (
                      <label key={pm.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" name="pm" value={pm.id} defaultChecked className="accent-gold" />
                        {pm.name}
                      </label>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm hover:bg-yellow-500">Créer</button>
                <button type="button" onClick={() => setShowRegForm(false)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
