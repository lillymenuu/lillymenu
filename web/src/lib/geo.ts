export type PontoGeo = { lat: number; lng: number };

/** Ray casting: true se o ponto (lat,lng) esta dentro do poligono (minimo 3 vertices). */
export function pontoDentroPoligono(lat: number, lng: number, poligono: PontoGeo[]): boolean {
  if (poligono.length < 3) return false;
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const vi = poligono[i];
    const vj = poligono[j];
    const intersecta =
      vi.lat !== vj.lat &&
      lat >= Math.min(vi.lat, vj.lat) &&
      lat < Math.max(vi.lat, vj.lat) &&
      lng < ((vj.lng - vi.lng) * (lat - vi.lat)) / (vj.lat - vi.lat) + vi.lng;
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}
