# Nuki Device ↔ Environment Mapping

Derived from the live Nuki account (`GET /smartlock`) on 2025-09-29T15:40Z and the active environment variables pulled from Vercel. Every lock listed below is present in the account and referenced by the application.

| Env Var | Smartlock ID | Device Name (Nuki) | Usage |
| --- | --- | --- | --- |
| `NUKI_MAIN_ENTRANCE_ID` | 18120565789 | Main Door | Prokopova 197/9 – shared main entrance |
| `NUKI_BORIVOJOVA_ENTRY_ID` | 17958559348 | Borivojova Entry door | Bořivojova 50 – street entrance |
| `NUKI_REHOROVA_ID` | 18111759996 | Řehořova | Řehořova building main door |
| `NUKI_LUGGAGE_ID` / `NUKI_LUGGAGE_ROOM_ID` | 18154937741 | Luggage | Prokopova shared luggage room |
| `NUKI_LAUNDRY_ID` / `NUKI_LAUNDRY_ROOM_ID` | 18090678500 | Laundry | Prokopova shared laundry room |
| `NUKI_ROOM_001_ID` | 18110677996 | 001 | Prokopova room Ž001 |
| `NUKI_ROOM_004_ID` | 18111306100 | 004 | Prokopova room Ž004 |
| `NUKI_ROOM_101_ID` | 18090786036 | 101 | Prokopova room Ž101 |
| `NUKI_ROOM_102_ID` | 18100308204 | 102 | Prokopova room Ž102 |
| `NUKI_ROOM_103_ID` | 18092412388 | 103 | Prokopova room Ž103 |
| `NUKI_ROOM_104_ID` | 18090008940 | 104 | Prokopova room Ž104 |
| `NUKI_ROOM_201_ID` | 18092416876 | 201 | Prokopova room Ž201 |
| `NUKI_ROOM_202_ID` | 18090787692 | 202 | Prokopova room Ž202 |
| `NUKI_ROOM_203_ID` | 18090789092 | 203 | Prokopova room Ž203 |
| `NUKI_ROOM_204_ID` | 18090009852 | 204 | Prokopova room Ž204 |
| `NUKI_ROOM_301_ID` | 18100307828 | 301 | Prokopova room Ž301 |
| `NUKI_ROOM_302_ID` | 18111306748 | 302 | Prokopova room Ž302 |
| `NUKI_ROOM_303_ID` | 18111305716 | 303 | Prokopova room Ž303 |
| `NUKI_ROOM_304_ID` | 18111307236 | 304 | Prokopova room Ž304 |
| `NUKI_ROOM_401_ID` | 18093278068 | 401 | Prokopova room Ž401 |
| `NUKI_ROOM_402_ID` | 18111301988 | 402 | Prokopova room Ž402 |
| `NUKI_ROOM_403_ID` | 18110242428 | 403 | Prokopova room Ž403 |
| `NUKI_ROOM_404_ID` | 18112496837 | 404 | Prokopova room Ž404 |
| `NUKI_ROOM_501_ID` | 18110246268 | 501 | Prokopova room Ž501 |
| `NUKI_ROOM_502_ID` | 18100305524 | 502 | Prokopova room Ž502 |
| `NUKI_ROOM_503_ID` | 18111304940 | 503 | Prokopova room Ž503 |
| `NUKI_ROOM_504_ID` | 18093278820 | 504 | Prokopova room Ž504 |
| `NUKI_ROOM_601_ID` | 18110232556 | 601 | Prokopova room Ž601 |
| `NUKI_ROOM_602_ID` | 18111305316 | 602 | Prokopova room Ž602 |
| `NUKI_ROOM_604_ID` | 18111307628 | 604 | Prokopova room Ž604 |

## Verification Notes

- `NUKI_MAIN_ENTRANCE_ID` now points to the hotel’s “Main Door” lock (ID `18120565789`). This replaces the previous misconfiguration where it referenced the Bořivojova street entrance.
- Each room-specific environment variable aligns with the `HOSTAWAY_LISTING_TO_ROOM` mapping used for Prokopova listings, ensuring Hostaway → Nuki device resolution stays consistent.
- The shared facility locks (`Laundry`, `Luggage`) use dual env vars (`*_ID` and `*_ROOM_ID`) for backward compatibility; both reference the same underlying smartlock ID.
- Device info cross-checked against the latest Nuki API response (`GET /smartlock`). No orphan env vars and no unreferenced locks remain.
