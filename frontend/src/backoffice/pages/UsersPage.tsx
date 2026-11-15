import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/shared/api";

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  active: boolean;
}

const ROLES = ["admin", "manager", "cashier"];
const ROLE_LABELS: Record<string, string> = { admin: "Admin", manager: "Manager", cashier: "Caissière" };

export default function UsersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => api.get("/users/").then((r) => r.data),
  });

  const save = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      editing ? api.patch(`/users/${editing.id}`, data) : api.post("/users/", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success(editing ? "Utilisateur mis à jour" : "Utilisateur créé");
      setShowForm(false);
      setEditing(null);
    },
    onError: () => toast.error("Erreur lors de la sauvegarde"),
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      name: fd.get("name"),
      email: fd.get("email"),
      role: fd.get("role"),
      pin: (fd.get("pin") as string) || null,
    };
    if (!editing || fd.get("password")) payload.password = fd.get("password");
    save.mutate(payload);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-marine">Utilisateurs</h1>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-gold text-marine font-semibold px-4 py-2 rounded-lg text-sm hover:bg-yellow-500">
          + Nouvel utilisateur
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left text-gray-500">
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Rôle</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="bg-marine/10 text-marine text-xs px-2 py-0.5 rounded-full">{ROLE_LABELS[u.role] ?? u.role}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {u.active ? "Actif" : "Inactif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => { setEditing(u); setShowForm(true); }} className="text-gold hover:underline text-xs">Modifier</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
            <h2 className="font-heading text-lg text-marine mb-4">{editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input name="name" required placeholder="Nom complet *" defaultValue={editing?.name} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="email" type="email" required placeholder="Email *" defaultValue={editing?.email} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="password" type="password" placeholder={editing ? "Nouveau mot de passe (laisser vide)" : "Mot de passe *"} required={!editing} className="w-full border rounded-lg px-3 py-2 text-sm" />
              <input name="pin" placeholder="PIN caisse (4-6 chiffres)" maxLength={6} defaultValue="" className="w-full border rounded-lg px-3 py-2 text-sm" />
              <select name="role" defaultValue={editing?.role ?? "cashier"} className="w-full border rounded-lg px-3 py-2 text-sm">
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-gold text-marine font-semibold py-2 rounded-lg text-sm hover:bg-yellow-500">Enregistrer</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 border py-2 rounded-lg text-sm hover:bg-gray-50">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
