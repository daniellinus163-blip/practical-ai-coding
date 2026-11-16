import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Home-screen icon — same mark as favicon, larger for iOS. */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg, #171512 0%, #2a2722 100%)",
          borderRadius: 36,
        }}
      >
        <div
          style={{
            position: "relative",
            width: 100,
            height: 100,
            display: "flex",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 38,
              top: 52,
              width: 44,
              height: 44,
              background: "#c4a574",
              opacity: 0.45,
              borderRadius: 8,
            }}
          />
          <div
            style={{
              position: "absolute",
              left: 50,
              top: 40,
              width: 44,
              height: 44,
              background: "#8a6a2f",
              borderRadius: 8,
              border: "3px solid #c4a574",
            }}
          />
        </div>
        <p
          style={{
            margin: 0,
            marginTop: 14,
            fontSize: 18,
            letterSpacing: "0.2em",
            color: "#c4a574",
            fontWeight: 600,
          }}
        >
          FS
        </p>
      </div>
    ),
    { ...size },
  );
}