"use client";
import { Button } from "@/components/ui/button";
import { CaseUpper, Crosshair, Expand, FastForward, Play, RotateCcw, Settings, SkipBack, SkipForward } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, KeyboardControls, KeyboardControlsEntry, Line, Html, shaderMaterial } from '@react-three/drei';
import * as earcut from 'earcut';

import * as THREE from 'three';
import { StatField } from "../stat-field";
import { Slider } from "../ui/slider";


const velAz = 0.1;  // rad/s
const velEl = 0.08;  // rad/s

const targetAz = 0;
const targetEl = Math.PI;

const R_EARTH = 6.300;
const satHeight = 0.550;

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
            const cx: number = cubeRef.current.rotation.x;
            const cy: number = cubeRef.current.rotation.y;

            // cubeRef.current.rotation.x += 0.01;
            if (cy > 2*Math.PI) {
                cubeRef.current.rotation.y = cy % (2*Math.PI);
            } else {
                cubeRef.current.rotation.y = (cy + velEl * delta);
            }

            if (cx > 2*Math.PI) {
                cubeRef.current.rotation.x = cx % (2*Math.PI);
            } else {
                cubeRef.current.rotation.x = (cx + velAz * delta);
            }

            // if (circularBound(cx, targetAz, 0.1) && circularBound(cy, targetEl, 0.1)) {
            //     setHeadingColor("green");
            //     console.log("GREEN");
            // } else {
            //     setHeadingColor("white");
            // }

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

function OrbitalScene() {
    return (
        <div className="w-40 h-40">
            <Canvas shadows camera={{ position: [2 * R_EARTH, 0, 0], near: 0.1, far: R_EARTH * 2 }}>
                <ambientLight intensity={1}/>
                <directionalLight position={[10, 10, 10]} castShadow />
                <OrbitalPath /> 
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[R_EARTH, 256, 256]}/>
                    <meshStandardMaterial color="gray"/>
                </mesh>
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

function ThreeScene() {
    const controlsRef = useRef<any>(null);

    // const fwd = useKeyboardControls((state) => state.forward);
    // const bwd = useKeyboardControls((state) => state.backward);
    // const left = useKeyboardControls((state) => state.left);
    // const right = useKeyboardControls((state) => state.right);

    // useFrame(() => {
    //     if (controlsRef.current) {
    //         const speed = 0.1;

    //         if (fwd) {
    //             camera.
    //         }
    //     }
    // })

    const { scene } = useThree();

    useEffect(() => {
        // set sky background using https://opengameart.org/content/night-sky-skybox-generator
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
            <ambientLight intensity={1}/>
            <directionalLight position={[10, 10, 10]} castShadow />
            {/* <PlanetThing /> */}
            {/* <Planet /> */}
            <Cube />
            {/* <Stats /> */}
            {/* <OrbitalPath /> */}
            {/* <FragAntennaPattern /> */}
            {/* <OrbitalLabel /> */}
            <OrbitControls
                ref={controlsRef}
                maxDistance={3 * R_EARTH}
                minDistance={1.1 * R_EARTH}
                /* target={[6850, 0, 0]} */ 
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

function PlaybackControls() {
    return (
        <div className="flex flex-col items-center gap-4">
            <Slider className="w-[24rem]"/>
            <div className="flex flex-row items-center gap-2">
                <Button variant="outline" className="backdrop-blur-md">
                    <SkipBack />
                </Button>
                <Button variant="outline" className="backdrop-blur-md">
                    <Play />
                </Button>
                <Button variant="outline" className="backdrop-blur-md">
                    <SkipForward />
                </Button>
            </div>
        </div>
    )
}

function SceneWrapper() {
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
                <Canvas shadows camera={{ position: [R_EARTH + satHeight, 0, 0], near: 0.1, far: R_EARTH * 3 }}>
                    <ThreeScene />
                </Canvas>
            </KeyboardControls>
            <div className="absolute top-0 right-0">
                <div className="bg-black/50 backdrop-blur-xl p-4 m-4 rounded-md border">
                    <h1 className="pb-2 -mt-1 font-semibold text-sm">Control Parameters</h1>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                        <StatField small title="Mode" value="ACTIVE"/>
                        <StatField small title="Active Current" value="3.21" units="A"/>
                        <StatField small title="Ang Velocity" value="5.24" units="°/min"/>
                        <StatField small title="Ang Acc" value="0.54" units="°/min"/>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-0 left-0 m-4 flex flex-row items-center justify-center w-full">
                <div className="shrink-0 relative">
                    <PlaybackControls />
                </div>
            </div>
            <div className="absolute bottom-0 left-0 m-4 flex flex-row items-end">
                <div className="shrink-0 bg-black/50 backdrop-blur-xl rounded-full border relative overflow-hidden">
                    <OrbitalScene />
                    {/* <div className="absolute bottom-5 w-full flex flex-row items-center justify-center">
                        <h2 className="font-semibold text-xs text-center text-gray-200">Pointing View</h2>
                    </div> */}
                </div>
                <ModelButtonRow
                    buttons={modelButtons}
                />
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