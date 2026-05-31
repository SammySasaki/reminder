export function normalizeQuestion(raw) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[?.!,;]+$/, '');
}
