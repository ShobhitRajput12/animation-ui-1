"use client";

import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { shaderMaterial } from "@react-three/drei";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  Line,
  LineBasicMaterial,
  MathUtils,
  PerspectiveCamera,
  ShaderMaterial,
  Vector3,
  Vector2
} from "three";
import { useMemo, useRef } from "react";
import type { Ref } from "react";
import type { Group, Mesh } from "three";

const RibbonMaterial = shaderMaterial(
  {
    uTime: 0,
    uColorA: new Color("#8af7ff"),
    uColorB: new Color("#9f7bff"),
    uOpacity: 0.22
  },
  `
    uniform float uTime;
    varying vec2 vUv;
    varying float vWave;

    void main() {
      vUv = uv;
      vec3 p = position;
      float sweep = sin((uv.x * 6.28318 * 3.0) + uTime * 0.45);
      float fold = cos((uv.y * 6.28318 * 2.0) - uTime * 0.3);
      p.z += sweep * 0.55 + fold * 0.35;
      p.y += sin((uv.x * 6.28318 * 2.0) + uTime * 0.25) * 0.2;
      vWave = sweep;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uOpacity;
    varying vec2 vUv;
    varying float vWave;

    void main() {
      float edge = smoothstep(0.0, 0.2, vUv.y) * (1.0 - smoothstep(0.8, 1.0, vUv.y));
      float fade = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));
      float glow = pow(edge * fade, 1.35);
      vec3 color = mix(uColorB, uColorA, vUv.x * 0.75 + vWave * 0.12 + 0.12);
      gl_FragColor = vec4(color, glow * uOpacity);
    }
  `
);

extend({ RibbonMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    ribbonMaterial: {
      ref?: Ref<ShaderMaterial>;
      transparent?: boolean;
      depthWrite?: boolean;
      blending?: number;
      uTime?: number;
      uOpacity?: number;
      uColorA?: Color;
      uColorB?: Color;
      side?: number;
    };
  }
}

function createOrbitalCurve(
  turns: number,
  points: number,
  radiusX: number,
  radiusY: number,
  wobble: number,
  phase = 0
) {
  const positions = new Float32Array(points * 3);

  for (let i = 0; i < points; i += 1) {
    const t = (i / (points - 1)) * Math.PI * 2.0;
    const harmonic = turns * t + phase;
    const torusWave = Math.sin(harmonic) * wobble;
    const rX = radiusX + torusWave * 0.55;
    const rY = radiusY + torusWave;
    positions[i * 3] = Math.cos(t) * rX;
    positions[i * 3 + 1] = Math.sin(t) * rY;
    positions[i * 3 + 2] = Math.sin(harmonic * 0.5) * wobble * 0.8;
  }

  return positions;
}

function OrbitalLines() {
  const group = useRef<Group>(null);
  const pointerForce = useRef(new Vector2());
  const localPointer = useRef(new Vector3());
  const unprojectedPointer = useRef(new Vector3());
  const pointerDirection = useRef(new Vector3());
  const pointerHit = useRef(new Vector3());
  const lineData = useMemo(
    () =>
      Array.from({ length: 16 }, (_, index) => {
        const ratio = index / 16;
        return {
          rotation: [
            ratio * Math.PI * 1.75,
            ratio * Math.PI * 0.95,
            ratio * Math.PI * 0.6
          ] as const,
          color: ratio < 0.66 ? "#fff7df" : ratio < 0.82 ? "#a5fbff" : "#b68cff",
          positions: createOrbitalCurve(
            7 + (index % 4),
            560,
            3.35 + Math.sin(index * 0.7) * 0.28,
            2.15 + Math.cos(index * 0.35) * 0.24,
            0.32 + ratio * 0.18,
            ratio * Math.PI
          )
        };
      }),
    []
  );
  const lines = useMemo(
    () =>
      lineData.map((item) => {
        const geometry = new BufferGeometry();
        geometry.setAttribute("position", new BufferAttribute(item.positions.slice(), 3));
        const material = new LineBasicMaterial({
          color: item.color,
          transparent: true,
          opacity: 0.72,
          blending: AdditiveBlending
        });
        const line = new Line(geometry, material);
        line.rotation.set(item.rotation[0], item.rotation[1], item.rotation[2]);
        return line;
      }),
    [lineData]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (group.current) {
      group.current.rotation.x = 0.35 + t * 0.14;
      group.current.rotation.y = t * 0.19;
      group.current.rotation.z = Math.sin(t * 0.42) * 0.18;

      const breath = 1 + Math.sin(t * 0.82) * 0.06;
      const floatY = Math.sin(t * 0.62) * 0.28;
      group.current.scale.setScalar(breath);
      group.current.position.y = floatY;

      const camera = state.camera as PerspectiveCamera;
      unprojectedPointer.current.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
      pointerDirection.current
        .copy(unprojectedPointer.current)
        .sub(camera.position)
        .normalize();

      const distanceToScenePlane =
        Math.abs(pointerDirection.current.z) > 0.0001
          ? -camera.position.z / pointerDirection.current.z
          : 0;

      pointerHit.current
        .copy(camera.position)
        .add(pointerDirection.current.multiplyScalar(distanceToScenePlane));

      localPointer.current.copy(pointerHit.current);
      group.current.worldToLocal(localPointer.current);

      pointerForce.current.x = MathUtils.lerp(pointerForce.current.x, localPointer.current.x, 0.14);
      pointerForce.current.y = MathUtils.lerp(pointerForce.current.y, localPointer.current.y, 0.14);
    }

    lines.forEach((line, index) => {
      const positions = line.geometry.attributes.position.array as Float32Array;
      const base = lineData[index].positions;
      for (let i = 0; i < positions.length; i += 3) {
        const x = base[i];
        const y = base[i + 1];
        const z = base[i + 2];
        const distance = Math.sqrt(x * x + y * y);
        const wave = Math.sin(distance * 1.95 - t * 1.55 + index * 0.5) * 0.1;
        const twist = Math.cos(distance * 1.45 + t * 1.15 + index * 0.2) * 0.085;
        const normalizedDistance = Math.max(distance, 0.001);
        const animatedX = x + (x / normalizedDistance) * wave;
        const animatedY = y + (y / normalizedDistance) * wave;
        const dx = animatedX - pointerForce.current.x;
        const dy = animatedY - pointerForce.current.y;
        const pointerDistance = Math.sqrt(dx * dx + dy * dy);
        const repelRadius = 2.1;
        const repelStrength =
          pointerDistance < repelRadius
            ? Math.pow(1 - pointerDistance / repelRadius, 2) * 1.15
            : 0;
        const repelSafeDistance = Math.max(pointerDistance, 0.001);

        positions[i] = animatedX + (dx / repelSafeDistance) * repelStrength;
        positions[i + 1] = animatedY + (dy / repelSafeDistance) * repelStrength;
        positions[i + 2] = z + twist + repelStrength * 0.28;
      }
      line.geometry.attributes.position.needsUpdate = true;
      (line.material as { opacity: number }).opacity =
        0.6 + Math.sin(t * 1.05 + index * 0.65) * 0.13;
    });
  });

  return (
    <group ref={group}>
      {lines.map((line, index) => (
        <primitive key={index} object={line} />
      ))}
    </group>
  );
}

function RibbonWaves() {
  const group = useRef<Group>(null);
  const ribbons = useRef<ShaderMaterial[]>([]);
  const planes = useMemo(
    () =>
      [
        { scale: 9.5, rotation: [0.32, 0.65, 0.28], position: [0, 0.2, 0], opacity: 0.04 },
        { scale: 8.3, rotation: [-0.55, -0.2, 1.1], position: [0, -0.35, 0], opacity: 0.035 },
        { scale: 10.2, rotation: [0.1, -0.82, -0.6], position: [0, 0.45, 0], opacity: 0.03 }
      ] as const,
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    if (group.current) {
      group.current.rotation.y = t * 0.04;
      group.current.rotation.z = Math.sin(t * 0.22) * 0.12;
    }

    ribbons.current.forEach((material, index) => {
      material.uniforms.uTime.value = t + index * 0.8;
      material.uniforms.uOpacity.value = planes[index].opacity + Math.sin(t * 0.45 + index) * 0.025;
    });
  });

  return (
    <group ref={group}>
      {planes.map((plane, index) => (
        <mesh
          key={index}
          position={plane.position}
          rotation={plane.rotation}
          scale={plane.scale}
        >
          <planeGeometry args={[1.8, 6.8, 96, 96]} />
          <ribbonMaterial
            ref={(node) => {
              if (node) {
                ribbons.current[index] = node;
              }
            }}
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            uOpacity={plane.opacity}
          />
        </mesh>
      ))}
    </group>
  );
}

function Starfield() {
  const points = useMemo(() => {
    const positions = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i += 1) {
      const radius = 18 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = -8 - Math.random() * 20;
    }
    return positions;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[points, 3]}
          count={points.length / 3}
          array={points}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a6c8ff"
        size={0.05}
        sizeAttenuation
        transparent
        opacity={0.45}
        depthWrite={false}
      />
    </points>
  );
}

function Atmosphere() {
  const mesh = useRef<Mesh>(null);

  useFrame((state) => {
    if (!mesh.current) {
      return;
    }

    const t = state.clock.elapsedTime;
    mesh.current.rotation.z = t * 0.01;
    const breath = 1 + Math.sin(t * 0.2) * 0.02;
    mesh.current.scale.setScalar(1.15 * breath);
  });

  return (
    <mesh ref={mesh}>
      <sphereGeometry args={[7.5, 64, 64]} />
      <meshBasicMaterial color="#000000" transparent opacity={0} />
    </mesh>
  );
}

function CameraRig() {
  const { camera, pointer } = useThree();
  const target = useRef(new Vector2());

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    target.current.x = pointer.x * 0.65;
    target.current.y = pointer.y * 0.4;

    camera.position.x = MathUtils.lerp(
      camera.position.x,
      target.current.x + Math.sin(t * 0.18) * 0.75,
      delta * 1.8
    );
    camera.position.y = MathUtils.lerp(
      camera.position.y,
      target.current.y + Math.cos(t * 0.14) * 0.45,
      delta * 1.6
    );
    camera.position.z = MathUtils.lerp(camera.position.z, 11.2 + Math.sin(t * 0.28) * 0.35, delta);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

function SceneContents() {
  return (
    <>
      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 14, 30]} />
      <ambientLight intensity={0.18} color="#9cc8ff" />
      <pointLight position={[0, 0, 4]} intensity={6} color="#fff2dc" />
      <pointLight position={[4, 3, -2]} intensity={1.8} color="#75f1ff" />
      <pointLight position={[-4, -2, -2]} intensity={1.6} color="#9f7bff" />
      <CameraRig />
      <Starfield />
      <Atmosphere />
      <RibbonWaves />
      <OrbitalLines />
      <EffectComposer>
        <Bloom
          intensity={1.7}
          luminanceThreshold={0.08}
          luminanceSmoothing={0.45}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}

export function OrbitalScene() {
  return (
    <div className="h-full w-full">
      <Canvas
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 11.5], fov: 34, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      >
        <SceneContents />
      </Canvas>
    </div>
  );
}
