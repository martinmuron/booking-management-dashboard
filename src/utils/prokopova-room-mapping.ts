/**
 * HostAway Listing ID to Prokopova Room Code Mapping
 * Based on docs/prokopova_listings.csv
 */

export const HOSTAWAY_LISTING_TO_ROOM: Record<string, string> = {
  // HostAway Listing ID -> Room Code
  '271459': '301',  // Apartment in Zizkov (301)
  '271460': '302',  // Apartment in Zizkov (302)
  '271462': '601',  // Bright 2 bed with big terrace by tram
  '271463': '103',  // Flat in Zizkov (103)
  '271464': '401',  // Apartment in Zizkov (401)
  '271465': '402',  // 8 bed apartment in Zizkov (402)
  '271466': '303',  // Flat in Zizkov (303)
  '271467': '501',  // Apartment in Zizkov with *Free Underground Parking * (501)
  '271468': '101',  // Flat in Zizkov (101)
  '271469': '502',  // Apartment in Zizkov (502)
  '271470': '504',  // Modern studio with balcony, TV
  '271471': '503',  // Flat in Zizkov (503)
  '271472': '004',  // Fun bright studio with flat screen TV
  '271473': '304',  // Modern, bright studio in a great location
  '271474': '403',  // 8 bed flat in great location
  '271476': '404',  // Modern studio with balcony + TV
  '271480': '001',  // Chic+Contemporary Zizkov Studio
  '273351': '602',  // Prokopova 602
  '271448': '104',  // Smart studio in Žizkov near tram (104)
  '271451': '204',  // Comfy studio in Žizkov near tram (204)
  '271453': '201',  // Flat by Zizkov (201)
  '271455': '202',  // Flat in Zizkov (202)
  '271456': '102',  // Flat in Zizkov (102)
  '271457': '203',  // 8 bed flat with great location (203)
  '271458': '604',  // Sunny studio with terrace by tram (604)
};

export const ROOM_TO_HOSTAWAY_LISTING: Record<string, string> = Object.fromEntries(
  Object.entries(HOSTAWAY_LISTING_TO_ROOM).map(([listingId, roomCode]) => [roomCode, listingId])
);

/**
 * Get room code from HostAway listing ID
 */
export function getRoomCodeFromListingId(listingId: string | number): string | null {
  return HOSTAWAY_LISTING_TO_ROOM[String(listingId)] || null;
}

/**
 * Get HostAway listing ID from room code
 */
export function getListingIdFromRoomCode(roomCode: string): string | null {
  return ROOM_TO_HOSTAWAY_LISTING[roomCode] || null;
}

/**
 * Check if a listing ID maps to a Prokopova room
 */
export function isProkopovaListing(listingId: string | number): boolean {
  return String(listingId) in HOSTAWAY_LISTING_TO_ROOM;
}