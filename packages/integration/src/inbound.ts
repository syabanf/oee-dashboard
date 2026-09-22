import type { IntegrationMapping } from '@oee/types';

export type InboundResult = { ok: true; machineId: string; externalId: string; stateCode: string } | { ok: false; error: string };

export const SAMPLE_PAYLOAD = JSON.stringify({ source: 'PLC', tag: 'DB101.M01', state: 'STOP' }, null, 2);

/** Resolves an inbound state payload to the canonical machine through the mapping master. The PLC tag never becomes the key. */
export function parseStatePayload(text: string, mappings: IntegrationMapping[], stateCodes: string[]): InboundResult {
  let body: unknown;
  try { body = JSON.parse(text); } catch { return { ok: false, error: 'Payload is not valid JSON.' }; }
  const { source, tag, state } = (body ?? {}) as Record<string, unknown>;
  if (typeof tag !== 'string' || typeof state !== 'string') return { ok: false, error: 'Payload needs a "tag" and a "state" string.' };
  const mapping = mappings.find((m) => m.externalId === tag && (typeof source !== 'string' || m.source === source));
  if (!mapping) return { ok: false, error: `No integration mapping for ${typeof source === 'string' ? `${source} ` : ''}"${tag}". It lands in the unmapped inbox.` };
  if (!stateCodes.includes(state)) return { ok: false, error: `"${state}" is not a machine state code. Known: ${stateCodes.join(', ')}.` };
  return { ok: true, machineId: mapping.machineId, externalId: tag, stateCode: state };
}
