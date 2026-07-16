const SCOPE_DOMAIN = "afferent:scope:v1\0";
const MAX_EXTERNAL_KEY_LENGTH = 512;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

export async function deriveScopeId(externalKey: string): Promise<string> {
  const key = externalKey.trim();
  if (!key || key.length > MAX_EXTERNAL_KEY_LENGTH) {
    throw new Error("A verified external identity key is required");
  }
  const input = new TextEncoder().encode(`${SCOPE_DOMAIN}${key}`);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return base64Url(new Uint8Array(digest));
}
