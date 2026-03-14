"use client";

import React, { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface TwinDevice {
  deviceId: string;
  status: "Online" | "Offline";
  healthStatus: "OPERATIONAL" | "WARNING" | "CRITICAL";
  anomalyState: "STABLE" | "ANOMALY";
}

function nodeColor(device: TwinDevice) {
  if (device.status === "Offline") return "#fb7185";
  if (device.anomalyState === "ANOMALY") return "#f97316";
  if (device.healthStatus === "CRITICAL") return "#f59e0b";
  if (device.healthStatus === "WARNING") return "#fde047";
  return "#22d3ee";
}

function TwinNode({
  device,
  index,
  selected,
  onSelect,
}: {
  device: TwinDevice;
  index: number;
  selected: boolean;
  onSelect?: (deviceId: string) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = column * 3.3 - 3.3;
  const z = row * 3.1 - 1.6;
  const height =
    device.status === "Offline"
      ? 0.9
      : device.anomalyState === "ANOMALY"
        ? 2.8
        : 1.9;

  const unhealthy =
    device.status === "Offline" ||
    device.healthStatus !== "OPERATIONAL" ||
    device.anomalyState === "ANOMALY";

  useFrame(({ clock }) => {
    const pulse = selected
      ? 1.08 + Math.sin(clock.getElapsedTime() * 5 + index) * 0.04
      : unhealthy
        ? 1.0 + Math.sin(clock.getElapsedTime() * 3 + index) * 0.03
        : 1;

    if (meshRef.current) {
      meshRef.current.scale.setScalar(pulse);
    }

    const material = ringRef.current?.material;
    if (material instanceof THREE.MeshStandardMaterial) {
      material.opacity = selected ? 0.9 : unhealthy ? 0.35 : 0.15;
    }
  });

  return (
    <group position={[x, height / 2 - 0.7, z]}>
      <Float speed={1.5} rotationIntensity={0.15} floatIntensity={0.35}>
        <mesh
          ref={meshRef}
          castShadow
          receiveShadow
          onClick={(event) => {
            event.stopPropagation();
            onSelect?.(device.deviceId);
          }}
        >
          <boxGeometry args={[1.45, height, 1.45]} />
          <meshStandardMaterial
            color={nodeColor(device)}
            metalness={0.4}
            roughness={0.25}
            emissive={nodeColor(device)}
            emissiveIntensity={0.15}
          />
        </mesh>
      </Float>

      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -height / 2 - 0.28, 0]}
      >
        <ringGeometry args={[1.05, 1.35, 36]} />
        <meshStandardMaterial
          color={selected ? "#67e8f9" : nodeColor(device)}
          transparent
          opacity={selected ? 0.9 : 0.2}
        />
      </mesh>
    </group>
  );
}

export default function DigitalTwinScene({
  devices,
  selectedDeviceId,
  onSelectDevice,
}: {
  devices: TwinDevice[];
  selectedDeviceId?: string | null;
  onSelectDevice?: (deviceId: string) => void;
}) {
  return (
    <div className="h-[320px] w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#07131b]">
      <Canvas camera={{ position: [8, 6, 10], fov: 46 }} shadows>
        <color attach="background" args={["#07131b"]} />
        <ambientLight intensity={0.75} />
        <directionalLight position={[8, 10, 5]} intensity={1.25} castShadow />
        <spotLight position={[-8, 10, -2]} intensity={0.55} />

        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, -1.05, 0]}
          receiveShadow
        >
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0b1a22" metalness={0.2} roughness={0.9} />
        </mesh>

        <gridHelper
          args={[20, 20, "#1f4757", "#11242e"]}
          position={[0, -1.04, 0]}
        />

        {devices.slice(0, 8).map((device, index) => (
          <TwinNode
            key={device.deviceId}
            device={device}
            index={index}
            selected={selectedDeviceId === device.deviceId}
            onSelect={onSelectDevice}
          />
        ))}

        <OrbitControls
          enablePan={false}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={7}
          maxDistance={14}
        />
      </Canvas>
    </div>
  );
}
