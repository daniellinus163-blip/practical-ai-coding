import { ImageResponse } from "next/og";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";

export const alt = `${SITE_NAME} — online 3D vehicle configurator`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "64px",
          background: "linear-gradient(145deg, #171512 0%, #2a2722 55%, #3b3832 100%)",
          color: "#f4efe6",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: 22, letterSpacing: "0.35em", textTransform: "uppercase", margin: 0, color: "#c9a227" }}>
          {SITE_NAME}
        </p>
        <h1 style={{ fontSize: 56, fontWeight: 600, lineHeight: 1.15, marginTop: 24, marginBottom: 0, maxWidth: 900 }}>
          3D car configurator &amp; digital vehicle showroom
        </h1>
        <p style={{ fontSize: 26, lineHeight: 1.45, marginTop: 28, maxWidth: 920, color: "#d8d2c8" }}>
          {DEFAULT_DESCRIPTION.slice(0, 140)}…
        </p>
      </div>
    ),
    { ...size },
  );
}
