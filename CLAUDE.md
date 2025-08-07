# Nick Jenny Booking Management System

## Booking Sync Strategy

### Current Implementation (Optimized)

The booking sync system has been optimized to handle large datasets efficiently:

#### Initial Sync (first time or after clearing database):
- Fetches **last 7 days + all future bookings** from HostAway
- This gives a reasonable historical context without overwhelming the database
- Should typically result in a manageable number of bookings (hundreds vs thousands)

#### Subsequent Syncs (clicking sync button):
- Fetches **only future bookings** (from today onwards)
- Updates existing bookings if HostAway data has changed (guest count, dates, etc.)
- Never deletes existing bookings
- Preserves platform-specific status (CHECKED_IN, PAYMENT_COMPLETED, etc.)

### API Endpoints

#### `/api/bookings/sync` (POST)
- Default behavior: Incremental sync (future bookings only)
- Query parameters:
  - `?clear=true`: Clear database first, then do initial sync
  - `?force=true`: Force full sync (last 7 days + future)

#### Usage Examples:
```bash
# Normal sync (future bookings only)
POST /api/bookings/sync

# Clear and resync (last 7 days + future)
POST /api/bookings/sync?clear=true

# Force full sync without clearing
POST /api/bookings/sync?force=true
```

### Important Notes

1. **Never fetches all historical bookings** - This was causing database bloat with 10,000+ bookings
2. **Status preservation** - Platform statuses (CHECKED_IN, PAYMENT_COMPLETED, etc.) are never overwritten by HostAway sync
3. **Token preservation** - Check-in tokens remain unchanged during updates
4. **Incremental by default** - Regular sync button only fetches new/future bookings
5. **Date filtering** - Frontend filters out test bookings before 2024

### Database Performance

- Initial sync: ~200-500 bookings (7 days + future)
- Regular syncs: Only new future bookings
- No cascade deletions unless explicitly clearing database
- Preserves related data (guests, payments, virtual keys)