// Franc CFA (XOF) — sans décimales
export function formatCFA(amount: number): string {
  return `${Math.round(amount).toLocaleString("fr-FR")} FCFA`;
}
