    import { Html, shaderMaterial, Text } from "@react-three/drei";
    import { ConstructorRepresentation, extend, useFrame, useThree } from "@react-three/fiber";
    import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
    import { ShaderMaterial } from "three";

    export function PlanetThing() {
        const [shaders, setShaders] = useState<{ vert: string, frag: string } | null>(null);

        const textRef = useRef<any | null>(null);

        const { camera } = useThree();

        useLayoutEffect(() => {
            
        })

        useFrame(() => {
            if (textRef.current) {
                textRef.current.lookAt(camera.position);
            }
        });

        useEffect(() => {
            async function getShaders() {
                const frag = await (await fetch("/glsl/planet.frag")).text();
                const vert = await (await fetch("/glsl/planet.vert")).text();

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

            const PlanetMaterial = shaderMaterial(uniforms, shaders.vert, shaders.frag);
            extend({ PlanetMaterial });

            return true;
        }, [shaders]);

        if (!builtMaterial) {
            return <></>;
        }
        
        return (
            <mesh position={[6850, 0, 0]}>
                <boxGeometry args={[2, 2, 2]}/>
                {/* <meshBasicMaterial color={"hotpink"}/> */}
                <planetMaterial />
            </mesh>
        );
    }