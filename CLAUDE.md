# Nick Jenny Booking Management System

## Booking Sync Strategy

### Full Historical Import + Real-time Updates (Latest)

The system now supports complete historical data import AND real-time updates via webhooks:

#### Full Historical Import:
- **Import All**: Fetches ALL historical bookings (no date restrictions)
- **Enhanced Pagination**: Uses HostAway's totalCount to ensure complete import
- **Progress Tracking**: Shows "Fetched X out of Y available" during sync
- **Performance Optimized**: Database indexes on checkInDate, status, createdAt

#### Real-time Webhook Integration:
- **Instant Updates**: New bookings appear immediately via HostAway webhooks
- **Event Types**: `reservation created`, `reservation updated`, `new message received`
- **Auto-sync**: No more polling - webhooks trigger immediate database updates
- **Status Preservation**: Platform statuses never overwritten by webhook updates

### API Endpoints

#### `/api/bookings/sync` (POST)
- **Default**: Incremental sync (future bookings only)
- **Full Import**: `?all=true` - Import ALL historical bookings
- **Clear + Sync**: `?clear=true` - Clear database first, then import
- **Date Range**: `?start=YYYY-MM-DD&end=YYYY-MM-DD` - Custom date range

#### `/api/webhooks/hostaway` (POST)
- **Real-time endpoint** for HostAway webhook notifications
- **Handles**: reservation created, reservation updated events
- **Auto-sync**: Automatically fetches and syncs individual bookings

#### `/api/webhooks/manage` (GET/POST/PUT/DELETE)
- **Manage webhooks** in HostAway from admin settings
- **Create**: Register webhook URLs with HostAway
- **Monitor**: View and toggle existing webhooks

#### Usage Examples:
```bash
# Full historical import (ALL bookings)
POST /api/bookings/sync?all=true

# Clear and import all
POST /api/bookings/sync?clear=true&all=true

# Custom date range import
POST /api/bookings/sync?start=2023-01-01&end=2024-12-31

# Real-time webhook (automatic)
POST /api/webhooks/hostaway
```

### Real-time Features

#### Webhook Setup (Admin Settings):
1. Go to Admin → Settings
2. Create webhook with URL: `https://yourdomain.vercel.app/api/webhooks/hostaway`
3. HostAway sends instant notifications for booking changes
4. Dashboard updates automatically without manual syncing

#### Auto-refresh Fallback:
- **2-minute polling** as backup (can be disabled)
- **Incremental checks** for new bookings since last update
- **Silent updates** - no user interruption

### Filtering System

#### Time-based Filters:
- **All Bookings**: Complete history
- **Past Bookings**: Before today
- **Upcoming Bookings**: Today onwards
- **Date Range**: Custom from/to dates

#### Database Performance:
- **Indexes**: checkInDate, status, createdAt for fast queries
- **Pagination**: 500 items per API request
- **Safety Limits**: 50K offset limit to prevent infinite loops

### Important Notes

1. **Complete Import**: Now fetches ALL available bookings from HostAway
2. **Real-time Updates**: Webhooks provide instant booking notifications
3. **Status Preservation**: Platform statuses (CHECKED_IN, PAYMENT_COMPLETED, etc.) never overwritten
4. **Token Preservation**: Check-in tokens remain unchanged during updates
5. **Backward Compatible**: Works with existing polling system as fallback
6. **Performance Optimized**: Database indexes for large dataset handling

### Migration Path

1. **First Time**: Use "Import All" to get complete historical data
2. **Setup Webhooks**: Configure in Admin Settings for real-time updates
3. **Monitor**: Check webhook status and logs in settings
4. **Fallback**: Auto-refresh continues as backup every 2 minutes