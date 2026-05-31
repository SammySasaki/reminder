const TZ = process.env.TIMEZONE || 'America/Los_Angeles';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getTodayLocal() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date());
}

export function getDayOfWeekLocal() {
  const dayName = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
  }).format(new Date());
  return DAY_NAMES.indexOf(dayName);
}

export function getDayNameLocal() {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'long',
  }).format(new Date());
}
