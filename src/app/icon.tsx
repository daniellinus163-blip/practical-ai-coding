import { ImageResponse } from "next/og";

export const size = { width: 48, height: 48 };
export const contentType = "image/png";

/** Tab favicon — layered brass planes (3D configurator) on ink. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#171512",
          borderRadius: 10,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 36,
            height: 36,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 14,
              top: 18,
              width: 16,
              height: 16,
              background: "#c4a574",
              opacity: 0.45,
              borderRadius: 3,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 18,
              top: 14,
              width: 16,
              height: 16,
              background: "#8a6a2f",
              borderRadius: 3,
              border: "2px solid #c4a574",
            }}
          />
        </div>
      </div>
    ),
    { ...size },
  );
}