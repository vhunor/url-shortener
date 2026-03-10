const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length;

export function encodeBase62(num) {
  if (!Number.isSafeInteger(num) || num < 0) throw new Error("Invalid number");
  if (num === 0) return ALPHABET[0];

  let n = num;
  let out = "";
  while (n > 0) {
    out = ALPHABET[n % BASE] + out;
    n = Math.floor(n / BASE);
  }
  return out;
}
