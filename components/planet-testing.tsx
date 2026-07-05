"use client";

import * as THREE from "three";
import { shaderMaterial } from "@react-three/drei";
import { extend, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";

/**
 * 1. Define the ShaderMaterial.
 */
const PlanetMaterial = shaderMaterial(
    {}, 
    `void main() { 
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); 
    }`, 
    `void main() { 
        gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); 
    }`
);

/**
 * 2. Register for R3F.
 */
extend({ PlanetMaterial });

/**
 * 3. Create a Typed Reference.
 * This constant allows us to use the tag while tricking TS into thinking it's a standard any-type component.
 */
const PlanetMaterialTag = "planetMaterial" as any;

export function PlanetThing() {
    const [shaders, setShaders] = useState<{ vert: string, frag: string } | null>(null);
    const materialRef = useRef<THREE.ShaderMaterial>(null);
    const textRef = useRef<any | null>(null);
    const { camera } = useThree();

    useFrame(() => {
        if (textRef.current) {
            textRef.current.lookAt(camera.position);
        }
    });

    useEffect(() => {
        async function getShaders() {
            try {
                const [frag, vert] = await Promise.all([
                    fetch("/glsl/planet.frag").then(res => res.text()),
                    fetch("/glsl/planet.vert").then(res => res.text())
                ]);
                setShaders({ frag, vert });
            } catch (e) {
                console.error("Failed to load shaders:", e);
            }
        }
        getShaders();
    }, []);

    useEffect(() => {
        if (shaders && materialRef.current) {
            materialRef.current.vertexShader = shaders.vert;
            materialRef.current.fragmentShader = shaders.frag;
            materialRef.current.needsUpdate = true;
        }
    }, [shaders]);

    return (
        <mesh position={[6850, 0, 0]}>
            <boxGeometry args={[2, 2, 2]}/>
            {/* Using the constant variable here bypasses the IntrinsicElements check */}
            <PlanetMaterialTag 
                ref={materialRef} 
                key={shaders ? "loaded" : "loading"} 
                transparent={true}
            />
        </mesh>
    );
}