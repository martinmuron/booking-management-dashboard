// List of 28 authorized properties that should have NUKI access codes
export const NUKI_AUTHORIZED_PROPERTIES = [
  // Named properties
  "Bořivojova 50",
  "Řehořova",
  "Sunny studio with terrace by tram (604)", // CRITICAL FIX: Has keypad code 143729

  // Z-coded properties
  "Ž001",
  "Ž004",
  "Ž101",
  "Ž102",
  "Ž103",
  "Ž104",
  "Ž201",
  "Ž202",
  "Ž203",
  "Ž204",
  "Ž301",
  "Ž302",
  "Ž303",
  "Ž304",
  "Ž401",
  "Ž402",
  "Ž403",
  "Ž404",
  "Ž501",
  "Ž502",
  "Ž503",
  "Ž504",
  "Ž601",
  "Ž602",
  "Ž604"
] as const;

/**
 * Normalize property name for fuzzy matching
 * @param name - Property name to normalize
 * @returns normalized name for comparison
 */
function normalizePropertyName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Check if a property should have NUKI access codes displayed
 * Uses exact matching first, then fuzzy matching as fallback
 * @param propertyName - The name of the property from booking
 * @returns true if property should show access codes, false otherwise
 */
export function hasNukiAccess(propertyName: string): boolean {
  // First try exact matching (fastest)
  const exactMatch = (NUKI_AUTHORIZED_PROPERTIES as readonly string[]).some(
    (authorizedName) => authorizedName === propertyName
  );

  if (exactMatch) {
    return true;
  }

  // Fallback to fuzzy matching for property name variations
  const normalizedInput = normalizePropertyName(propertyName);

  return (NUKI_AUTHORIZED_PROPERTIES as readonly string[]).some((authorizedName) => {
    const normalizedAuthorized = normalizePropertyName(authorizedName);

    // Exact normalized match
    if (normalizedInput === normalizedAuthorized) {
      return true;
    }

    // Handle specific patterns that might cause mismatches

    // Z-coded properties: handle various formats (Ž604, Z604, 604, etc.)
    if (authorizedName.startsWith('Ž')) {
      const zNumber = authorizedName.slice(1); // Remove Ž prefix
      return (
        normalizedInput.includes(zNumber) ||
        normalizedInput.includes(`z${zNumber}`) ||
        normalizedInput.includes(`room ${zNumber}`) ||
        normalizedInput.endsWith(zNumber)
      );
    }

    // Named properties: check for partial matches with high confidence
    if (normalizedInput.length > 5 && normalizedAuthorized.length > 5) {
      // Check if one contains the other (with substantial overlap)
      const longerName = normalizedInput.length > normalizedAuthorized.length ? normalizedInput : normalizedAuthorized;
      const shorterName = normalizedInput.length > normalizedAuthorized.length ? normalizedAuthorized : normalizedInput;

      // Require at least 70% overlap for fuzzy matching
      if (shorterName.length / longerName.length >= 0.7) {
        return longerName.includes(shorterName) || shorterName.includes(longerName);
      }
    }

    return false;
  });
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
