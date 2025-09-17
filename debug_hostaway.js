// Check if we can find the HostAway listing ID from a reservation
const hostawayReservationId = "27861383"; // Example from Ž101

async function fetchHostAwayReservation(reservationId) {
  try {
    const response = await fetch(`https://booking-management-dashboard-247uruy7m-future-developments.vercel.app/api/hostaway/reservation/${reservationId}`);
    const data = await response.json();
    console.log("HostAway API Response:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
  }
}

fetchHostAwayReservation(hostawayReservationId);