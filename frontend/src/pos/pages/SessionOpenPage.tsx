import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/shared/api";
import { usePosStore } from "@/shared/store/posStore";

const REGISTER_ID = parseInt(window.localStorage.getItem("register_id") ?? "1");

export default function SessionOpenPage() {
  const navigate = useNavigate();
  const setSession = usePosStore((s) => s.setSession);
  const [openingCash, setOpeningCash] = useState("0");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingSession, setExistingSession] = useState<{ id: number; name: string } | null>(null);

  // Au chargement, vérifie si une session est déjà ouverte sur cette caisse
  useEffect(() => {
    api.get("/sessions/open")
      .then(({ data }) => {
        const found = (data as { id: number; name: string; register_id: number }[])
          .find((s) => s.register_id === REGISTER_ID);
        if (found) setExistingSession(found);
      })
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  function resumeSession() {
    if (!existingSession) return;
    setSession(existingSession.id, REGISTER_ID);
    navigate("/pos");
  }

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/sessions/open", {
        register_id: REGISTER_ID,
        opening_cash: parseFloat(openingCash),
      });
      setSession(data.id, REGISTER_ID);
      navigate("/pos");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ?? "Erreur";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-marine flex items-center justify-center font-body">
        <p className="text-white/60 text-sm">Vérification de la session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-marine flex items-center justify-center font-body">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">

        {existingSession ? (
          <>
            <h1 className="font-heading text-2xl text-marine mb-1">Session en cours</h1>
            <p className="text-sm text-gray-500 mb-6">Caisse #{REGISTER_ID}</p>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 text-sm text-green-700">
              Une session est déjà ouverte :<br />
              <span className="font-semibold">{existingSession.name}</span>
            </div>
            <button
              onClick={resumeSession}
              className="w-full bg-gold text-marine font-heading font-bold py-3 rounded-xl text-lg hover:bg-yellow-500 transition"
            >
              Reprendre la session
            </button>
          </>
        ) : (
          <>
            <h1 className="font-heading text-2xl text-marine mb-1">Ouverture de caisse</h1>
            <p className="text-sm text-gray-500 mb-6">Caisse #{REGISTER_ID}</p>
            <form onSubmit={handleOpen} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fond de caisse (FCFA)</label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="w-full border-2 rounded-xl px-4 py-3 text-lg text-center focus:outline-none focus:border-gold"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gold text-marine font-heading font-bold py-3 rounded-xl text-lg hover:bg-yellow-500 transition disabled:opacity-50"
              >
                {loading ? "Ouverture..." : "Ouvrir la session"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
