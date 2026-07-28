import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;

function encryptionKey(): Buffer {
  const encoded = process.env.NEXUS_CREDENTIAL_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("Falta NEXUS_CREDENTIAL_ENCRYPTION_KEY. Genera una clave Base64 de 32 bytes y reinicia el servidor.");
  }
  const key = Buffer.from(encoded, "base64");
  if (key.length !== 32) {
    throw new Error("NEXUS_CREDENTIAL_ENCRYPTION_KEY debe representar exactamente 32 bytes en Base64.");
  }
  return key;
}

export function encryptCredential(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return {
    ciphertext: ciphertext.toString("base64"),
    iv: iv.toString("base64"),
    authTag: cipher.getAuthTag().toString("base64"),
    keyVersion: KEY_VERSION,
  };
}

export function decryptCredential(input: {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}): string {
  if (input.keyVersion !== KEY_VERSION) {
    throw new Error("La versión de cifrado de la credencial no es compatible.");
  }
  const decipher = createDecipheriv(ALGORITHM, encryptionKey(), Buffer.from(input.iv, "base64"));
  decipher.setAuthTag(Buffer.from(input.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
