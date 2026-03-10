function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getCoords(booking) {
  const addr = booking.addressId;
  if (!addr?.location?.coordinates) return null;
  const [lng, lat] = addr.location.coordinates;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

function optimizeStops(bookings) {
  if (bookings.length <= 1) return bookings;

  const withCoords = bookings.map((b) => ({ booking: b, coords: getCoords(b) }));
  const noCoords = withCoords.filter((w) => !w.coords);
  const hasCoords = withCoords.filter((w) => w.coords);

  if (hasCoords.length <= 1) return bookings;

  const ordered = [hasCoords[0]];
  const remaining = hasCoords.slice(1);

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1].coords;
    let nearestIdx = 0;
    let nearestDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(last.lat, last.lng, remaining[i].coords.lat, remaining[i].coords.lng);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }

    ordered.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return [...ordered.map((w) => w.booking), ...noCoords.map((w) => w.booking)];
}

module.exports = { optimizeStops, haversine, getCoords };
