export function getNavigationUrl(lat, lng) {
  const isIos = /iPhone|iPad/.test(navigator.userAgent);
  if (isIos) {
    return `maps://maps.apple.com/?daddr=${lat},${lng}&dirflg=w&t=m`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=walking`;
}

export function openNavigation(lat, lng) {
  window.open(getNavigationUrl(lat, lng), '_blank');
}
