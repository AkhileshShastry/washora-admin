const EARTH_RADIUS_KM = 6371;

function validCoordinate(value) {
  return Number.isFinite(Number(value));
}

export function hasCoordinates(location) {
  return (
    Boolean(location) &&
    validCoordinate(location.latitude) &&
    validCoordinate(location.longitude) &&
    Number(location.latitude) >= -90 &&
    Number(location.latitude) <= 90 &&
    Number(location.longitude) >= -180 &&
    Number(location.longitude) <= 180
  );
}

export function distanceBetweenLocations(from, to) {
  if (!hasCoordinates(from) || !hasCoordinates(to)) {
    return 0;
  }

  const latitudeDelta =
    ((Number(to.latitude) - Number(from.latitude)) * Math.PI) / 180;
  const longitudeDelta =
    ((Number(to.longitude) - Number(from.longitude)) * Math.PI) / 180;
  const fromLatitude = (Number(from.latitude) * Math.PI) / 180;
  const toLatitude = (Number(to.latitude) * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    EARTH_RADIUS_KM *
    2 *
    Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine))
  );
}

export function calculateRouteDistanceKm({ business, customer, dhobi }) {
  if (
    !hasCoordinates(business) ||
    !hasCoordinates(customer) ||
    !hasCoordinates(dhobi)
  ) {
    return 0;
  }

  const pickupDistance = distanceBetweenLocations(business, customer);
  const dhobiDistance = distanceBetweenLocations(customer, dhobi);
  const returnToBusinessDistance = distanceBetweenLocations(dhobi, business);
  const deliveryDistance = distanceBetweenLocations(business, dhobi);
  const customerDeliveryDistance = distanceBetweenLocations(dhobi, customer);

  return (
    pickupDistance +
    dhobiDistance +
    returnToBusinessDistance +
    deliveryDistance +
    customerDeliveryDistance
  );
}

export function calculateDeliveryCharge(distanceKm, ratePerKm) {
  return Math.round(Number(distanceKm || 0) * Number(ratePerKm || 0));
}

export function calculateFuelCostPerKm(petrolPricePerLitre, vehicleMileageKmPerLitre) {
  const petrolPrice = Number(petrolPricePerLitre || 0);
  const mileage = Number(vehicleMileageKmPerLitre || 0);

  return mileage > 0 ? petrolPrice / mileage : 0;
}
