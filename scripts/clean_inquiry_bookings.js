const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

function loadEnvValue(key) {
  if (process.env[key]) {
    return process.env[key].trim();
  }

  const envPath = path.join(process.cwd(), '.env.local');
  if (!fs.existsSync(envPath)) {
    return '';
  }

  const content = fs.readFileSync(envPath, 'utf8');
  const regex = new RegExp(`^${key}=(.*)$`, 'm');
  const match = content.match(regex);
  if (!match) {
    return '';
  }

  let value = match[1].trim();
  if (value.startsWith('"') && value.endsWith('"')) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\n$/, '').trim();
}

async function getHostAwayToken(accountId, apiKey) {
  const response = await fetch('https://api.hostaway.com/v1/accessTokens', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: accountId,
      client_secret: apiKey,
      scope: 'general'
    })
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`Failed to obtain HostAway token: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

async function getReservationStatus(reservationId, token) {
  const url = `https://api.hostaway.com/v1/reservations/${reservationId}?includeResources=0`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (response.status === 404) {
    return { found: false };
  }

  const data = await response.json();
  if (!response.ok || !data.result) {
    throw new Error(`Failed to fetch reservation ${reservationId}: ${JSON.stringify(data)}`);
  }

  return {
    found: true,
    status: data.result.status || ''
  };
}

function isInquiryStatus(status) {
  if (!status) {
    return false;
  }
  const lowered = status.toLowerCase();
  return lowered.startsWith('inquiry');
}

async function identifyInquiryBookings(bookings, token) {
  const toDelete = [];
  const retryQueue = [];
  const total = bookings.length;
  let processed = 0;
  let index = 0;
  const concurrency = 6;

  async function worker() {
    while (true) {
      const nextIndex = index;
      index += 1;
      const booking = bookings[nextIndex];
      if (!booking) {
        return;
      }

      processed += 1;

      if (!booking.hostAwayId) {
        continue;
      }

      const reservationId = parseInt(booking.hostAwayId, 10);
      if (Number.isNaN(reservationId)) {
        continue;
      }

      try {
        const info = await getReservationStatus(reservationId, token);
        if (!info.found) {
          console.log(`⚠️  Reservation ${reservationId} not found for booking ${booking.id}`);
          continue;
        }

        if (isInquiryStatus(info.status)) {
          toDelete.push({ booking, remoteStatus: info.status });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const rateLimited = message.includes('rate limit') || message.includes('too many requests');
        if (rateLimited) {
          retryQueue.push(booking);
        } else {
          console.error(`Failed to inspect reservation ${reservationId}:`, message);
        }
      }

      if (processed % 50 === 0) {
        console.log(`Processed ${processed}/${total}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return { toDelete, retryQueue };
}

async function processRetryQueue(retryQueue, token, toDelete) {
  if (retryQueue.length === 0) {
    return;
  }

  console.log(`Retrying ${retryQueue.length} bookings after rate limiting...`);
  for (const booking of retryQueue) {
    const reservationId = parseInt(booking.hostAwayId, 10);
    if (Number.isNaN(reservationId)) {
      continue;
    }

    // Wait a bit between retries to avoid triggering the limit again
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const info = await getReservationStatus(reservationId, token);
      if (!info.found) {
        console.log(`⚠️  Reservation ${reservationId} not found for booking ${booking.id}`);
        continue;
      }

      if (isInquiryStatus(info.status)) {
        toDelete.push({ booking, remoteStatus: info.status });
      }
    } catch (error) {
      console.error(`Failed again for reservation ${reservationId}:`, error instanceof Error ? error.message : String(error));
    }
  }
}

async function main() {
  const databaseUrl = loadEnvValue('DATABASE_URL');
  const hostawayAccount = loadEnvValue('HOSTAWAY_ACCOUNT_ID');
  const hostawayKey = loadEnvValue('HOSTAWAY_API_KEY');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required');
  }
  if (!hostawayAccount || !hostawayKey) {
    throw new Error('HostAway credentials missing');
  }

  process.env.DATABASE_URL = databaseUrl;

  const prisma = new PrismaClient();
  try {
    const token = await getHostAwayToken(hostawayAccount, hostawayKey);

    const startDate = new Date('2025-09-26T00:00:00Z');

    const bookings = await prisma.booking.findMany({
      select: {
        id: true,
        hostAwayId: true,
        guestLeaderName: true,
        propertyName: true,
        status: true
      },
      where: {
        checkInDate: {
          gte: startDate
        }
      },
      orderBy: {
        checkInDate: 'asc'
      }
    });

    console.log(`Inspecting ${bookings.length} bookings from ${startDate.toISOString()} onwards...`);
    const { toDelete, retryQueue } = await identifyInquiryBookings(bookings, token);
    await processRetryQueue(retryQueue, token, toDelete);

    console.log(`Found ${toDelete.length} bookings to delete`);
    for (const entry of toDelete) {
      const { booking, remoteStatus } = entry;
      console.log(`Deleting booking ${booking.id} (${booking.propertyName} - ${booking.guestLeaderName}) with remote status ${remoteStatus}`);
      await prisma.booking.delete({ where: { id: booking.id } });
    }

    console.log('Cleanup complete');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
