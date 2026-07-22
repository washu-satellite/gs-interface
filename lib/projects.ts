export type AdcsConfig = {
    missionName: string;
    spacecraftId: string;
    stationCallsign: string;
    stationLat: string;
    stationLon: string;
    altitudeKm: string;
    regime: "polar" | "sso" | "custom";
    dataSource: "live" | "playback";
    noradId: string;
    tleName: string;
    tleLine1: string;
    tleLine2: string;
    chMode: string;
    chAngularRate: string;
    chCurrent: string;
    chQuaternion: string;
    showOrbit: boolean;
    showAtmosphere: boolean;
    showStation: boolean;
    autoRotate: boolean;
    live: boolean;
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
    noradId: "25544",
    tleName: "",
    tleLine1: "",
    tleLine2: "",
    chMode: "",
    chAngularRate: "",
    chCurrent: "",
    chQuaternion: "",
    showOrbit: true,
    showAtmosphere: true,
    showStation: true,
    autoRotate: false,
    live: false,
};

export type Project = {
    id: string;
    name: string;
    ord: number;
    config: AdcsConfig;
    configured: boolean;
};

export type Notification = {
    id: number;
    projectId: string;
    level: "info" | "warning" | "critical";
    title: string;
    message: string | null;
    createdAt: string;
};
