// Normalised list of smart-lock codes discovered from the live Nuki account.
// We rely on these codes instead of a brittle hard-coded property list so that
// new “Ž###” style apartments are automatically supported.
const NUKI_DEVICE_ROOM_CODES = new Set([
  '001',
  '004',
  '101',
  '102',
  '103',
  '104',
  '201',
  '202',
  '203',
  '204',
  '301',
  '302',
  '303',
  '304',
  '401',
  '402',
  '403',
  '404',
  '501',
  '502',
  '503',
  '504',
  '601',
  '602',
  '604',
]);

// Named buildings / entrances that use Nuki access but don’t follow the “Ž###”
// convention.
const NUKI_SPECIAL_PROPERTY_NAMES = [
  'bořivojova 50',
  'borivojova 50',
  'bořivojova 73',
  'borivojova 73',
  'řehořova',
  'rehovorova',
  'rehorova',
];

// Legacy constant required by admin tooling – we still expose a deterministic
// list based on the smart-lock codes so existing pages keep working.
const STATIC_NUKI_PROPERTY_LIST: readonly string[] = [
  ...Array.from(NUKI_DEVICE_ROOM_CODES).map((code) => `Ž${code}`),
  'Bořivojova 50',
  'Bořivojova 73',
  'Řehořova',
];

export const NUKI_AUTHORIZED_PROPERTIES = STATIC_NUKI_PROPERTY_LIST;

/**
 * Normalize property name for fuzzy matching
 * @param name - Property name to normalize
 * @returns normalized name for comparison
 */
function normalizePropertyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function extractRoomCodes(propertyName: string): string[] {
  const codes = new Set<string>();

  // Match explicit numeric patterns (e.g. “(604)”, “Room 604”, “Ž604”).
  const explicitMatches = propertyName.match(/\b\d{3}\b/g);
  if (explicitMatches) {
    explicitMatches.forEach((match) => codes.add(match));
  }

  const normalized = normalizePropertyName(propertyName);

  // Match strings like “z604”, “ž604”, “room604”.
  const zMatches = normalized.match(/z(\d{3})/g);
  if (zMatches) {
    zMatches.map((match) => match.slice(1)).forEach((match) => codes.add(match));
  }

  const roomMatches = normalized.match(/room\s*(\d{3})/g);
  if (roomMatches) {
    roomMatches.map((match) => match.replace(/[^0-9]/g, '')).forEach((match) => {
      if (match.length === 3) codes.add(match);
    });
  }

  return Array.from(codes);
}

/**
 * Check if a property should have NUKI access codes displayed
 * Uses exact matching first, then fuzzy matching as fallback
 * @param propertyName - The name of the property from booking
 * @returns true if property should show access codes, false otherwise
 */
export function hasNukiAccess(propertyName: string): boolean {
  const normalizedInput = normalizePropertyName(propertyName);

  if (NUKI_SPECIAL_PROPERTY_NAMES.some((keyword) => normalizedInput.includes(keyword))) {
    return true;
  }

  // Quickly accept properties whose original name matches the legacy list exactly.
  if (STATIC_NUKI_PROPERTY_LIST.includes(propertyName)) {
    return true;
  }

  const roomCodes = extractRoomCodes(propertyName);
  if (roomCodes.some((code) => NUKI_DEVICE_ROOM_CODES.has(code))) {
    return true;
  }

  return false;
}

/**
 * Get property type for NUKI access
 * @param propertyName - The name of the property
 * @returns property type classification
 */
export function getNukiPropertyType(propertyName: string): 'named' | 'z-coded' | 'unauthorized' {
  if (!hasNukiAccess(propertyName)) {
    return 'unauthorized';
  }

  if (propertyName.startsWith('Ž')) {
    return 'z-coded';
  }

  return 'named';
}
