const ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE = ALPHABET.length;

/**
 * Encodes a non-negative integer to a base-62 string using [0-9a-zA-Z].
 * @param {number} num - A non-negative safe integer.
 * @returns {string} The base-62 encoded string.
 */
export function encodeBase62(num) {
  if (!Number.isSafeInteger(num) || num < 0) {
    throw new Error("Invalid number");
  }

  if (num === 0) {
    return ALPHABET[0];
  }

  let n = num;
  let out = "";

  while (n > 0) {
    out = ALPHABET[n % BASE] + out;
    n = Math.floor(n / BASE);
  }

  return out;
}
