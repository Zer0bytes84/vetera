/**
 * Backup crypto utilities — AES-256-GCM + PBKDF2 (WebCrypto).
 *
 * Encrypted backup container layout (big-endian):
 *   [8 bytes]  magic "BAITDB\0\0"
 *   [2 bytes]  version 0x0001
 *   [2 bytes]  flags (bit 0 = encrypted, bit 1 = compressed (reserved))
 *   [16 bytes] PBKDF2 salt
 *   [12 bytes] AES-GCM IV
 *   [N bytes]  ciphertext (including 16-byte auth tag at the end)
 *   [32 bytes] SHA-256 of plaintext
 *
 * Non-encrypted containers omit the salt+iv+ciphertext+hash and just carry
 * the raw SQLite bytes (used for browser preview or transparent migration).
 */

const MAGIC = new Uint8Array([0x42, 0x41, 0x49, 0x54, 0x44, 0x42, 0x00, 0x00]); // "BAITDB\0\0"
const VERSION = 1;
const FLAG_ENCRYPTED = 0x0001;
const HEADER_LENGTH = 8 + 2 + 2 + 16 + 12; // = 40 bytes (salt+iv offsets only)
const PBKDF2_ITERATIONS = 120_000;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function getSubtleCrypto(): SubtleCrypto {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      "WebCrypto indisponible : chiffrement AES-256-GCM non supporté dans cet environnement."
    );
  }
  return subtle;
}

async function importAesKey(
  passphrase: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const baseKey = await subtle.importKey(
    "raw",
    textEncoder.encode(passphrase) as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export interface EncryptedContainer {
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  plaintextHash: Uint8Array;
}

export async function encryptPayload(
  plaintext: Uint8Array,
  passphrase: string
): Promise<EncryptedContainer> {
  const subtle = getSubtleCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await importAesKey(passphrase, salt);
  const encrypted = await subtle.encrypt(
    { name: "AES-GCM", iv: iv as BufferSource },
    key,
    plaintext as BufferSource
  );
  const hashBuffer = await subtle.digest("SHA-256", plaintext as BufferSource);
  return {
    salt,
    iv,
    ciphertext: new Uint8Array(encrypted),
    plaintextHash: new Uint8Array(hashBuffer),
  };
}

export async function decryptPayload(
  container: EncryptedContainer,
  passphrase: string
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const key = await importAesKey(passphrase, container.salt);
  let plaintext: ArrayBuffer;
  try {
    plaintext = await subtle.decrypt(
      { name: "AES-GCM", iv: container.iv as BufferSource },
      key,
      container.ciphertext as BufferSource
    );
  } catch (e) {
    throw new Error(
      "Mot de passe invalide ou sauvegarde chiffrée corrompue."
    );
  }
  const expectedHash = new Uint8Array(
    await subtle.digest("SHA-256", plaintext as BufferSource)
  );
  if (!constantTimeEqual(expectedHash, container.plaintextHash)) {
    throw new Error("Intégrité de la sauvegarde compromise (hash SHA-256 invalide).");
  }
  return new Uint8Array(plaintext);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

export function serializeContainer(
  container: EncryptedContainer
): Uint8Array {
  const header = new Uint8Array(HEADER_LENGTH);
  header.set(MAGIC, 0);
  // version
  header[8] = (VERSION >> 8) & 0xff;
  header[9] = VERSION & 0xff;
  // flags
  header[10] = (FLAG_ENCRYPTED >> 8) & 0xff;
  header[11] = FLAG_ENCRYPTED & 0xff;
  header.set(container.salt, 12);
  header.set(container.iv, 28);

  const hashLen = container.plaintextHash.length;
  const out = new Uint8Array(
    HEADER_LENGTH + container.ciphertext.length + hashLen
  );
  out.set(header, 0);
  out.set(container.ciphertext, HEADER_LENGTH);
  out.set(container.plaintextHash, HEADER_LENGTH + container.ciphertext.length);
  return out;
}

export interface ParsedContainer {
  encrypted: boolean;
  salt: Uint8Array;
  iv: Uint8Array;
  ciphertext: Uint8Array;
  plaintextHash: Uint8Array;
  /** When `encrypted` is false, the entire post-header payload is the raw DB. */
  rawPayload: Uint8Array;
}

export function parseContainer(bytes: Uint8Array): ParsedContainer {
  if (bytes.length < HEADER_LENGTH) {
    throw new Error("Fichier de sauvegarde trop petit pour être valide.");
  }
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      throw new Error("Signature de sauvegarde invalide (magic bytes).");
    }
  }
  const version = (bytes[8] << 8) | bytes[9];
  if (version !== VERSION) {
    throw new Error(
      `Version de sauvegarde non supportée : ${version} (attendue : ${VERSION}).`
    );
  }
  const flags = (bytes[10] << 8) | bytes[11];
  const encrypted = (flags & FLAG_ENCRYPTED) === FLAG_ENCRYPTED;
  const salt = bytes.slice(12, 28);
  const iv = bytes.slice(28, 40);
  const tail = bytes.slice(HEADER_LENGTH);

  if (!encrypted) {
    return {
      encrypted: false,
      salt,
      iv,
      ciphertext: new Uint8Array(0),
      plaintextHash: new Uint8Array(0),
      rawPayload: tail,
    };
  }

  if (tail.length < 32) {
    throw new Error("Conteneur chiffré tronqué (hash manquant).");
  }
  const ciphertext = tail.slice(0, tail.length - 32);
  const plaintextHash = tail.slice(tail.length - 32);
  return {
    encrypted: true,
    salt,
    iv,
    ciphertext,
    plaintextHash,
    rawPayload: new Uint8Array(0),
  };
}

export function serializePlaintext(plaintext: Uint8Array): Uint8Array {
  // Plaintext container: same header layout with FLAG_ENCRYPTED cleared.
  const header = new Uint8Array(HEADER_LENGTH);
  header.set(MAGIC, 0);
  header[8] = (VERSION >> 8) & 0xff;
  header[9] = VERSION & 0xff;
  // flags = 0
  const out = new Uint8Array(HEADER_LENGTH + plaintext.length);
  out.set(header, 0);
  out.set(plaintext, HEADER_LENGTH);
  return out;
}

export function isEncryptedContainer(bytes: Uint8Array): boolean {
  if (bytes.length < 12) {
    return false;
  }
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      return false;
    }
  }
  const flags = (bytes[10] << 8) | bytes[11];
  return (flags & FLAG_ENCRYPTED) === FLAG_ENCRYPTED;
}

export function readMetadata(bytes: Uint8Array): {
  encrypted: boolean;
  version: number;
} {
  if (bytes.length < 12) {
    return { encrypted: false, version: 0 };
  }
  let validMagic = true;
  for (let i = 0; i < MAGIC.length; i += 1) {
    if (bytes[i] !== MAGIC[i]) {
      validMagic = false;
      break;
    }
  }
  if (!validMagic) {
    return { encrypted: false, version: 0 };
  }
  return {
    encrypted: isEncryptedContainer(bytes),
    version: (bytes[8] << 8) | bytes[9],
  };
}

export const __test__ = {
  MAGIC,
  VERSION,
  FLAG_ENCRYPTED,
  HEADER_LENGTH,
  PBKDF2_ITERATIONS,
};

// Re-export to allow the runtime to validate the text decoder isn't stripped.
export const _decoderProbe = textDecoder.decode(new Uint8Array([66, 65]));
