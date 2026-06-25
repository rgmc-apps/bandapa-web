import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const alt = "Band invitation on Bandapa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  let band: { name: string; image_url?: string | null; genres?: unknown } | null = null;
  try {
    const { data } = await supabase
      .schema("bandapa-main")
      .rpc("get_band_by_invite_code", { p_code: code.toUpperCase() });
    band = (Array.isArray(data) ? data[0] : data) ?? null;
  } catch {
    // render fallback
  }

  const bandName = band?.name ?? "Bandapa";
  const genres = (band?.genres as string[] | undefined)?.slice(0, 3) ?? [];
  const imageUrl = band?.image_url ?? null;

  return new ImageResponse(
    (
      <div
        style={{
          background: "#0F1509",
          width: "100%",
          height: "100%",
          display: "flex",
          padding: "72px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* radial glow top-right */}
        <div
          style={{
            position: "absolute",
            top: "-160px",
            right: "-160px",
            width: "520px",
            height: "520px",
            background:
              "radial-gradient(circle, rgba(106,168,79,0.18) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />
        {/* radial glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: "-200px",
            left: "-100px",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(106,168,79,0.08) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Left column */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "space-between",
            paddingRight: "60px",
          }}
        >
          {/* Brand */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "32px",
                height: "32px",
                background: "rgba(106,168,79,0.2)",
                border: "1px solid rgba(106,168,79,0.3)",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: "12px",
                  height: "12px",
                  background: "#6AA84F",
                  borderRadius: "50%",
                  display: "flex",
                }}
              />
            </div>
            <span
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "rgba(255,255,255,0.35)",
                fontFamily: "sans-serif",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Bandapa
            </span>
          </div>

          {/* Main content */}
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                fontSize: "22px",
                color: "#6AA84F",
                fontFamily: "sans-serif",
                fontWeight: 500,
                letterSpacing: "0.02em",
                display: "flex",
              }}
            >
              You&apos;re invited to join
            </div>
            <div
              style={{
                fontSize: bandName.length > 22 ? 56 : bandName.length > 14 ? 68 : 84,
                fontWeight: 800,
                color: "white",
                fontFamily: "sans-serif",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
                display: "flex",
              }}
            >
              {bandName}
            </div>
            {genres.length > 0 && (
              <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
                {genres.map((g) => (
                  <div
                    key={g}
                    style={{
                      padding: "7px 18px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.09)",
                      borderRadius: "100px",
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "15px",
                      fontFamily: "monospace",
                      display: "flex",
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            style={{
              fontSize: "14px",
              color: "rgba(255,255,255,0.18)",
              fontFamily: "monospace",
              display: "flex",
            }}
          >
            Accept your invitation at bandapa.app
          </div>
        </div>

        {/* Right — band image or placeholder */}
        <div
          style={{
            width: "340px",
            height: "340px",
            borderRadius: "24px",
            border: "1px solid rgba(255,255,255,0.1)",
            overflow: "hidden",
            flexShrink: 0,
            alignSelf: "center",
            background: "rgba(106,168,79,0.06)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={bandName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                fontSize: "96px",
                color: "rgba(106,168,79,0.25)",
                fontFamily: "sans-serif",
                display: "flex",
              }}
            >
              ♪
            </div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
