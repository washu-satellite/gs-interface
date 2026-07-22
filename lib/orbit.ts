import {
    twoline2satrec,
    propagate,
    gstime,
    eciToGeodetic,
    degreesLat,
    degreesLong,
    type SatRec,
} from "satellite.js";

export type GeoPoint = { lat: number; lon: number; altKm: number };
export type OrbitState = GeoPoint & { speedKmS: number };

export function parseTle(line1: string, line2: string): SatRec | null {
    const l1 = line1?.trim();
    const l2 = line2?.trim();
    if (!l1 || !l2 || !l1.startsWith("1 ") || !l2.startsWith("2 ")) return null;
    try {
        const rec = twoline2satrec(l1, l2);
        if (!rec || rec.error) return null;
        return rec;
    } catch {
        return null;
    }
}

export function propagateState(rec: SatRec, date: Date): OrbitState | null {
    const pv = propagate(rec, date);
    if (!pv || !pv.position || typeof pv.position === "boolean") return null;
    const gmst = gstime(date);
    const geo = eciToGeodetic(pv.position, gmst);
    const v = pv.velocity;
    const speed = v && typeof v !== "boolean" ? Math.hypot(v.x, v.y, v.z) : 0;
    const lat = degreesLat(geo.latitude);
    const lon = degreesLong(geo.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon, altKm: geo.height, speedKmS: speed };
}

export function periodMinutes(rec: SatRec): number {
    return rec.no > 0 ? (2 * Math.PI) / rec.no : 0;
}

export function groundTrack(rec: SatRec, from: Date, spanMin: number, samples: number): GeoPoint[] {
    const pts: GeoPoint[] = [];
    for (let i = 0; i <= samples; i++) {
        const t = new Date(from.getTime() + (spanMin * 60000 * i) / samples);
        const s = propagateState(rec, t);
        if (s) pts.push({ lat: s.lat, lon: s.lon, altKm: s.altKm });
    }
    return pts;
}
