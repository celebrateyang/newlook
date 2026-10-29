import { createPublicKey, randomUUID } from "node:crypto";
import { appendFile, writeFile } from "node:fs/promises";
const publishable = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";
if (!publishable.startsWith("pk_test_")) throw Error("Public smoke checks require a Clerk development instance");
const host = Buffer.from(publishable.slice(8), "base64").toString().replace(/\$$/, "");
if (!/^[a-z0-9-]+\.clerk\.accounts\.dev$/.test(host)) throw Error("Unexpected Clerk development host");
const response = await fetch(`https://${host}/.well-known/jwks.json`, { signal: AbortSignal.timeout(15_000) });
if (!response.ok) throw Error(`Could not fetch Clerk public keys (${response.status})`);
const { keys } = await response.json();
const candidates = keys.filter(key => key.kty === "RSA" && (!key.use || key.use === "sig"));
if (candidates.length !== 1) throw Error("Clerk key rotation requires reviewing the public verification key selection");
const pem = createPublicKey({ key: candidates[0], format: "jwk" }).export({ type: "spki", format: "pem" });
if (process.env.GITHUB_ENV) {
  const delimiter = randomUUID();
  await appendFile(process.env.GITHUB_ENV, `CLERK_JWT_KEY<<${delimiter}\n${pem}\n${delimiter}\n`);
} else if (process.argv[2]) await writeFile(process.argv[2], pem);
else throw Error("Supply an output path for the public verification key");
console.log("Prepared the Clerk development public verification key; no server credential used.");
