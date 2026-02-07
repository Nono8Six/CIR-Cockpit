import type { Json } from '@/types/supabase';
import { Channel, type Interaction, type InteractionRow, type TimelineEvent } from '@/types';
import { createAppError } from '@/services/errors/AppError';
import { isRecord, readObject, readString } from '@/utils/recordNarrowing';
import { toJsonValue } from '@/utils/toJsonValue';

const CHANNEL_VALUES = Object.values(Channel);
const TIMELINE_TYPES: TimelineEvent['type'][] = ['note', 'status_change', 'reminder_change', 'creation', 'file', 'order_ref_change'];

const isChannel = (value: string): value is Channel => CHANNEL_VALUES.some(channel => channel === value);
const isTimelineType = (value: string): value is TimelineEvent['type'] => TIMELINE_TYPES.some(type => type === value);

const ensureTimelineEvent = (value: unknown): TimelineEvent | null => {
  if (!isRecord(value)) return null;
  const id = readString(value, 'id');
  const date = readString(value, 'date');
  const type = readString(value, 'type');
  const content = readString(value, 'content');
  if (!id || !date || !type || !content || !isTimelineType(type)) return null;

  const rawMeta = readObject(value, 'meta');
  let meta: Record<string, Json> | undefined;
  if (rawMeta) {
    const metaRecord: Record<string, Json> = {};
    Object.entries(rawMeta).forEach(([key, entry]) => {
      metaRecord[key] = toJsonValue(entry);
    });
    meta = metaRecord;
  }
  const author = readString(value, 'author') ?? undefined;
  return { id, date, type, content, author, meta };
};

const ensureTimeline = (value: unknown): TimelineEvent[] => {
  if (!Array.isArray(value)) throw createAppError({ code: 'DB_READ_FAILED', message: "Donnees d'historique invalides. Rechargez la page.", source: 'db', details: 'timeline_invalid' });
  const timeline = value.map(ensureTimelineEvent).filter((event): event is TimelineEvent => Boolean(event));
  if (timeline.length !== value.length) throw createAppError({ code: 'DB_READ_FAILED', message: "Donnees d'historique invalides. Rechargez la page.", source: 'db', details: 'timeline_invalid' });
  return timeline;
};

const ensureChannel = (value: string): Channel => {
  if (!isChannel(value)) throw createAppError({ code: 'DB_READ_FAILED', message: 'Donnees canal invalides. Rechargez la page.', source: 'db', details: 'canal_invalid' });
  return value;
};

export const hydrateTimeline = (interaction: InteractionRow): Interaction => ({ ...interaction, channel: ensureChannel(interaction.channel), timeline: ensureTimeline(interaction.timeline) });
