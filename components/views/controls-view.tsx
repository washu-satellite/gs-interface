"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AdcsConfig, DEFAULT_ADCS_CONFIG } from "@/lib/projects";
import { useProject } from "@/components/project-context";
import { CaseUpper, Check, Crosshair, Download, Expand, Lock, Pause, Play, RotateCcw, Settings, SkipBack, SkipForward, SlidersHorizontal, TriangleAlert, X } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, KeyboardControls, KeyboardControlsEntry, Line, Html, shaderMaterial } from '@react-three/drei';
import * as earcut from 'earcut';

import * as THREE from 'three';
import { StatField } from "../stat-field";
import { Slider } from "../ui/slider";
import { Textarea } from "../ui/textarea";
import { Spinner } from "../ui/spinner";
import { bStore } from "@/hooks/useAppStore";
import { parseTle, propagateState, periodMinutes, groundTrack, type OrbitState } from "@/lib/orbit";
import type { SatRec } from "satellite.js";
import type { ScalarChannelSample } from "@/types/scalar";


const velAz = 0.1;  // rad/s
const velEl = 0.08;  // rad/s

const targetAz = 0;
const targetEl = Math.PI;

const R_EARTH = 6.300;
const satHeight = 0.550;
const EARTH_RADIUS_KM = 6371;
const KM_TO_UNITS = R_EARTH / EARTH_RADIUS_KM;
const AXIS_X = new THREE.Vector3(1, 0, 0);

function circularBound(value: number, target: number, tolerance: number) {
    return (value - target + Math.PI) % (2*Math.PI) - Math.PI;
}

function OrbitalPath() {
    const tubeRef = useRef<any>(null);

    const curve = useMemo(() => {
        const curve = new THREE.EllipseCurve(
            0, 0, R_EARTH + satHeight, R_EARTH + satHeight, 0, 2*Math.PI, false, 0
        );

        const points = curve.getPoints(256);

        return points;

        // return new THREE.CatmullRomCurve3(
        //     points.map(p => new THREE.Vector3(p.x, 0, p.y)),
        //     true
        // );
    }, []);

    const { size } = useThree();

    // useFrame(() => {
    //     if (!tubeRef.current) { return; }

    //     const d = camera.position.length();

    //     const scale = d * 0.002;

    //     tubeRef.current.scale = scale;
    // });

    return (
        <Line
            points={curve}
            color="white"
            lineWidth={2}
        />
        // <mesh>
        //     <tubeGeometry ref={tubeRef} args={[curve, 512, 0.02, 8, true]}/>
        //     <meshBasicMaterial color="white"/>
        // </mesh>
    );
}

const DetailedCube = (
    <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.5, 0.5, 0.5]}/>
        <meshStandardMaterial color="white" transparent opacity={0.8}/>
        <Line
            points={[[0, 0, 0], [1.2, 0, 0]]}
            color={"white"}
        />
    </mesh>
);

function GroundLabel() {
    const THETA = 0;
    const PHI = Math.PI / 2;

    const posX = R_EARTH * Math.sin(PHI) * Math.cos(THETA);
    const posY = R_EARTH * Math.sin(PHI) * Math.sin(THETA);
    const posZ = R_EARTH * Math.cos(PHI);

    return (
        <mesh position={[posX, posY, posZ]}>
            <Html>
                <div className={cn(
                    "flex flex-row items-center group hover:underline underline-offset-4 cursor-pointer w-32",
                    "transition-opacity duration-300 -mt-3"
                )}>
                    <div className="transition-all duration-500 bg-white w-2 h-2 -ml-1 border-2 border-black rounded-xl group-hover:w-3 group-hover:h-3 group-hover:-ml-1.5"/>
                    <p className="font-mono ml-1 select-none text-shadow-sm">GS-2</p>
                </div>
            </Html>
        </mesh>
    );
}

function OrbitalLabel() {
    const labelRef = useRef<any>(null);

    const R_SAT = R_EARTH + satHeight;

    useFrame((state, delta) => {
        if (labelRef.current) {
            const cx = labelRef.current.position.x;
            const cy = labelRef.current.position.y;

            const cTheta = (Math.atan2(cy, cx) + 2 * Math.PI) % (2 * Math.PI);

            const newVal = (cTheta + 0.5 * delta) % (2 * Math.PI);

            // console.log(`cTheta: ${cTheta}`);
            // console.log(`nTheta: ${Math.sign(cTheta)}`);
            // console.log(`cTheta: ${cTheta}`);

            labelRef.current.position.y = R_SAT * Math.sin(newVal);
            labelRef.current.position.x = R_SAT * Math.cos(newVal);

            // console.log(`${labelRef.current.position.y}, ${labelRef.current.position.x}`);
        }
    });

    return (
        <mesh ref={labelRef} position={[R_SAT, 0, 0]}>
            <Html>
                <div className={cn(
                    "flex flex-row items-center group hover:underline underline-offset-4 cursor-pointer",
                    "transition-opacity duration-300 -mt-3"
                )}>
                    <div className="transition-all duration-500 bg-white w-2 h-2 -ml-1 border-2 border-black rounded-xl group-hover:w-3 group-hover:h-3 group-hover:-ml-1.5"/>
                    <p className="font-mono ml-1 select-none text-shadow-lg">SCALAR</p>
                </div>
            </Html>
        </mesh>
    );
}

function Cube(props: {
    hideCube?: boolean
}) {
    const cubeRef = useRef<any>(null);
    const labelRef = useRef<any>(null);
    const pathRef = useRef<any>(null);

    const [showTag, setShowTag] = useState(true);
    const [pathWidth, setPathWidth] = useState(0.02);

    // const [headingColor, setHeadingColor] = useState<string>("white");

    const { camera } = useThree();

    useFrame((state, delta) => {
        if (cubeRef.current) {
            if (labelRef.current) {
                const distance = camera.position.distanceTo(labelRef.current.getWorldPosition(new THREE.Vector3()));

                labelRef.current.scale.x = distance/100;
                labelRef.current.scale.y = distance/100;
                labelRef.current.scale.z = distance/100;
                labelRef.current.lookAt(camera.position);
            }

            // if (distance < 1) {
            //     setShowTag(false);
            // } else {
            //     setShowTag(true);
            // }
        }
    });

    const Tag = (
        <mesh position={[R_EARTH + satHeight, 0, 0]}>
            {/* <Points positions={new Float32Array([[0, 0, 0]])} colors={new Float32Array([[255, 255, 0]])} sizes={new Float32Array([[1]])}>
                <meshStandardMaterial color="hotpink"/>
            </Points> */}
            {/* <Circle ref={labelRef} args={[1, 64]}/>
            <meshStandardMaterial color={"green"}/> */}
            {/* <Html occlude="blending">
                <div className={cn(
                    "flex flex-row items-center group hover:underline underline-offset-4 cursor-pointer",
                    "transition-opacity duration-300 -mt-3",
                    {
                        "opacity-100": showTag,
                        "opacity-0": !showTag
                    }
                )}>
                    <div className="transition-all duration-500 bg-white w-2 h-2 -ml-1 border-2 border-black rounded-xl group-hover:w-3 group-hover:h-3 group-hover:-ml-1.5"/>
                    <p className="font-mono ml-1">asd</p>
                </div>
            </Html> */}
        </mesh>
    );

    const curve = useMemo(() => {
        const curve = new THREE.EllipseCurve(
            0, 0, R_EARTH + satHeight, R_EARTH + satHeight, 0, 2*Math.PI, false, 0
        );

        const points = curve.getPoints(256);

        return points;

        // return new THREE.CatmullRomCurve3(
        //     points.map(p => new THREE.Vector3(p.x, 0, p.y)),
        //     true
        // );
    }, []);

    return (
        <mesh position={[0, 0, 0]} ref={cubeRef}>
            {!props.hideCube &&
                <>
                    <boxGeometry args={[0.5, 0.5, 0.5]}/>
                    <meshStandardMaterial color="white" transparent opacity={0.8}/>
                </>
            }
            <Line
                points={[[0, 0, 0], [1.2, 0, 0]]}
                color={"white"}
            />
        </mesh>
        // <mesh position={[0, 0, 0]} ref={cubeRef}>
        //     {/* <Detailed distances={[0, 1]}>
        //         {DetailedCube}
        //         {Tag}
        //     </Detailed> */}
        //     {DetailedCube}
        // </mesh>
        // <>
        //     <Line
        //         points={curve}
        //         color="white"
        //         lineWidth={2}
        //         // alphaToCoverage
        //         // depthTest={false}
        //         // depthWrite={false}
        //         // transparent
        //         // renderOrder={999}
        //     />
        //     {/* <mesh ref={pathRef}>
        //         <tubeGeometry args={[curve, 512, 10, 8, true]}/>
        //         <meshBasicMaterial color="white"/>
        //     </mesh> */}
        //     {Tag}
        //     <mesh position={[R_EARTH + satHeight, 0, 0]} ref={cubeRef}>
                
        //         {/* <Detailed distances={[0, 1]}>
        //             {DetailedCube}
        //             {Tag}
        //         </Detailed> */}
        //     </mesh>
        // </>
    );
}

function polarToCartesian(lon: number, lat: number, r: number) {
    const lambda = lon * Math.PI / 180;
    const phi = lat * Math.PI / 180;
    return new THREE.Vector3(
        r * Math.cos(phi) * Math.cos(lambda),
        r * Math.sin(phi),
        -r * Math.cos(phi) * Math.sin(lambda)
    );
}

function toGeometry(geoData: any, r: number) {
    const points: number[] = [];
    const indices: number[] = [];

    let indexOffset = 0;

    geoData.geometries.slice(0, 100).forEach((geo: any) => {
        if (geo.type === "Polygon") {
            const flattened: number[] = [];
            const holeIndices: number[] = [];
            let holeIndex = 0;

            geo.coordinates.forEach((ring: any[], i: number) => {
                if (i > 0) {
                    holeIndex += geo.coordinates[i - 1].length;
                    holeIndices.push(holeIndex);
                }

                ring.forEach(([lon, lat]: [number, number]) => {
                    const v = polarToCartesian(lon, lat, r);
                    flattened.push(v.x, v.y, v.z);
                    // points.push(v.x, v.y, v.z);
                });
            });

            const triangles = earcut.default(flattened, holeIndices, 3);

            console.log("got triangles");

            for (let i = 0; i < triangles.length; i++) {
                indices.push(triangles[i] + indexOffset);
            }

            for (let i = 0; i < flattened.length; i++) {
                points.push(flattened[i]);
            }

            indexOffset += flattened.length / 3; // geo.coordinates.length;
        }
    });

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
        color: "lightblue",
        flatShading: true,
        side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);

    let edgeGeo = new THREE.EdgesGeometry(mesh.geometry);
    let mat = new THREE.LineBasicMaterial({
        color: "#000000",
    });
    let wireframe = new THREE.LineSegments(edgeGeo, mat);
    mesh.add(wireframe);

    return mesh;
}

// --- Stylized Earth ------------------------------------------------------
// Continents are painted from the real coastline GeoJSON (/map_data.json)
// onto an equirectangular canvas, then mapped to a smooth sphere. Painting in
// 2D is geographically exact — it avoids the triangulation "spikes" that a
// spherical earcut produces on concave coasts and across the antimeridian —
// while the flat two-tone palette keeps an open-world-game look.

// Fetch the continent data once and reuse across scenes.
let mapDataCache: Promise<any> | null = null;
function loadMapData(): Promise<any> {
    if (!mapDataCache) {
        mapDataCache = fetch("/map_data.json").then((r) => r.json());
    }
    return mapDataCache;
}

const OCEAN_COLOR = "#17568f";
const LAND_COLOR = "#4b9e5b";

// Paint land/ocean into an equirectangular texture. Built once and cached.
let earthTextureCache: THREE.CanvasTexture | null = null;

function buildEarthTexture(geoData: any): THREE.CanvasTexture {
    const W = 4096;
    const H = 2048;
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = OCEAN_COLOR;
    ctx.fillRect(0, 0, W, H);

    const px = (lon: number) => ((lon + 180) / 360) * W;
    const py = (lat: number) => ((90 - lat) / 180) * H;

    ctx.fillStyle = LAND_COLOR;
    for (const geo of geoData.geometries) {
        if (geo.type !== "Polygon") continue;
        // Draw each polygon shifted by ±W too, so a shape that wraps across the
        // ±180° seam shows up on both edges of the map instead of streaking.
        for (const shift of [-W, 0, W]) {
            ctx.beginPath();
            for (const ring of geo.coordinates as [number, number][][]) {
                // Unwrap longitudes so a ring that crosses the antimeridian
                // stays continuous rather than jumping the full width.
                const pts: [number, number][] = [[ring[0][0], ring[0][1]]];
                let prev = ring[0][0];
                for (let i = 1; i < ring.length; i++) {
                    let lon = ring[i][0];
                    while (lon - prev > 180) lon -= 360;
                    while (lon - prev < -180) lon += 360;
                    pts.push([lon, ring[i][1]]);
                    prev = lon;
                }

                ctx.moveTo(px(pts[0][0]) + shift, py(pts[0][1]));
                for (let i = 1; i < pts.length; i++) {
                    ctx.lineTo(px(pts[i][0]) + shift, py(pts[i][1]));
                }

                // A ring whose unwrapped longitude nets a full turn encircles a
                // pole (e.g. Antarctica). Close it through the map edge at the
                // pole so the whole cap fills instead of just a ring band.
                if (Math.abs(pts[pts.length - 1][0] - pts[0][0]) > 350) {
                    const edgeLat = pts[0][1] < 0 ? -90 : 90;
                    ctx.lineTo(px(pts[pts.length - 1][0]) + shift, py(edgeLat));
                    ctx.lineTo(px(pts[0][0]) + shift, py(edgeLat));
                }
                ctx.closePath();
            }
            ctx.fill("evenodd"); // inner rings (lakes) punch holes
        }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
}

function useEarthTexture(): THREE.CanvasTexture | null {
    const [tex, setTex] = useState<THREE.CanvasTexture | null>(() => earthTextureCache);

    useEffect(() => {
        if (earthTextureCache) {
            setTex(earthTextureCache);
            return;
        }
        let alive = true;
        loadMapData().then((data) => {
            earthTextureCache = buildEarthTexture(data);
            if (alive) setTex(earthTextureCache);
        });
        return () => {
            alive = false;
        };
    }, []);

    return tex;
}

// Convert geographic lon/lat to a point on the globe, matching the textured
// sphere exactly: THREE.SphereGeometry's UV convention plus the globe mesh's
// -90° Y rotation. Returns a surface point at the given radius.
function latLonToSpherePos(lon: number, lat: number, radius: number) {
    const theta = ((lon + 180) * Math.PI) / 180; // u * 2π (texture: u=(lon+180)/360)
    const phi = ((90 - lat) * Math.PI) / 180; // v * π  (texture: v=(90-lat)/180)
    const x = -radius * Math.cos(theta) * Math.sin(phi);
    const y = radius * Math.cos(phi);
    const z = radius * Math.sin(theta) * Math.sin(phi);
    // Apply the same -π/2 Y rotation the globe mesh carries.
    const a = -Math.PI / 2;
    return new THREE.Vector3(
        x * Math.cos(a) + z * Math.sin(a),
        y,
        -x * Math.sin(a) + z * Math.cos(a)
    );
}

// A ground-station location pin planted on the globe surface at lon/lat, with
// a billboarded label that hides when the site rotates behind the Earth.
function GroundStationPin(props: {
    lon: number;
    lat: number;
    label: string;
    occludeRef?: React.RefObject<THREE.Mesh | null>;
}) {
    const base = useMemo(() => latLonToSpherePos(props.lon, props.lat, R_EARTH), [props.lon, props.lat]);
    const quat = useMemo(
        () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), base.clone().normalize()),
        [base]
    );
    const pinHeight = 0.55;

    return (
        <group position={base.toArray()} quaternion={quat}>
            {/* stem */}
            <mesh position={[0, pinHeight / 2, 0]}>
                <cylinderGeometry args={[0.014, 0.014, pinHeight, 8]} />
                <meshStandardMaterial color="#e5484d" emissive="#e5484d" emissiveIntensity={0.4} />
            </mesh>
            {/* head */}
            <mesh position={[0, pinHeight, 0]}>
                <sphereGeometry args={[0.09, 16, 16]} />
                <meshStandardMaterial color="#e5484d" emissive="#e5484d" emissiveIntensity={0.6} />
            </mesh>
            {/* footprint ring on the surface */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
                <ringGeometry args={[0.05, 0.1, 28]} />
                <meshBasicMaterial color="#e5484d" transparent opacity={0.7} side={THREE.DoubleSide} />
            </mesh>
            <Html
                position={[0, pinHeight + 0.12, 0]}
                center
                distanceFactor={11}
                occlude={props.occludeRef ? ([props.occludeRef] as any) : undefined}
            >
                <div className="flex flex-row items-center gap-1 select-none whitespace-nowrap pointer-events-none">
                    <div className="w-2 h-2 rounded-full bg-[#e5484d] border-2 border-black" />
                    <p className="font-mono text-xs text-white text-shadow-lg">{props.label}</p>
                </div>
            </Html>
        </group>
    );
}

// Ground stations to plot on the main globe.
const GROUND_STATIONS = [
    { label: "GS-2", lon: -90.1994, lat: 38.627 }, // St. Louis, MO
];

function Earth(props: { radius?: number; rotate?: boolean; stations?: boolean; atmosphere?: boolean; children?: React.ReactNode }) {
    const radius = props.radius ?? R_EARTH;
    const spin = props.rotate ?? true;
    const groupRef = useRef<THREE.Group>(null);
    const globeRef = useRef<THREE.Mesh>(null);
    const map = useEarthTexture();

    useFrame((_, delta) => {
        if (spin && groupRef.current) {
            groupRef.current.rotation.y += 0.03 * delta;
        }
    });

    return (
        <group ref={groupRef}>
            {/* Globe — painted continents on a smooth sphere. The Y rotation
                lines the texture's prime meridian up to face +X. The material
                is keyed on the map so it recompiles once the texture arrives
                (adding a map to an already-compiled material is ignored). */}
            <mesh ref={globeRef} rotation={[0, -Math.PI / 2, 0]}>
                <sphereGeometry args={[radius, 96, 96]} />
                <meshStandardMaterial
                    key={map ? "textured" : "plain"}
                    map={map ?? undefined}
                    color={map ? "#ffffff" : OCEAN_COLOR}
                    emissive="#0a2742"
                    emissiveIntensity={0.2}
                    roughness={0.85}
                    metalness={0.1}
                />
            </mesh>

            {props.stations &&
                GROUND_STATIONS.map((s) => (
                    <GroundStationPin key={s.label} {...s} occludeRef={globeRef} />
                ))}

            {props.children}

            {(props.atmosphere ?? true) && (
                <mesh scale={1.02}>
                    <sphereGeometry args={[radius, 48, 48]} />
                    <meshBasicMaterial
                        color="#8ec5ff"
                        transparent
                        opacity={0.12}
                        side={THREE.BackSide}
                        depthWrite={false}
                    />
                </mesh>
            )}
        </group>
    );
}
// -------------------------------------------------------------------------

// A classic 3U CubeSat: an anodized-aluminum chassis with body-mounted solar
// cells, the signature protruding corner rails, a payload lens, and a pair of
// deployed whip antennas. Long axis is +X so it can fly along-track. Built
// entirely from primitives — no external model needed.
function CubeSat(props: { scale?: number }) {
    const L = 0.8;   // length along +X (3U)
    const W = 0.28;  // cross-section (Y, Z)
    const cellColor = "#1c2a66";
    const railColor = "#c7c7cd";

    // 4 side faces (±Y, ±Z), each carrying a strip of 3 solar cells along X.
    const faces = [
        { axis: "y", sign: 1 },
        { axis: "y", sign: -1 },
        { axis: "z", sign: 1 },
        { axis: "z", sign: -1 },
    ] as const;
    const cellSpan = (L * 0.9) / 3;

    return (
        <group scale={props.scale ?? 1}>
            {/* Anodized aluminum chassis */}
            <mesh castShadow>
                <boxGeometry args={[L, W, W]} />
                <meshStandardMaterial color="#9a9aa2" metalness={0.85} roughness={0.38} />
            </mesh>

            {/* Body-mounted solar cells */}
            {faces.map((f) =>
                [-1, 0, 1].map((c) => {
                    const off = W / 2 + 0.008;
                    const pos: [number, number, number] =
                        f.axis === "y" ? [c * cellSpan, f.sign * off, 0] : [c * cellSpan, 0, f.sign * off];
                    const args: [number, number, number] =
                        f.axis === "y" ? [cellSpan * 0.86, 0.02, W * 0.82] : [cellSpan * 0.86, W * 0.82, 0.02];
                    return (
                        <mesh key={`${f.axis}${f.sign}${c}`} position={pos}>
                            <boxGeometry args={args} />
                            <meshStandardMaterial
                                color={cellColor}
                                metalness={0.45}
                                roughness={0.3}
                                emissive="#0a1230"
                                emissiveIntensity={0.35}
                            />
                        </mesh>
                    );
                })
            )}

            {/* Signature corner rails running the full length */}
            {[
                [1, 1],
                [1, -1],
                [-1, 1],
                [-1, -1],
            ].map(([sy, sz], i) => (
                <mesh key={i} position={[0, (sy * W) / 2, (sz * W) / 2]}>
                    <boxGeometry args={[L * 1.06, 0.04, 0.04]} />
                    <meshStandardMaterial color={railColor} metalness={0.9} roughness={0.25} />
                </mesh>
            ))}

            {/* Payload lens on the +X end */}
            <mesh position={[L / 2 + 0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.07, 0.07, 0.05, 20]} />
                <meshStandardMaterial color="#0b0f1a" metalness={0.3} roughness={0.1} emissive="#12203f" emissiveIntensity={0.5} />
            </mesh>

            {/* Deployed whip antennas off the -X end */}
            {[1, -1].map((s) => (
                <mesh key={s} position={[-L / 2 - 0.18, 0, s * 0.05]} rotation={[0, 0, Math.PI / 2 + s * 0.25]}>
                    <cylinderGeometry args={[0.005, 0.005, 0.4, 6]} />
                    <meshStandardMaterial color="#dcdce0" metalness={0.5} roughness={0.4} />
                </mesh>
            ))}
        </group>
    );
}

function parseQuat(text?: string | null): THREE.Quaternion | null {
    if (!text) return null;
    const p = text.split(/[,\s]+/).map(Number).filter((n) => Number.isFinite(n));
    if (p.length !== 4) return null;
    const [a, b, c, d] = p;
    return new THREE.Quaternion(b, c, d, a).normalize();
}

function geoToUnits(lat: number, lon: number, altKm: number) {
    return latLonToSpherePos(lon, lat, R_EARTH + altKm * KM_TO_UNITS);
}

function Sgp4Satellite(props: { satrec: SatRec; simTimeRef: { current: number }; quatText?: string | null }) {
    const satRef = useRef<THREE.Group>(null);

    useFrame(() => {
        const g = satRef.current;
        if (!g) return;
        const now = new Date(props.simTimeRef.current);
        const s = propagateState(props.satrec, now);
        if (!s) return;
        const pos = geoToUnits(s.lat, s.lon, s.altKm);
        g.position.copy(pos);
        const q = parseQuat(props.quatText);
        if (q) {
            g.quaternion.copy(q);
        } else {
            const ahead = propagateState(props.satrec, new Date(now.getTime() + 4000));
            if (ahead) {
                const dir = geoToUnits(ahead.lat, ahead.lon, ahead.altKm).sub(pos);
                if (dir.lengthSq() > 1e-9) g.quaternion.setFromUnitVectors(AXIS_X, dir.normalize());
            }
        }
    });

    return (
        <group ref={satRef}>
            <CubeSat scale={1.1} />
        </group>
    );
}

function OrbitTrack(props: { points: THREE.Vector3[] }) {
    if (props.points.length < 2) return null;
    return <Line points={props.points} color="#8ec5ff" lineWidth={1.5} transparent opacity={0.5} />;
}

function OrbitalScene() {
    return (
        <div className="w-40 h-40">
            <Canvas shadows camera={{ position: [2 * R_EARTH, 0, 0], near: 0.1, far: R_EARTH * 2 }}>
                <ambientLight intensity={1}/>
                <directionalLight position={[10, 10, 10]} castShadow />
                <OrbitalPath />
                <Earth radius={R_EARTH} rotate={false} />
                <OrbitalLabel />
                <GroundLabel />
                <OrbitControls enableZoom={false}/>
            </Canvas>
        </div>
    );
}

// function Planet() {
//     const [mesh, setMesh] = useState<THREE.Mesh | null>(null);

//     useEffect(() => {
//         async function loadMesh() {
//             const res = await fetch("/map_data.json");
//             const data = await res.json();

//             console.log(data);

//             setMesh(toGeometry(data, R_EARTH));
//         }

//         loadMesh();
//     }, []);

//     // return mesh ? (
//     //     <primitive object={mesh}/>
//     // ) : (
//     //     <></>
//     // );
    
    
// }

enum Controls {
    forward = 'forward',
    backward = 'backward',
    left = 'left',
    right = 'right'
}

function ThreeScene(props: {
    satrec: SatRec | null;
    simTimeRef: { current: number };
    trackPoints: THREE.Vector3[];
    quatText?: string | null;
    showOrbit: boolean;
    showStation: boolean;
    showAtmosphere: boolean;
    autoRotate: boolean;
}) {
    const controlsRef = useRef<any>(null);
    const { scene } = useThree();

    useEffect(() => {
        const loader = new THREE.CubeTextureLoader();
        const texture = loader.load([
            "/xpos.png",
            "/xneg.png",
            "/ypos.png",
            "/yneg.png",
            "/zpos.png",
            "/zneg.png"
        ]);
        scene.background = texture;
    }, []);

    return (
        <>
            <ambientLight intensity={0.5}/>
            <directionalLight position={[10, 10, 10]} intensity={1.4} castShadow />
            <Earth stations={props.showStation} rotate={props.autoRotate} atmosphere={props.showAtmosphere}>
                {props.showOrbit && <OrbitTrack points={props.trackPoints} />}
                {props.satrec && (
                    <Sgp4Satellite satrec={props.satrec} simTimeRef={props.simTimeRef} quatText={props.quatText} />
                )}
            </Earth>
            <OrbitControls
                ref={controlsRef}
                maxDistance={3 * R_EARTH}
                minDistance={1.1 * R_EARTH}
                panSpeed={0.6}
                zoomSpeed={0.1}
                zoom0={R_EARTH}
            />
        </>
    );
}

function PointingScene() {
    return (
        <div className="w-40 h-40">
            <Canvas shadows camera={{ position: [2, 1, 2], near: 0.1, far: 10 }}>
                <Line
                    points={[
                        [0, 0, 0],
                        [0, 1.5, 0]
                    ]}
                    color={"red"}
                />
                <Line
                    points={[
                        [0, 0, 0],
                        [1.5, 0, 0]
                    ]}
                    color={"green"}
                />
                <Line
                    points={[
                        [0, 0, 0],
                        [0, 0, 1.5]
                    ]}
                    color={"blue"}
                />
                <ambientLight intensity={0.4}/>
                <directionalLight position={[10, 10, 10]} castShadow />
                <Cube hideCube />
            </Canvas>
        </div>
    )
}

type ModelButtonProps = React.PropsWithChildren<{
    tooltipText: string,
    onClick?: () => void
}>;

function ModelButton(props: ModelButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" className="rounded-full" onClick={props.onClick}>
                    {props.children}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                {props.tooltipText}
            </TooltipContent>
        </Tooltip>
    )
}

function ModelButtonRow(props: { buttons: ModelButtonProps[] }) {
    const [showPointing, setShowPointing] = useState(false);

    return (
        <div className={cn(
            "flex flex-row rounded-full bg-black/50 backdrop-blur-xl border cursor-pointer hover:border-foreground/20 transition-all duration-300 overflow-hidden",
            {
                "w-10.5": !showPointing,
                "w-full": showPointing
            }
        )}>
            <ModelButton
                tooltipText={showPointing ? "Close view settings" : "Show view settings"}
                onClick={() => setShowPointing(p => !p)}
            >
                <Settings className="w-4 h-4"/>
            </ModelButton>
            <div className={cn(
                "flex flex-row items-center overflow-hidden transition-all duration-300",
            )}>
                {props.buttons.map((b, i) => (
                    <ModelButton
                        key={i}
                        {...b}
                    >
                        {b.children}
                    </ModelButton>
                ))}
            </div>
        </div>
    );
}

const modelButtons: ModelButtonProps[] = [
    {
        tooltipText: "Expand to main view",
        children: <Expand className="w-4 h-4"/>
    },
    {
        tooltipText: "Reset view",
        children: <RotateCcw className="w-4 h-4"/>
    },
    {
        tooltipText: "Follow mission position",
        children: <Crosshair className="w-4 h-4"/>
    },
    {
        tooltipText: "Toggle label backgrounds",
        children: <CaseUpper className="w-4 h-4"/>
    }
]

const SIM_WINDOW_MIN = 24 * 60;

function formatUtc(d: Date) {
    return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function formatOffset(min: number) {
    const total = Math.round(min * 60);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    return `T+${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PlaybackControls(props: {
    offsetMin: number;
    playing: boolean;
    simDate: Date;
    disabled?: boolean;
    onScrub: (min: number) => void;
    onToggle: () => void;
    onSkipStart: () => void;
    onSkipEnd: () => void;
}) {
    return (
        <div className="flex flex-col items-center gap-3 bg-black/50 backdrop-blur-xl border rounded-xl px-5 py-3">
            <div className="flex flex-row items-baseline gap-3 font-mono text-sm">
                <span className="text-foreground">{formatUtc(props.simDate)}</span>
                <span className="text-xs text-muted-foreground">{formatOffset(props.offsetMin)}</span>
            </div>
            <Slider
                className="w-[24rem]"
                min={0}
                max={SIM_WINDOW_MIN}
                step={1}
                value={[props.offsetMin]}
                onValueChange={([v]) => props.onScrub(v)}
                disabled={props.disabled}
            />
            <div className="flex flex-row items-center gap-2">
                <Button variant="outline" className="backdrop-blur-md" onClick={props.onSkipStart} disabled={props.disabled}>
                    <SkipBack />
                </Button>
                <Button variant="outline" className="backdrop-blur-md" onClick={props.onToggle} disabled={props.disabled}>
                    {props.playing ? <Pause /> : <Play />}
                </Button>
                <Button variant="outline" className="backdrop-blur-md" onClick={props.onSkipEnd} disabled={props.disabled}>
                    <SkipForward />
                </Button>
            </div>
        </div>
    )
}

function ConfigSection(props: { title: string; children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{props.title}</h4>
            {props.children}
        </div>
    );
}

function SegmentedChoice<T extends string>(props: {
    options: readonly { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex flex-row gap-1">
            {props.options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => props.onChange(o.value)}
                    className={cn(
                        "flex-1 rounded-md border px-2 py-1.5 text-xs transition-colors cursor-pointer",
                        props.value === o.value
                            ? "border-blue-500/50 bg-blue-500/15 text-blue-400 font-medium"
                            : "border-border text-muted-foreground hover:bg-secondary/60"
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

function AdcsConfigModal(props: { initialConfig: AdcsConfig; onCancel: () => void; onApply: (cfg: AdcsConfig) => void }) {
    const [cfg, setCfg] = useState<AdcsConfig>({ ...DEFAULT_ADCS_CONFIG, ...props.initialConfig });
    const set = <K extends keyof AdcsConfig>(k: K, v: AdcsConfig[K]) =>
        setCfg((c) => ({ ...c, [k]: v }));

    const [fetching, setFetching] = useState(false);
    const [fetchErr, setFetchErr] = useState<string | null>(null);

    const fetchTle = async () => {
        const id = (cfg.noradId || "").replace(/\D/g, "");
        if (!id) { setFetchErr("Enter a NORAD ID first"); return; }
        setFetching(true);
        setFetchErr(null);
        try {
            const res = await fetch(`/api/tle/${id}`);
            const data = await res.json();
            if (!res.ok) { setFetchErr(data?.error || "Fetch failed"); setFetching(false); return; }
            setCfg((c) => ({ ...c, tleName: data.name, tleLine1: data.line1, tleLine2: data.line2 }));
        } catch {
            setFetchErr("Network error reaching Celestrak");
        }
        setFetching(false);
    };

    const channelFields: [keyof AdcsConfig, string, string][] = [
        ["chMode", "Mode", "adcs.mode"],
        ["chAngularRate", "Angular rate", "adcs.angularRate"],
        ["chCurrent", "Bus current", "eps.current"],
        ["chQuaternion", "Attitude quaternion (w,x,y,z)", "adcs.quaternion"],
    ];

    const toggles: [keyof AdcsConfig, string][] = [
        ["showOrbit", "Orbit track"],
        ["showAtmosphere", "Atmosphere"],
        ["showStation", "Ground station"],
        ["autoRotate", "Auto-rotate globe"],
    ];

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60" onClick={props.onCancel} />
            <div className="relative z-10 w-full max-w-lg max-h-[86%] flex flex-col rounded-lg border bg-background shadow-2xl">
                <div className="flex flex-row items-center justify-between border-b px-5 py-3">
                    <div className="flex flex-row items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4" />
                        <h3 className="font-semibold">ADCS Configuration</h3>
                    </div>
                    <Button variant="ghost" size="sm" onClick={props.onCancel}>
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
                    <ConfigSection title="Mission">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="cfg-mission">Mission name</Label>
                                <Input id="cfg-mission" value={cfg.missionName} onChange={(e) => set("missionName", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="cfg-scid">Spacecraft ID</Label>
                                <Input id="cfg-scid" value={cfg.spacecraftId} onChange={(e) => set("spacecraftId", e.target.value)} />
                            </div>
                        </div>
                    </ConfigSection>

                    <ConfigSection title="Ground Station">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cfg-call">Callsign</Label>
                            <Input id="cfg-call" value={cfg.stationCallsign} onChange={(e) => set("stationCallsign", e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="cfg-lat">Latitude</Label>
                                <Input id="cfg-lat" type="number" value={cfg.stationLat} onChange={(e) => set("stationLat", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="cfg-lon">Longitude</Label>
                                <Input id="cfg-lon" type="number" value={cfg.stationLon} onChange={(e) => set("stationLon", e.target.value)} />
                            </div>
                        </div>
                    </ConfigSection>

                    <ConfigSection title="Orbit">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="flex flex-col gap-1.5">
                                <Label htmlFor="cfg-alt">Altitude (km)</Label>
                                <Input id="cfg-alt" type="number" value={cfg.altitudeKm} onChange={(e) => set("altitudeKm", e.target.value)} />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <Label>Regime</Label>
                                <SegmentedChoice
                                    value={cfg.regime}
                                    onChange={(v) => set("regime", v)}
                                    options={[
                                        { value: "polar", label: "Polar" },
                                        { value: "sso", label: "SSO" },
                                        { value: "custom", label: "Custom" },
                                    ]}
                                />
                            </div>
                        </div>
                    </ConfigSection>

                    <ConfigSection title="Tracking (SGP4)">
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cfg-norad">NORAD Catalog ID</Label>
                            <div className="flex flex-row gap-2">
                                <Input
                                    id="cfg-norad"
                                    inputMode="numeric"
                                    placeholder="e.g. 25544"
                                    value={cfg.noradId}
                                    onChange={(e) => set("noradId", e.target.value.replace(/\D/g, ""))}
                                />
                                <Button type="button" variant="secondary" onClick={fetchTle} disabled={fetching}>
                                    {fetching ? <Spinner className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                                    Fetch TLE
                                </Button>
                            </div>
                            {fetchErr && <p className="text-xs text-red-500">{fetchErr}</p>}
                            {cfg.tleName && !fetchErr && (
                                <p className="text-xs text-muted-foreground">Loaded: <span className="font-mono">{cfg.tleName}</span></p>
                            )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <Label htmlFor="cfg-tle">Two-line element set</Label>
                            <Textarea
                                id="cfg-tle"
                                rows={2}
                                spellCheck={false}
                                className="font-mono text-xs"
                                placeholder={"1 25544U ...\n2 25544 ..."}
                                value={[cfg.tleLine1, cfg.tleLine2].filter(Boolean).join("\n")}
                                onChange={(e) => {
                                    const [l1 = "", l2 = ""] = e.target.value.split(/\r?\n/);
                                    setCfg((c) => ({ ...c, tleLine1: l1, tleLine2: l2 }));
                                }}
                            />
                            <p className="text-xs text-muted-foreground">Fetched by NORAD ID, or paste a TLE manually. Manual entry takes priority.</p>
                        </div>
                    </ConfigSection>

                    <ConfigSection title="Display">
                        {toggles.map(([k, label]) => (
                            <label key={k} className="flex flex-row items-center gap-2 cursor-pointer">
                                <Checkbox checked={cfg[k] as boolean} onCheckedChange={(v) => set(k, !!v as never)} />
                                <span className="text-sm">{label}</span>
                            </label>
                        ))}
                    </ConfigSection>

                    <ConfigSection title="Flight Status">
                        <SegmentedChoice
                            value={cfg.live ? "live" : "standby"}
                            onChange={(v) => set("live", v === "live")}
                            options={[
                                { value: "live", label: "Live" },
                                { value: "standby", label: "Standby" },
                            ]}
                        />
                    </ConfigSection>

                    <ConfigSection title="Data Source">
                        <SegmentedChoice
                            value={cfg.dataSource}
                            onChange={(v) => set("dataSource", v)}
                            options={[
                                { value: "live", label: "Live" },
                                { value: "playback", label: "Playback" },
                            ]}
                        />
                    </ConfigSection>

                    <ConfigSection title="Flight Data Channels">
                        <p className="text-xs text-muted-foreground -mt-1">Map each readout to a SCALAR channel name. Empty shows “--”.</p>
                        {channelFields.map(([k, label, placeholder]) => (
                            <div key={k} className="grid grid-cols-[9rem_1fr] items-center gap-3">
                                <Label htmlFor={`cfg-${k}`} className="text-xs">{label}</Label>
                                <Input
                                    id={`cfg-${k}`}
                                    className="font-mono text-xs"
                                    placeholder={placeholder}
                                    value={cfg[k] as string}
                                    onChange={(e) => set(k, e.target.value as never)}
                                />
                            </div>
                        ))}
                    </ConfigSection>
                </div>

                <div className="flex flex-row items-center justify-end gap-2 border-t px-5 py-3">
                    <Button variant="ghost" onClick={props.onCancel}>Cancel</Button>
                    <Button onClick={() => props.onApply(cfg)}>
                        <Check className="w-4 h-4" /> Apply Configuration
                    </Button>
                </div>
            </div>
        </div>
    );
}

function AdcsConfigOverlay(props: { projectName: string; initialConfig: AdcsConfig; onComplete: (cfg: AdcsConfig) => void }) {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4 text-center px-6">
                <div className="flex flex-row items-center gap-2 text-white">
                    <Lock className="w-5 h-5" />
                    <h2 className="text-2xl font-semibold tracking-wide">Configuration Pending</h2>
                </div>
                <p className="max-w-sm text-sm text-white/70">
                    {props.projectName} must be configured before telemetry and controls are enabled.
                </p>
                <Button size="lg" onClick={() => setModalOpen(true)}>
                    <SlidersHorizontal className="w-4 h-4" /> Configure ADCS
                </Button>
            </div>
            {modalOpen && (
                <AdcsConfigModal
                    initialConfig={props.initialConfig}
                    onCancel={() => setModalOpen(false)}
                    onApply={(cfg) => {
                        setModalOpen(false);
                        props.onComplete(cfg);
                    }}
                />
            )}
        </div>
    );
}

function useTle(config: AdcsConfig) {
    const [state, setState] = useState<{ satrec: SatRec | null; name: string; status: "idle" | "loading" | "ready" | "error"; error: string | null }>({
        satrec: null,
        name: "",
        status: "idle",
        error: null,
    });

    const load = useCallback(async () => {
        const manual = parseTle(config.tleLine1, config.tleLine2);
        if (manual) {
            setState({ satrec: manual, name: config.tleName || "Manual TLE", status: "ready", error: null });
            return;
        }
        const id = (config.noradId || "").replace(/\D/g, "");
        if (!id) {
            setState({ satrec: null, name: "", status: "idle", error: null });
            return;
        }
        setState((s) => ({ ...s, status: "loading", error: null }));
        try {
            const res = await fetch(`/api/tle/${id}`);
            const data = await res.json();
            if (!res.ok) {
                setState({ satrec: null, name: "", status: "error", error: data?.error || "Failed to fetch TLE" });
                return;
            }
            const rec = parseTle(data.line1, data.line2);
            if (!rec) {
                setState({ satrec: null, name: "", status: "error", error: "Invalid TLE returned" });
                return;
            }
            setState({ satrec: rec, name: data.name || `NORAD ${id}`, status: "ready", error: null });
        } catch {
            setState({ satrec: null, name: "", status: "error", error: "Network error fetching TLE" });
        }
    }, [config.tleLine1, config.tleLine2, config.tleName, config.noradId]);

    useEffect(() => { load(); }, [load]);

    return state;
}

function fmtChannel(s: ScalarChannelSample | undefined): string {
    if (!s || s.value == null) return "--";
    if (typeof s.value === "number") return Number.isInteger(s.value) ? String(s.value) : s.value.toFixed(2);
    return String(s.value);
}

function SceneWrapper() {
    const { activeProject, saveActiveConfig } = useProject();
    const configured = activeProject?.configured ?? false;
    const config = useMemo(() => ({ ...DEFAULT_ADCS_CONFIG, ...(activeProject?.config ?? {}) }), [activeProject?.config]);
    const live = config.live;

    const channels = bStore.use.scalarChannels();
    const { satrec, name: tleName, status: tleStatus, error: tleError } = useTle(config);

    const [configOpen, setConfigOpen] = useState(false);

    const epochRef = useRef<number>(Date.now());
    const simTimeRef = useRef<number>(epochRef.current);
    const offsetRef = useRef<number>(0);
    const [offsetMin, setOffsetMin] = useState(0);
    const [playing, setPlaying] = useState(false);

    const simDate = useMemo(() => new Date(epochRef.current + offsetMin * 60000), [offsetMin]);

    const setOffset = useCallback((min: number) => {
        const clamped = Math.max(0, Math.min(SIM_WINDOW_MIN, min));
        offsetRef.current = clamped;
        simTimeRef.current = epochRef.current + clamped * 60000;
        setOffsetMin(clamped);
    }, []);

    useEffect(() => {
        if (!playing) return;
        const RATE = SIM_WINDOW_MIN / 60;
        let raf = 0;
        let last = performance.now();
        const tick = (t: number) => {
            const dt = (t - last) / 1000;
            last = t;
            const next = Math.min(SIM_WINDOW_MIN, offsetRef.current + RATE * dt);
            offsetRef.current = next;
            simTimeRef.current = epochRef.current + next * 60000;
            setOffsetMin(next);
            if (next >= SIM_WINDOW_MIN) {
                setPlaying(false);
                return;
            }
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(raf);
    }, [playing]);

    const toggle = () => {
        if (offsetRef.current >= SIM_WINDOW_MIN) setOffset(0);
        setPlaying((p) => !p);
    };
    const skipStart = () => { setPlaying(false); setOffset(0); };
    const skipEnd = () => { setPlaying(false); setOffset(SIM_WINDOW_MIN); };
    const scrub = (min: number) => { setPlaying(false); setOffset(min); };

    const trackKey = Math.floor(offsetMin / 15);
    const trackPoints = useMemo(() => {
        if (!satrec) return [] as THREE.Vector3[];
        const from = new Date(epochRef.current + trackKey * 15 * 60000);
        const per = periodMinutes(satrec) || 95;
        return groundTrack(satrec, from, per, 160).map((p) => geoToUnits(p.lat, p.lon, p.altKm));
    }, [satrec, trackKey]);

    const orbit: OrbitState | null = useMemo(
        () => (satrec ? propagateState(satrec, simDate) : null),
        [satrec, simDate]
    );

    const quatText = config.chQuaternion ? channels[config.chQuaternion]?.text ?? null : null;

    const map = useMemo<KeyboardControlsEntry<Controls>[]>(
        () => [
            { name: Controls.forward, keys: ['ArrowUp', 'KeyW'] },
            { name: Controls.backward, keys: ['ArrowDown', 'KeyS'] },
            { name: Controls.left, keys: ['ArrowLeft', 'KeyA'] },
            { name: Controls.right, keys: ['ArrowRight', 'KeyD'] }
        ], []
    );

    return (
        <div id="canvas-container" className="flex-1 relative dark">
            <KeyboardControls map={map}>
                <Canvas shadows camera={{ position: [2.2 * R_EARTH, 0, 0], near: 0.1, far: R_EARTH * 3 }}>
                    <ThreeScene
                        satrec={satrec}
                        simTimeRef={simTimeRef}
                        trackPoints={trackPoints}
                        quatText={quatText}
                        showOrbit={config.showOrbit}
                        showStation={config.showStation}
                        showAtmosphere={config.showAtmosphere}
                        autoRotate={config.autoRotate}
                    />
                </Canvas>
            </KeyboardControls>

            {!live && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <div className="flex flex-row items-center gap-2 rounded-full border border-red-500/50 bg-red-950/60 backdrop-blur-xl px-3 py-1.5 text-red-400">
                                <TriangleAlert className="w-4 h-4" />
                                <span className="text-xs font-semibold uppercase tracking-wide">Not Live</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                            Spacecraft is not live — showing predicted SGP4 orbit only.
                        </TooltipContent>
                    </Tooltip>
                </div>
            )}

            <div className="absolute top-0 right-0">
                <div className="bg-black/50 backdrop-blur-xl p-4 m-4 rounded-md border w-64">
                    <div className="flex flex-row items-center justify-between pb-2 -mt-1">
                        <h1 className="font-semibold text-sm">Control Parameters</h1>
                        <button
                            onClick={() => setConfigOpen(true)}
                            className="p-1 -m-1 rounded text-muted-foreground hover:text-foreground cursor-pointer"
                            aria-label="Configure ADCS"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <StatField small title="Mode" value={live ? fmtChannel(channels[config.chMode]) : "--"} />
                        <StatField small title="Bus Current" value={live ? fmtChannel(channels[config.chCurrent]) : "--"} units={live && channels[config.chCurrent] ? "A" : undefined} />
                        <StatField small title="Ang Rate" value={live ? fmtChannel(channels[config.chAngularRate]) : "--"} units={live && channels[config.chAngularRate] ? "°/s" : undefined} />
                        <StatField small title="Data" value={config.dataSource === "live" ? "LIVE" : "PLAYBACK"} />
                    </div>
                    <div className="h-px bg-border my-3" />
                    <div className="flex flex-row items-center gap-2 pb-2">
                        <h1 className="font-semibold text-sm">Orbit (SGP4)</h1>
                        {tleStatus === "loading" && <Spinner className="w-3 h-3" />}
                    </div>
                    {tleStatus === "error" ? (
                        <p className="text-xs text-red-400">{tleError}</p>
                    ) : !satrec ? (
                        <p className="text-xs text-muted-foreground">Set a NORAD ID or TLE in configuration.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <StatField small title="Object" value={tleName || "--"} />
                            <StatField small title="Altitude" value={orbit ? orbit.altKm.toFixed(0) : "--"} units="km" />
                            <StatField small title="Latitude" value={orbit ? orbit.lat.toFixed(2) : "--"} units="°" />
                            <StatField small title="Longitude" value={orbit ? orbit.lon.toFixed(2) : "--"} units="°" />
                            <StatField small title="Speed" value={orbit ? orbit.speedKmS.toFixed(2) : "--"} units="km/s" />
                            <StatField small title="Period" value={periodMinutes(satrec).toFixed(1)} units="min" />
                        </div>
                    )}
                </div>
            </div>

            <div className="absolute bottom-0 left-0 m-4 flex flex-row items-center justify-center w-full">
                <div className="shrink-0 relative">
                    <PlaybackControls
                        offsetMin={offsetMin}
                        playing={playing}
                        simDate={simDate}
                        disabled={!satrec}
                        onScrub={scrub}
                        onToggle={toggle}
                        onSkipStart={skipStart}
                        onSkipEnd={skipEnd}
                    />
                </div>
            </div>

            <div className="absolute top-0 left-0 m-4 flex flex-row items-start">
                <div className="shrink-0 bg-black/50 backdrop-blur-xl rounded-full border relative">
                    <PointingScene />
                    <div className="absolute bottom-5 w-full flex flex-row items-center justify-center">
                        <h2 className="font-semibold text-xs text-center text-gray-200">Pointing View</h2>
                    </div>
                </div>
                <ModelButtonRow
                    buttons={modelButtons}
                />
            </div>

            {configOpen && (
                <AdcsConfigModal
                    initialConfig={config}
                    onCancel={() => setConfigOpen(false)}
                    onApply={(cfg) => { setConfigOpen(false); saveActiveConfig(cfg); }}
                />
            )}

            {!configured && (
                <AdcsConfigOverlay
                    projectName={activeProject?.name ?? "The ADCS view"}
                    initialConfig={activeProject?.config ?? DEFAULT_ADCS_CONFIG}
                    onComplete={(cfg) => saveActiveConfig(cfg)}
                />
            )}
        </div>
    );
}

function addV(vec: number[], varr: number[][], pos: [x: number, y: number]) {
    // if (pos[0] == 0 || pos[1] == 0 || pos[0] == varr.length || pos[1] == varr[pos[0]].length) {
    //     return;
    // }

    vec.push(pos[0]);
    vec.push(pos[1]);
    vec.push(varr[pos[0]][pos[1]]);
}

function FragAntennaPattern() {
    const [shaders, setShaders] = useState<{ vert: string, frag: string } | null>(null);

    useEffect(() => {
        async function getShaders() {
            const frag = await (await fetch("/glsl/sinc.frag")).text();
            const vert = await (await fetch("/glsl/sinc.vert")).text();

            setShaders({ frag, vert });
        }

        getShaders();
    }, []);

    const builtMaterial = useMemo(() => {
        if (!shaders) {
            return false;
        }

        const uniforms = {

        };

        const SincMaterial = shaderMaterial(uniforms, shaders.vert, shaders.frag);
        extend({ SincMaterial });

        return true;
    }, [shaders]);

    if (!builtMaterial) {
        return <></>;
    }
    
    return (
        <mesh /* position={[6850, 0, 0]} */>
            <planeGeometry args={[10, 10, 10, 10]}/>
            {/* <meshBasicMaterial color={"hotpink"}/> */}
            <sincMaterial />
        </mesh>
    )
}

function AntennaPattern() {
    const positions: THREE.TypedArray = useMemo<THREE.TypedArray>(() => {
        const varr: number[][] = [];
        const parr: number[] = [];

        for (let i = -50; i < 50; i++) {
            const arrSlice: number[] = [];
            for (let j = -50; j < 50; j++) {
                const x = 2*Math.PI*i/10;
                const y = 2*Math.PI*j/10;

                let val = 20;
                if (x != 0 && y != 0) {
                    val = 20 * (Math.sin(x) / x) + 20 * (Math.sin(y) / y); 
                }
                arrSlice.push(val);
            }
            varr.push(arrSlice);
        }

        varr.forEach((xv, x) => {
            xv.forEach((yv, y) => {
                if (x == 0 || y == 0 || x == varr.length-1 || y == xv.length-1) {
                    return;
                }

                // console.log(`${x}, ${y}`);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x-1, y-1]);
                addV(parr, varr, [x-1, y]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x-1, y]);
                addV(parr, varr, [x-1, y+1]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x-1, y+1]);
                addV(parr, varr, [x, y+1]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x, y+1]);
                addV(parr, varr, [x+1, y+1]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x+1, y+1]);
                addV(parr, varr, [x+1, y]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x+1, y]);
                addV(parr, varr, [x+1, y-1]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x+1, y-1]);
                addV(parr, varr, [x, y-1]);

                addV(parr, varr, [x, y]);

                addV(parr, varr, [x, y-1]);
                addV(parr, varr, [x-1, y-1]);
            });
        });

        console.log(parr);
                
        return new Float32Array(parr);
    }, []);
    
    return (
        <mesh position={[0, 0, 0]}>
            <bufferGeometry attach={"geometry"}>
                <bufferAttribute
                    args={[positions, 3]}
                    attach="attributes-position"
                    array={positions}
                    count={positions.length / 3}
                    itemSize={3}
                />
            </bufferGeometry>
            <meshBasicMaterial
                shadowSide={0}
                side={THREE.DoubleSide}
                color="gray"
            />
        </mesh>
    );
}

export default function ControlsView() {
    return (
        <SceneWrapper />
    )
}