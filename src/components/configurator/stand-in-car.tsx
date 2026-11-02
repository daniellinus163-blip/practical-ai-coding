"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, MeshStandardMaterial, type Group } from "three";
import { inspectScene } from "@/configurator/inspect-scene";
import type { WheelStyleId } from "@/configurator/capabilities";
import type { SceneInspection } from "@/configurator/types";

export function StandInCar({
  paintHex,
  wheelStyle,
  onInspect,
}: {
  paintHex: string;
  wheelStyle: WheelStyleId;
  onInspect: (report: SceneInspection) => void;
}) {
  const group = useRef<Group>(null);
  const body = useMemo(
    () =>
      new MeshStandardMaterial({
        name: "BodyPaint",
        color: new Color("#1e3a5f"),
        metalness: 0.72,
        roughness: 0.22,
      }),
    [],
  );
  const glass = useMemo(
    () =>
      new MeshStandardMaterial({
        name: "Glass",
        color: "#8aa0b8",
        metalness: 0.9,
        roughness: 0.05,
        transparent: true,
        opacity: 0.35,
      }),
    [],
  );
  const cabin = useMemo(
    () =>
      new MeshStandardMaterial({
        name: "Cabin",
        color: "#111111",
        metalness: 0.2,
        roughness: 0.7,
      }),
    [],
  );
  const rubber = useMemo(
    () =>
      new MeshStandardMaterial({
        name: "Tire",
        color: "#1b1b1b",
        metalness: 0.1,
        roughness: 0.85,
      }),
    [],
  );
  const wheelPaint = useMemo(
    () =>
      new MeshStandardMaterial({
        name: "WheelPaint",
        color: "#c5c5c5",
        metalness: 0.8,
        roughness: 0.25,
      }),
    [],
  );

  useLayoutEffect(() => {
    body.color.set(paintHex);
  }, [body, paintHex]);

  useLayoutEffect(() => {
    if (group.current) onInspect(inspectScene(group.current));
  }, [onInspect, wheelStyle]);

  return (
    <group ref={group} position={[0, 0.38, 0]}>
      <mesh name="Body" castShadow receiveShadow material={body} position={[0, 0.18, 0]}>
        <boxGeometry args={[4.4, 0.55, 1.9]} />
      </mesh>
      <mesh name="BodyShoulder" castShadow material={body} position={[0.15, 0.48, 0]}>
        <boxGeometry args={[3.2, 0.28, 1.82]} />
      </mesh>
      <mesh name="Hood" castShadow material={body} position={[1.35, 0.38, 0]} rotation={[0, 0, -0.08]}>
        <boxGeometry args={[1.5, 0.18, 1.7]} />
      </mesh>
      <mesh name="Cabin" castShadow material={cabin} position={[-0.15, 0.72, 0]}>
        <boxGeometry args={[1.9, 0.42, 1.55]} />
      </mesh>
      <mesh name="Glass" castShadow material={glass} position={[-0.15, 0.78, 0]}>
        <boxGeometry args={[1.7, 0.38, 1.62]} />
      </mesh>
      <WheelSet style={wheelStyle} rubber={rubber} wheelPaint={wheelPaint} />
    </group>
  );
}

function WheelSet({
  style,
  rubber,
  wheelPaint,
}: {
  style: WheelStyleId;
  rubber: MeshStandardMaterial;
  wheelPaint: MeshStandardMaterial;
}) {
  const spots: Array<[number, number, number]> = [
    [1.35, -0.18, 0.95],
    [1.35, -0.18, -0.95],
    [-1.4, -0.18, 0.95],
    [-1.4, -0.18, -0.95],
  ];
  return (
    <group>
      {spots.map((position, index) => (
        <group key={index} position={position} rotation={[0, 0, Math.PI / 2]}>
          <mesh name={`Tire-${index}`} castShadow material={rubber}>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 24]} />
          </mesh>
          {style === "spoke" ? (
            <mesh name={`WheelSpoke-${index}`} material={wheelPaint}>
              <cylinderGeometry args={[0.22, 0.22, 0.3, 8]} />
            </mesh>
          ) : (
            <mesh name={`WheelDisc-${index}`} material={wheelPaint}>
              <cylinderGeometry args={[0.26, 0.26, 0.3, 24]} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}
