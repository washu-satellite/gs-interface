import {
    Activity,
    Battery,
    Compass,
    Cpu,
    Gauge,
    Globe,
    LayoutGrid,
    Orbit,
    RadioTower,
    Rocket,
    Satellite,
    Signal,
    Thermometer,
    Zap,
    type LucideIcon,
} from "lucide-react";

export const VIEW_ICONS: Record<string, LucideIcon> = {
    grid: LayoutGrid,
    gauge: Gauge,
    activity: Activity,
    cpu: Cpu,
    battery: Battery,
    thermometer: Thermometer,
    signal: Signal,
    radio: RadioTower,
    satellite: Satellite,
    orbit: Orbit,
    zap: Zap,
    compass: Compass,
    rocket: Rocket,
    globe: Globe,
};

export const VIEW_ICON_KEYS = Object.keys(VIEW_ICONS);
export const DEFAULT_VIEW_ICON = "grid";

export function ViewIcon({ icon, className }: { icon?: string | null; className?: string }) {
    const Icon = (icon && VIEW_ICONS[icon]) || VIEW_ICONS[DEFAULT_VIEW_ICON];
    return <Icon className={className} />;
}
