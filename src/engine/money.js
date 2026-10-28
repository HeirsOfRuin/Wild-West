// The one place money moves. Every change writes a ledger row in the same call,
// so the purse and the ledger cannot disagree (test/invariants.test.js).

export function pay(s, amount, why) {
  const a = Math.round(amount);
  if (!a) return 0;
  s.purse += a;
  s.ledger.push({ t: s.t, amount: a, why });
  if (s.ledger.length > 400) {
    // Fold the oldest rows into one carried-forward row so the save stays small
    // and the sum still equals the purse.
    const old = s.ledger.splice(0, 200);
    s.ledger.unshift({ t: old[old.length - 1].t, amount: old.reduce((x, r) => x + r.amount, 0), why: 'Carried forward' });
  }
  return a;
}

export const ledgerSum = (s) => s.ledger.reduce((x, r) => x + r.amount, 0);
