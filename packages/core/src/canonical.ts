/**
 * Canonical JSON for input fingerprints (BR-PAIR-13): object keys sorted by UTF-16 code unit, undefined
 * properties dropped, numbers in their shortest round-trip form (`-0` as `0`). Values without a single
 * JSON meaning (NaN, Infinity, undefined in arrays, BigInt, functions, Map, Date…) are rejected, because
 * silently converting them would make two different inputs share a hash.
 */
export function canonicalJson(value: unknown): string {
  return write(value, '$');
}

function write(value: unknown, path: string): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new TypeError(`${path}: ${value} has no JSON representation`);
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        return `[${value
          .map((item: unknown, i) => {
            if (item === undefined) throw new TypeError(`${path}[${i}]: undefined has no JSON representation`);
            return write(item, `${path}[${i}]`);
          })
          .join(',')}]`;
      }
      const prototype: unknown = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError(`${path}: only plain objects can be serialized canonically`);
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record)
        .filter((key) => record[key] !== undefined)
        .sort();
      return `{${keys.map((key) => `${JSON.stringify(key)}:${write(record[key], `${path}.${key}`)}`).join(',')}}`;
    }
    case 'undefined':
    case 'bigint':
    case 'symbol':
    case 'function':
      throw new TypeError(`${path}: a ${typeof value} has no JSON representation`);
  }
  // TypeScript does not treat a switch over `typeof` as exhaustive, so the function needs an exit here.
  throw new TypeError(`${path}: unsupported value`);
}

/**
 * Hashes the canonical JSON of `value` with a function the environment injects (US-021:AC2): SHA-256
 * from `node:crypto` in the API, Web Crypto in the browser. The domain stays free of I/O and crypto.
 */
export function hashCanonical<R>(value: unknown, hash: (canonical: string) => R): R {
  return hash(canonicalJson(value));
}
