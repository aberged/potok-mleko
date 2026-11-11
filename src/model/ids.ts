// Short random ids for products. They stay when a name or price changes, so
// orders keep pointing at the product they were for.

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789';

export function newId(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('');
}
