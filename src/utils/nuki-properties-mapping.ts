/**
 * Complete HostAway Listing ID to Property Type Mapping
 * Based on comprehensive docs/Listings.csv + prokopova_listings.csv
 */

import { HOSTAWAY_LISTING_TO_ROOM } from './prokopova-room-mapping';

export type NukiPropertyType = 'prokopova' | 'rehorova' | 'borivojova' | 'other';

export interface NukiPropertyMapping {
  listingId: string;
  name: string;
  address: string;
  propertyType: NukiPropertyType;
  roomCode?: string; // Only for Prokopova properties
}

// Non-Prokopova Nuki properties from other Prague listings
export const OTHER_NUKI_PROPERTIES: Record<string, NukiPropertyMapping> = {
  '271444': {
    listingId: '271444',
    name: 'Central, Spacious, Modern 5 Bedrm duplex w/Balcony',
    address: 'Řehořova',
    propertyType: 'rehorova'
  },
  '271479': {
    listingId: '271479',
    name: 'Skyline Nest on Borivojova',
    address: 'Bořivojova 73',
    propertyType: 'borivojova'
  }
};

// Complete mapping combining Prokopova + Other Nuki properties
export const ALL_NUKI_PROPERTIES: Record<string, NukiPropertyMapping> = {
  // Prokopova properties with room codes
  ...Object.fromEntries(
    Object.entries(HOSTAWAY_LISTING_TO_ROOM).map(([listingId, roomCode]) => [
      listingId,
      {
        listingId,
        name: `Prokopova Room ${roomCode}`,
        address: 'Prokopova 197/9',
        propertyType: 'prokopova' as NukiPropertyType,
        roomCode
      }
    ])
  ),
  // Other Nuki properties
  ...OTHER_NUKI_PROPERTIES
};

/**
 * Check if a HostAway listing ID has Nuki access
 */
export function hasNukiAccessByListingId(listingId: string | number): boolean {
  return String(listingId) in ALL_NUKI_PROPERTIES;
}

/**
 * Get property mapping from HostAway listing ID
 */
export function getNukiPropertyMapping(listingId: string | number): NukiPropertyMapping | null {
  return ALL_NUKI_PROPERTIES[String(listingId)] || null;
}

/**
 * Get property type from HostAway listing ID
 */
export function getNukiPropertyTypeByListingId(listingId: string | number): NukiPropertyType | null {
  const mapping = getNukiPropertyMapping(listingId);
  return mapping?.propertyType || null;
}

/**
 * Check if a listing is a Prokopova property
 */
export function isProkopovaListingId(listingId: string | number): boolean {
  const mapping = getNukiPropertyMapping(listingId);
  return mapping?.propertyType === 'prokopova' || false;
}

/**
 * Check if a listing is a Řehořova property
 */
export function isRehorovaListingId(listingId: string | number): boolean {
  const mapping = getNukiPropertyMapping(listingId);
  return mapping?.propertyType === 'rehorova' || false;
}

/**
 * Check if a listing is a Bořivojova property
 */
export function isBorivojovaListingId(listingId: string | number): boolean {
  const mapping = getNukiPropertyMapping(listingId);
  return mapping?.propertyType === 'borivojova' || false;
}