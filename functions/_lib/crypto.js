// functions/_lib/crypto.js
//
// Shared password hashing + token helpers for Pages Functions.
// Lives under an underscore-prefixed folder so Cloudflare Pages
// doesn't try to turn it into a routable endpoint.

const ITERATIONS = 10_000;
const HASH_ALG = 'SHA-256';
const KEY_LENGTH_BYTES = 32;

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * Hash a plaintext password with PBKDF2-SHA256, random salt per user.
 * Stored format: "pbkdf2:<iterations>:<saltHex>:<hashHex>"
 * Storing the scheme + iterations inline means you can raise the
 * iteration count later without breaking verification of old hashes.
 */
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: HASH_ALG },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );
  return `pbkdf2:${ITERATIONS}:${toHex(salt)}:${toHex(derivedBits)}`;
}

/**
 * Verify a plaintext password against a stored hash string.
 */
export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [scheme, iterStr, saltHex, hashHex] = stored.split(':');
  if (scheme !== 'pbkdf2' || !iterStr || !saltHex || !hashHex) return false;

  const iterations = parseInt(iterStr, 10);
  const salt = fromHex(saltHex);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const derivedBits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: HASH_ALG },
    keyMaterial,
    KEY_LENGTH_BYTES * 8
  );

  const computedHex = toHex(derivedBits);
  if (computedHex.length !== hashHex.length) return false;

  // Constant-time-ish comparison to avoid leaking timing info.
  let diff = 0;
  for (let i = 0; i < computedHex.length; i++) {
    diff |= computedHex.charCodeAt(i) ^ hashHex.charCodeAt(i);
  }
  return diff === 0;
}

export function generateToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export function generateId() {
  return crypto.randomUUID();
}
