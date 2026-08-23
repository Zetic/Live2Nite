export function citizenNumber(citizenId: string): number {
  return Number(citizenId.replace(/\D/g, '')) || 0
}
