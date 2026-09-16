const DISPLAY_WORD_CASE: Record<string, string> = {
  approved: 'Approved',
  accounts: 'Accounts',
  agent: 'Agent',
  agents: 'Agents',
  reseller: 'Reseller',
  credentials: 'Credentials',
  admin: 'Admin',
  panel: 'Panel',
  marketplace: 'Marketplace',
  today: 'Today',
  customers: 'Customers',
  packages: 'Packages',
  ready: 'Ready',
  orders: 'Orders',
  track: 'Track',
  access: 'Access',
};

const DISPLAY_WORD_PATTERN = /\b(approved|accounts|agent|agents|reseller|credentials|admin|panel|marketplace|today|customers|packages|ready|orders|track|access)\b/g;
const CODE_ADJACENT_PATTERN = /[@/_{}-]/;

export function normalizeDisplayWords(text: string) {
  return text.replace(DISPLAY_WORD_PATTERN, (match, _word, offset, fullText) => {
    const previousChar = fullText[offset - 1] || '';
    const nextChar = fullText[offset + match.length] || '';

    if (CODE_ADJACENT_PATTERN.test(previousChar) || CODE_ADJACENT_PATTERN.test(nextChar)) {
      return match;
    }

    return DISPLAY_WORD_CASE[match] || match;
  });
}

export function formatDisplayValue(value?: string | null) {
  if (!value) return '';

  return normalizeDisplayWords(
    value
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (letter) => letter.toUpperCase()),
  );
}
