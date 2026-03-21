import { ImageResponse } from "next/og";

export const runtime     = "edge";
export const alt         = "pokerecipe.book — community-powered Poke automation recipes";
export const size        = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  // Load Inter from the official rsms.me CDN (maintained by the Inter creator)
  const [regular, semibold] = await Promise.all([
    fetch("https://rsms.me/inter/font-files/Inter-Regular.woff2").then((r) => r.arrayBuffer()),
    fetch("https://rsms.me/inter/font-files/Inter-SemiBold.woff2").then((r) => r.arrayBuffer()),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#ffffff",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "0 108px",
          fontFamily: "Inter",
        }}
      >
        {/* Community label */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 400,
            color: "#aaaaaa",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            marginBottom: 36,
          }}
        >
          Community
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 82,
            fontWeight: 600,
            color: "#0a0a0a",
            letterSpacing: "-0.04em",
            lineHeight: 1.04,
            marginBottom: 36,
            display: "flex",
          }}
        >
          pokerecipe.book
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: 23,
            fontWeight: 400,
            color: "#777777",
            lineHeight: 1.55,
            maxWidth: 680,
          }}
        >
          The community-powered index for Poke automation recipes.
          Discover, share, and track the most useful automations.
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Inter", data: regular,  weight: 400 },
        { name: "Inter", data: semibold, weight: 600 },
      ],
    }
  );
}
