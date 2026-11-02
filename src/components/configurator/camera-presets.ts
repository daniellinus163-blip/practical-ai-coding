export const cameraPresets = {
  threeQuarter: { label: "3/4", position: [4.4, 1.7, 4.4] as [number, number, number], target: [0, 0.55, 0] as [number, number, number] },
  front: { label: "Front", position: [0, 1.3, 6.2] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
  side: { label: "Side", position: [6.4, 1.2, 0] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
  rear: { label: "Rear", position: [0, 1.4, -6.2] as [number, number, number], target: [0, 0.5, 0] as [number, number, number] },
  top: { label: "Top", position: [0.2, 8.2, 0.2] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  cabin: { label: "Interior", position: [0.42, 1.12, 0.15] as [number, number, number], target: [0, 0.82, -0.35] as [number, number, number] },
} as const;

export type CameraPresetId = keyof typeof cameraPresets;
