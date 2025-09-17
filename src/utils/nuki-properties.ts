// List of 27 authorized properties that should have NUKI access codes
export const NUKI_AUTHORIZED_PROPERTIES = [
  // Named properties
  "Bořivojova 50",
  "Řehořova",

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
 * Check if a property should have NUKI access codes displayed
 * @param propertyName - The name of the property from booking
 * @returns true if property should show access codes, false otherwise
 */
export function hasNukiAccess(propertyName: string): boolean {
  return NUKI_AUTHORIZED_PROPERTIES.includes(propertyName as any);
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