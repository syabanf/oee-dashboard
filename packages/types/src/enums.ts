/** How a machine state or downtime reason counts toward OEE. Configured in master data, never hardcoded per state. */
export type LossClass = 'PRODUCTIVE' | 'AVAILABILITY' | 'PERFORMANCE' | 'QUALITY' | 'PLANNED' | 'EXCLUDED';
export const LOSS_CLASS_LABEL: Record<LossClass, string> = {
  PRODUCTIVE: 'Productive',
  AVAILABILITY: 'Availability loss',
  PERFORMANCE: 'Performance loss',
  QUALITY: 'Quality loss',
  PLANNED: 'Planned',
  EXCLUDED: 'Excluded',
};
export const LOSS_CLASSES = Object.keys(LOSS_CLASS_LABEL) as LossClass[];

/** What the Andon light shows for a state. */
export type AndonLevel = 'RUNNING' | 'WARNING' | 'ATTENTION' | 'STOP' | 'ASSISTANCE' | 'OFF';
export const ANDON_LEVEL_LABEL: Record<AndonLevel, string> = {
  RUNNING: 'Running',
  WARNING: 'Warning',
  ATTENTION: 'Attention',
  STOP: 'Stop',
  ASSISTANCE: 'Assistance',
  OFF: 'Off',
};
export const ANDON_LEVELS = Object.keys(ANDON_LEVEL_LABEL) as AndonLevel[];

/** Downtime lifecycle, in order. */
export const EVENT_STATUSES = ['DETECTED', 'ACKNOWLEDGED', 'CLASSIFIED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED'] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];
export const EVENT_STATUS_LABEL: Record<EventStatus, string> = {
  DETECTED: 'Detected',
  ACKNOWLEDGED: 'Acknowledged',
  CLASSIFIED: 'Classified',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  VERIFIED: 'Verified',
};

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM';
export const PRIORITY_LABEL: Record<Priority, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium' };
export const PRIORITIES = Object.keys(PRIORITY_LABEL) as Priority[];

export type IntegrationSource = 'PLC' | 'SCADA' | 'MES' | 'CMMS' | 'ERP' | 'QMS';
export const INTEGRATION_SOURCES: IntegrationSource[] = ['PLC', 'SCADA', 'MES', 'CMMS', 'ERP', 'QMS'];

export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CLOSED';
export const WORK_ORDER_STATUS_LABEL: Record<WorkOrderStatus, string> = { OPEN: 'Open', IN_PROGRESS: 'In progress', COMPLETED: 'Completed', CLOSED: 'Closed' };

/** Where an escalation step sends its message. */
export type NotifyChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';
export const NOTIFY_CHANNEL_LABEL: Record<NotifyChannel, string> = { WHATSAPP: 'WhatsApp', SMS: 'SMS', EMAIL: 'Email' };
export const NOTIFY_CHANNELS = Object.keys(NOTIFY_CHANNEL_LABEL) as NotifyChannel[];

/** Systems that show up in the integration message log. */
export type MessageSystem = 'PLC' | 'CMMS' | NotifyChannel;

/** The six big losses, two per OEE component. */
export type BigLoss = 'UNPLANNED' | 'SETUP' | 'MINOR' | 'SPEED' | 'SCRAP' | 'REWORK';
export const BIG_LOSSES: { key: BigLoss; label: string; lossClass: LossClass; example: string }[] = [
  { key: 'UNPLANNED', label: 'Unplanned downtime', lossClass: 'AVAILABILITY', example: 'Breakdown, jam, waiting for material' },
  { key: 'SETUP', label: 'Setup and changeover', lossClass: 'AVAILABILITY', example: 'Product changeover, tool change' },
  { key: 'MINOR', label: 'Minor stops and idling', lossClass: 'PERFORMANCE', example: 'Sensor block, brief jam-up' },
  { key: 'SPEED', label: 'Speed loss', lossClass: 'PERFORMANCE', example: 'Running below rated capacity' },
  { key: 'SCRAP', label: 'Scrap', lossClass: 'QUALITY', example: 'Defective parts discarded' },
  { key: 'REWORK', label: 'Rework', lossClass: 'QUALITY', example: 'Parts reprocessed to meet spec' },
];

export type Disposition = 'SCRAP' | 'REWORK';
export type OeeMetric = 'OEE' | 'AVAILABILITY' | 'PERFORMANCE' | 'QUALITY';
export const OEE_METRIC_LABEL: Record<OeeMetric, string> = { OEE: 'OEE', AVAILABILITY: 'Availability', PERFORMANCE: 'Performance', QUALITY: 'Quality' };
export const OEE_METRICS = Object.keys(OEE_METRIC_LABEL) as OeeMetric[];
export type MessageDirection = 'IN' | 'OUT';

export type DayKind = 'PRODUCTION' | 'NON_PRODUCTION' | 'HOLIDAY' | 'OVERTIME';
export const DAY_KIND_LABEL: Record<DayKind, string> = {
  PRODUCTION: 'Normal production',
  NON_PRODUCTION: 'Non-production',
  HOLIDAY: 'Holiday',
  OVERTIME: 'Special overtime',
};

export type MaturityStage = 'Descriptive' | 'Diagnostic' | 'Predictive' | 'Prescriptive';
