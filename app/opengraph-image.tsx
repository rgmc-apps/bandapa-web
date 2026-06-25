import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Bandapa — Band Management Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F1509",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top-center glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "700px",
            height: "500px",
            background:
              "radial-gradient(ellipse, rgba(106,168,79,0.14) 0%, transparent 65%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Grid dots overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(rgba(106,168,79,0.12) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "24px",
            position: "relative",
            zIndex: 1,
            textAlign: "center",
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: "72px",
              height: "72px",
              background: "rgba(106,168,79,0.15)",
              border: "1px solid rgba(106,168,79,0.3)",
              borderRadius: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "8px",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                background: "#6AA84F",
                borderRadius: "50%",
                display: "flex",
              }}
            />
          </div>

          <div
            style={{
              fontSize: "96px",
              fontWeight: 800,
              color: "white",
              fontFamily: "sans-serif",
              letterSpacing: "-0.03em",
              lineHeight: 1,
              display: "flex",
            }}
          >
            Bandapa
          </div>

          <div
            style={{
              fontSize: "26px",
              color: "rgba(255,255,255,0.45)",
              fontFamily: "sans-serif",
              fontWeight: 400,
              letterSpacing: "0.01em",
              maxWidth: "600px",
              display: "flex",
              textAlign: "center",
            }}
          >
            The band management platform for serious musicians
          </div>

          {/* Pill row */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "16px",
            }}
          >
            {["Manage bands", "Find venues", "Invite members"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "10px 22px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.09)",
                  borderRadius: "100px",
                  color: "rgba(255,255,255,0.4)",
                  fontSize: "16px",
                  fontFamily: "monospace",
                  display: "flex",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom URL */}
        <div
          style={{
            position: "absolute",
            bottom: "36px",
            fontSize: "14px",
            color: "rgba(255,255,255,0.15)",
            fontFamily: "monospace",
            display: "flex",
          }}
        >
          bandapa.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
