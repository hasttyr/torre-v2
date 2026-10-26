// Must fail: a type imported as a value (consistent-type-imports).
import { Player } from './types.js';

export const idOf = (player: Player): string => player.id;
