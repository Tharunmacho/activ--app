export type UpdateDeliveryChannels = { email: boolean; whatsapp: boolean; push: boolean };

export const UPDATE_DELIVERY_CHANNELS: { key: keyof UpdateDeliveryChannels; label: string; detail: string }[] = [
  { key: 'email', label: 'Email', detail: 'Send an email to eligible members.' },
  { key: 'whatsapp', label: 'WhatsApp', detail: 'Send a WhatsApp message to eligible members.' },
  { key: 'push', label: 'Push notifications', detail: 'Notify eligible app and browser subscribers.' },
];

/** Old saved updates predate channel controls. Only a genuinely missing field
 * keeps their former all-channel behavior; malformed values never enable sends. */
export function resolveUpdateDeliveryChannels(value: unknown, legacy = false): UpdateDeliveryChannels {
  if (value === undefined && legacy) return { email: true, whatsapp: true, push: true };
  const row = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const valid = Object.keys(row).length === 3 && UPDATE_DELIVERY_CHANNELS.every(({ key }) =>
    Object.prototype.hasOwnProperty.call(row, key) && typeof row[key] === 'boolean');
  if (!valid) return { email: false, whatsapp: false, push: false };
  return { email: row.email === true, whatsapp: row.whatsapp === true, push: row.push === true };
}

export function updateDeliverySummary(channels: UpdateDeliveryChannels): string {
  const labels = UPDATE_DELIVERY_CHANNELS.filter(channel => channels[channel.key]).map(channel => channel.label);
  return labels.length ? `Selected channels: ${labels.join(', ')}` : 'Feed only: no email, WhatsApp or push notifications.';
}
