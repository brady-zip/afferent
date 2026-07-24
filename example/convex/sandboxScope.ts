import { deriveScopeId } from "afferent/server.js";

const OWNER_DOMAIN = "afferent:demo-owner:v1\0";
const GENERATION_DOMAIN = "afferent:demo-generation:v1\0";

function requireGeneration(generation: number) {
  if (!Number.isSafeInteger(generation) || generation < 1) {
    throw new Error("A positive sandbox generation is required");
  }
}

export function deriveLogicalSandboxKey(
  verifiedUserId: string,
): Promise<string> {
  return deriveScopeId(`${OWNER_DOMAIN}${verifiedUserId}`);
}

export function derivePhysicalSandboxScope(
  logicalOwnerKey: string,
  generation: number,
): Promise<string> {
  requireGeneration(generation);
  return deriveScopeId(
    `${GENERATION_DOMAIN}${logicalOwnerKey}\0${String(generation)}`,
  );
}
