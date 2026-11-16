import { useRef } from "react";
import { formatCFA } from "@/shared/currency";

interface ReceiptLine {
  product_name: string;
  qty: number;
  unit_price: number;
  discount: number;
  tax_rate: number;
  subtotal: number;
}

interface ReceiptPayment {
  payment_method_name: string;
  amount: number;
}

export interface ReceiptData {
  reference: string;
  paid_at: string | null;
  cashier_name: string;
  store_name: string | null;
  store_address: string | null;
  store_city?: string | null;
  store_phone: string | null;
  store_tax_included?: boolean;
  amount_untaxed: number;
  amount_tax: number;
  amount_total: number;
  amount_paid: number;
  amount_return: number;
  lines: ReceiptLine[];
  payments: ReceiptPayment[];
}

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-SN", { day: "2-digit", month: "2-digit", year: "numeric" })
    + " " + d.toLocaleTimeString("fr-SN", { hour: "2-digit", minute: "2-digit" });
}

function Sep() {
  return <div style={{ borderTop: "1px dashed #000", margin: "6px 0" }} />;
}

function Row({ left, right, bold }: { left: string; right: string; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: bold ? "bold" : "normal" }}>
      <span>{left}</span>
      <span>{right}</span>
    </div>
  );
}

export default function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const html = receiptRef.current?.innerHTML ?? "";
    const w = window.open("", "_blank", "width=400,height=700");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Ticket</title><style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', Courier, monospace; font-size: 11px; width: 302px; padding: 8px; color: #000; }
      .center { text-align: center; }
      .bold { font-weight: bold; }
      .big { font-size: 15px; }
      .sep { border-top: 1px dashed #000; margin: 6px 0; }
      .row { display: flex; justify-content: space-between; }
      .indent { padding-left: 8px; }
      @media print { @page { margin: 0; size: 80mm auto; } body { width: 100%; } }
    </style></head><body>${html}</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 300);
  }

  const taxIncluded = data.store_tax_included !== false;

  // Grouper les taxes par taux (seulement si TVA non incluse)
  const taxGroups: Record<number, number> = {};
  if (!taxIncluded) {
    for (const l of data.lines) {
      if (l.tax_rate > 0) {
        taxGroups[l.tax_rate] = (taxGroups[l.tax_rate] ?? 0) + l.subtotal * (l.tax_rate / 100);
      }
    }
  }

  const receiptStyle: React.CSSProperties = {
    fontFamily: "'Courier New', Courier, monospace",
    fontSize: "11px",
    color: "#000",
    width: "302px",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <div style={{ background: "#fff", borderRadius: "12px", padding: "16px", maxHeight: "90vh", overflow: "auto", display: "flex", flexDirection: "column", gap: "12px", width: "360px" }}>

        {/* Ticket */}
        <div ref={receiptRef} style={receiptStyle}>

          {/* En-tête magasin */}
          <div className="center bold big" style={{ textAlign: "center", fontWeight: "bold", fontSize: "15px", marginBottom: "2px" }}>
            {data.store_name ?? "NIFAS POS"}
          </div>
          {data.store_address && (
            <div style={{ textAlign: "center", fontSize: "10px" }}>{data.store_address}</div>
          )}
          {data.store_phone && (
            <div style={{ textAlign: "center", fontSize: "10px" }}>Tél : {data.store_phone}</div>
          )}

          <Sep />

          {/* Infos commande */}
          <Row left={`Réf : ${data.reference}`} right={formatDate(data.paid_at)} />
          {data.cashier_name && <Row left={`Caissier : ${data.cashier_name}`} right="" />}

          <Sep />

          {/* Lignes produits */}
          {data.lines.map((l, i) => (
            <div key={i} style={{ marginBottom: "4px" }}>
              <div style={{ fontWeight: "bold" }}>{l.product_name}</div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingLeft: "8px" }}>
                <span>
                  {l.qty % 1 === 0 ? l.qty.toFixed(0) : l.qty} x {formatCFA(l.unit_price)}
                  {l.discount > 0 ? ` (-${l.discount}%)` : ""}
                </span>
                <span style={{ fontWeight: "bold" }}>{formatCFA(l.subtotal)}</span>
              </div>
            </div>
          ))}

          <Sep />

          {/* Totaux */}
          {!taxIncluded && (
            <>
              <Row left="Sous-total HT" right={formatCFA(data.amount_untaxed)} />
              {Object.entries(taxGroups).map(([rate, amount]) => (
                <Row key={rate} left={`TVA (${rate}%)`} right={formatCFA(amount)} />
              ))}
              {data.amount_tax > 0 && Object.keys(taxGroups).length === 0 && (
                <Row left="TVA" right={formatCFA(data.amount_tax)} />
              )}
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", fontSize: "14px", margin: "6px 0", borderTop: "1px solid #000", paddingTop: "4px" }}>
            <span>TOTAL</span>
            <span>{formatCFA(data.amount_total)}</span>
          </div>

          <Sep />

          {/* Paiements */}
          {data.payments.map((p, i) => (
            <Row key={i} left={p.payment_method_name || "Paiement"} right={formatCFA(p.amount)} />
          ))}
          {data.amount_return > 0 && (
            <Row left="Rendu monnaie" right={formatCFA(data.amount_return)} bold />
          )}

          <Sep />

          {/* Pied de ticket */}
          <div style={{ textAlign: "center", marginTop: "4px", fontSize: "10px" }}>
            Merci pour votre achat !<br />
            À bientôt !
          </div>
          <div style={{ marginTop: "16px" }} />

        </div>

        {/* Boutons */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={handlePrint}
            style={{ flex: 1, background: "#131a2e", color: "#fff", fontWeight: "bold", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px" }}
          >
            Imprimer
          </button>
          <button
            onClick={onClose}
            style={{ flex: 1, background: "#f7a720", color: "#131a2e", fontWeight: "bold", padding: "12px", borderRadius: "8px", border: "none", cursor: "pointer", fontSize: "14px" }}
          >
            Nouvelle vente
          </button>
        </div>
      </div>
    </div>
  );
}
