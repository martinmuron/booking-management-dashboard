# HostAway Custom Field Integration Guide

## Overview
This document explains how to update HostAway reservations with Nick Jenny check-in links using the custom field API.

## Custom Field Details

### Nick Jenny Check-in Link Field
- **Field Name**: Check In Link Nick Jenny
- **Field ID**: 81717
- **Variable Name**: `reservation_check_in_link_nick_jenny`
- **Type**: text
- **Created**: 2025-08-20

## API Endpoints

### 1. Get Custom Fields
```bash
GET https://www.nickandjenny.cz/api/hostaway/custom-fields
```
Returns all available custom fields in HostAway.

### 2. Update Custom Field
```bash
POST https://www.nickandjenny.cz/api/hostaway/update-custom-field
```
Body:
```json
{
  "reservationId": "47399633",
  "customFieldId": 81717,
  "value": "https://www.nickandjenny.cz/checkin/ABC123"
}
```

### 3. Get Reservation with Custom Fields
```bash
GET https://www.nickandjenny.cz/api/hostaway/reservation/{reservationId}
```
Returns reservation details including custom field values.

## How to Update Reservations

### Method 1: Using the Script
```bash
node scripts/update-hostaway-custom-fields.js
```
This script automatically:
1. Fetches recent bookings from the database
2. Generates check-in links for each booking
3. Updates the HostAway custom field
4. Verifies the update was successful

### Method 2: Direct API Call
```bash
curl -X POST "https://www.nickandjenny.cz/api/hostaway/update-custom-field" \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "47399633",
    "customFieldId": 81717,
    "value": "https://www.nickandjenny.cz/checkin/TOKEN123"
  }'
```

### Method 3: Using HostAway Service
```javascript
import { hostAwayService } from '@/services/hostaway.service';

// Update Nick Jenny check-in link
const result = await hostAwayService.updateNickJennyCheckInLink(
  reservationId,  // e.g., 47399633
  checkInLink     // e.g., "https://www.nickandjenny.cz/checkin/ABC123"
);
```

## Implementation Details

### Service Method (`hostaway.service.ts`)
The `updateNickJennyCheckInLink` method:
1. Fetches the existing reservation
2. Preserves all existing custom fields
3. Updates only the Nick Jenny field (ID: 81717)
4. Sends the update to HostAway API

### Custom Field Structure in HostAway
```json
{
  "customFieldValues": [
    {
      "customFieldId": 81717,
      "value": "https://www.nickandjenny.cz/checkin/TOKEN"
    }
  ]
}
```

## Important Notes

1. **Field ID is Critical**: Always use field ID 81717 for the Nick Jenny check-in link
2. **Preserve Other Fields**: The update process preserves all other custom fields
3. **Check-in Link Format**: `https://www.nickandjenny.cz/checkin/{checkInToken}`
4. **Rate Limits**: HostAway has rate limits - space out requests when updating multiple reservations

## Verification

After updating, verify the custom field was set:
```bash
curl -X GET "https://www.nickandjenny.cz/api/hostaway/reservation/{reservationId}" \
  -H "Content-Type: application/json" | \
  jq '.data.customFieldValues[] | select(.customFieldId == 81717)'
```

## Troubleshooting

### Field Not Updating
- Ensure the reservation exists in HostAway
- Check that the field ID is exactly 81717
- Verify the check-in link is a valid URL

### API Errors
- 400: Bad request - check parameters
- 404: Reservation not found
- 429: Rate limit exceeded - wait and retry

## Other Available Custom Fields

| Field Name | ID | Variable Name | Purpose |
|------------|-----|--------------|---------|
| Check-in Online Status | 60179 | reservation_checkin_online_status | Status from other check-in system |
| Check-in Online URL | 60175 | reservation_checkin_online_url | URL from other check-in system |
| Check-in Reservation URL | 60177 | reservation_checkin_reservation_url | Dashboard URL |
| Identity Verification Status | 60178 | reservation_identity_verification_status | ID verification status |
| Remote Access Link | 60180 | reservation_remote_access_link | Remote access URL |
| Upselling Link | 60176 | reservation_upselling_link | Upselling opportunities |

These fields appear to be from another check-in system (possibly Chekin) and should not be modified by the Nick Jenny system.