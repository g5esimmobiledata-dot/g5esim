const DAY_ORDER = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

function parseBoolean(value?: string | boolean | null) {
  if (typeof value === 'boolean') return value;
  return String(value || '').toLowerCase() === 'true';
}

function getLocalTimeParts(timeZone?: string) {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone || 'UTC',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const weekday = parts.find((part) => part.type === 'weekday')?.value.toLowerCase().slice(0, 3) || 'mon';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || '0');
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || '0');

  return { weekday, minutes: (hour * 60) + minute };
}

function toMinutes(value?: string | null) {
  if (!value || !value.includes(':')) return null;
  const [hourText, minuteText] = value.split(':');
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return (hour * 60) + minute;
}

export function isWhatsAppSupportAvailable(settings: {
  support_whatsapp_enabled?: string | boolean | null;
  support_whatsapp_schedule_enabled?: string | boolean | null;
  support_whatsapp_start_time?: string | null;
  support_whatsapp_end_time?: string | null;
  support_whatsapp_working_days?: string | null;
  timezone?: string | null;
}) {
  if (!parseBoolean(settings.support_whatsapp_enabled)) {
    return false;
  }

  if (!parseBoolean(settings.support_whatsapp_schedule_enabled)) {
    return true;
  }

  const allowedDays = String(settings.support_whatsapp_working_days || '')
    .split(',')
    .map((day) => day.trim().toLowerCase())
    .filter((day): day is typeof DAY_ORDER[number] => DAY_ORDER.includes(day as typeof DAY_ORDER[number]));

  const { weekday, minutes } = getLocalTimeParts(settings.timezone || 'UTC');
  if (allowedDays.length > 0 && !allowedDays.includes(weekday as typeof DAY_ORDER[number])) {
    return false;
  }

  const startMinutes = toMinutes(settings.support_whatsapp_start_time);
  const endMinutes = toMinutes(settings.support_whatsapp_end_time);
  if (startMinutes === null || endMinutes === null) {
    return true;
  }

  if (startMinutes <= endMinutes) {
    return minutes >= startMinutes && minutes <= endMinutes;
  }

  return minutes >= startMinutes || minutes <= endMinutes;
}

export function getConciergePricingLabel(settings: {
  concierge_pricing_mode?: string | null;
  concierge_billing_cycle?: string | null;
  concierge_fee?: string | null;
}) {
  const mode = String(settings.concierge_pricing_mode || 'free').toLowerCase();
  if (mode !== 'paid') return 'Free';

  const fee = String(settings.concierge_fee || '').trim();
  const cycle = String(settings.concierge_billing_cycle || 'one_time').toLowerCase();
  if (!fee) return cycle === 'monthly' ? 'Paid monthly' : 'Paid one time';

  return cycle === 'monthly' ? `$${fee}/month` : `$${fee} one time`;
}
