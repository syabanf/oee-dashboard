import type { IntegrationMessage, NotifyChannel, WorkOrder } from '@oee/types';

export type MessageDraft = Omit<IntegrationMessage, 'id' | 'at'>;

/** Stable fake latency from the text of a request, so the log reads the same in every browser tab. */
function latency(seed: string): number {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return 80 + (h % 340);
}
const json = (value: unknown) => JSON.stringify(value, null, 2);

/** POST that opens a corrective work order on the CMMS asset mapped to the machine. */
export function createWorkOrderMessage(wo: WorkOrder, technician: string | undefined, reason: string): MessageDraft {
  return {
    direction: 'OUT', system: 'CMMS', method: 'POST', path: '/api/v1/workorders', status: 201, latencyMs: latency(wo.id), eventId: wo.eventId,
    summary: `Work order ${wo.id} opened on ${wo.assetId}`,
    payload: json({ externalRef: wo.eventId, workOrderNo: wo.id, assetId: wo.assetId, type: 'CORRECTIVE', priority: 'HIGH', description: wo.title, failureCode: reason, assignedTo: technician ?? null }),
  };
}

/** PATCH that moves the work order along as the Andon event moves. */
export function updateWorkOrderMessage(wo: WorkOrder): MessageDraft {
  return {
    direction: 'OUT', system: 'CMMS', method: 'PATCH', path: `/api/v1/workorders/${wo.id}`, status: 200, latencyMs: latency(wo.id + wo.status), eventId: wo.eventId,
    summary: `Work order ${wo.id} → ${wo.status}`,
    payload: json({ status: wo.status, downtimeMinutes: wo.downtimeMin ?? null, partsUsed: wo.partsUsed ?? null }),
  };
}

const GATEWAY_PATH: Record<NotifyChannel, string> = { WHATSAPP: '/v1/whatsapp/messages', SMS: '/v1/sms', EMAIL: '/v1/mail/send' };

/** Escalation message to a role through the channel its ladder step names. */
export function gatewayMessage(channel: NotifyChannel, eventId: string, role: string, text: string): MessageDraft {
  return {
    direction: 'OUT', system: channel, method: 'POST', path: GATEWAY_PATH[channel], status: 200, latencyMs: latency(eventId + role), eventId,
    summary: `${role}: ${text}`,
    payload: json({ to: `role:${role.toLowerCase().replace(/\s+/g, '-')}`, template: 'andon_escalation', text }),
  };
}

/** What the state engine records when a PLC state change arrives. */
export function plcStateMessage(externalId: string, stateCode: string, summary: string, eventId?: string): MessageDraft {
  return {
    direction: 'IN', system: 'PLC', method: 'MQTT', path: `plant/factory-a/${externalId}/state`, status: 200, latencyMs: latency(externalId + stateCode), eventId,
    summary, payload: json({ tag: externalId, state: stateCode }),
  };
}
