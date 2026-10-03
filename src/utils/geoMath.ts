export function extractLatLon(locationString?: string): { lat: number; lon: number } | null {
  if (!locationString) return null;
  const latMatch = locationString.match(/Lat:\s*([-\d.]+)/);
  const lonMatch = locationString.match(/Lon:\s*([-\d.]+)/);
  if (latMatch && lonMatch) {
    return {
      lat: parseFloat(latMatch[1]),
      lon: parseFloat(lonMatch[1]),
    };
  }
  return null;
}

const R = 6371; // Raio volumétrico médio da Terra em KM

function toRad(value: number): number {
  return (value * Math.PI) / 180;
}

function toDeg(value: number): number {
  return (value * 180) / Math.PI;
}

// Retorna distância em KMS usando a fórmula de Haversine
export function getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Retorna azimute (ângulo) de onde o ponto 2 está em ralação ao ponto 1
// Retorna um valor de 0 a 360, onde 0/360 é o Norte verdadeiro.
export function getBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);

  const y = Math.sin(dLon) * Math.cos(rLat2);
  const x = Math.cos(rLat1) * Math.sin(rLat2) - Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon);

  let brng = Math.atan2(y, x);
  brng = toDeg(brng);
  return (brng + 360) % 360;
}
