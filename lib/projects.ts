export type AdcsConfig = {
    missionName: string;
    spacecraftId: string;
    stationCallsign: string;
    stationLat: string;
    stationLon: string;
    altitudeKm: string;
    regime: "polar" | "sso" | "custom";
    dataSource: "live" | "playback";
    showOrbit: boolean;
    showAtmosphere: boolean;
    showStation: boolean;
    autoRotate: boolean;
};

export const DEFAULT_ADCS_CONFIG: AdcsConfig = {
    missionName: "Mission",
    spacecraftId: "SC-1",
    stationCallsign: "WUSAT",
    stationLat: "38.627",
    stationLon: "-90.199",
    altitudeKm: "551",
    regime: "polar",
    dataSource: "live",
    showOrbit: true,
    showAtmosphere: true,
    showStation: true,
    autoRotate: true,
};

export type Project = {
    id: string;
    name: string;
    ord: number;
    config: AdcsConfig;
    configured: boolean;
};
