import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { api } from "@/shared/api";
import { useAuthStore } from "@/shared/store/authStore";

type Register = { id: number; name: string; store_name: string | null };

export default function PinLoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [registers, setRegisters] = useState<Register[]>([]);
  const [selectedRegister, setSelectedRegister] = useState<Register | null>(null);

  useEffect(() => {
    const savedId = parseInt(window.localStorage.getItem("register_id") ?? "0");
    api.get("/registers/public").then(({ data }) => {
      setRegisters(data);
      const found = data.find((r: Register) => r.id === savedId) ?? data[0] ?? null;
      if (found) setSelectedRegister(found);
    }).catch(() => {});
  }, []);

  function selectRegister(r: Register) {
    setSelectedRegister(r);
    setPin("");
    window.localStorage.setItem("register_id", String(r.id));
  }

  async function handlePin(digit: string) {
    if (!selectedRegister) return;
    const next = pin + digit;
    setPin(next);
    if (next.length >= 4) {
      setLoading(true);
      try {
        const { data } = await api.post("/auth/pin-login", { register_id: selectedRegister.id, pin: next });
        setAuth(data.access_token, { user_id: data.user_id, user_name: data.user_name, role: data.role });
        navigate("/open-session");
      } catch {
        toast.error("PIN incorrect");
        setPin("");
      } finally {
        setLoading(false);
      }
    }
  }

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  return (
    <div className="min-h-screen bg-marine flex flex-col items-center justify-center font-body select-none">
      <h1 className="font-heading text-4xl text-gold mb-2">
        {selectedRegister?.store_name ?? "POS"}
      </h1>

      {registers.length > 1 && (
        <div className="flex gap-2 mb-6">
          {registers.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRegister(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                selectedRegister?.id === r.id
                  ? "bg-gold text-marine"
                  : "bg-white/10 text-white hover:bg-white/20"
              }`}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}

      <p className="text-white/60 mb-8 text-sm">Entrez votre PIN</p>

      <div className="flex gap-3 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`w-4 h-4 rounded-full ${i < pin.length ? "bg-gold" : "bg-white/20"}`} />
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 w-64">
        {digits.map((d) => (
          <button
            key={d}
            disabled={loading}
            onClick={() => {
              if (d === "C") setPin("");
              else if (d === "⌫") setPin((p) => p.slice(0, -1));
              else handlePin(d);
            }}
            className="h-16 rounded-xl bg-white/10 text-white text-xl font-semibold hover:bg-gold hover:text-marine transition active:scale-95 disabled:opacity-50"
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );
}
