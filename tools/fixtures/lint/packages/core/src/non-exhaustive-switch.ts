// Must fail: a switch that forgets a member of the union.
type Outcome = 'WIN' | 'DRAW' | 'LOSS';

export function points(outcome: Outcome): number {
  switch (outcome) {
    case 'WIN':
      return 2;
    case 'DRAW':
      return 1;
  }
  return 0;
}
