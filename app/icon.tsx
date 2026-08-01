import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Drawn as geometry rather than a text glyph so the favicon matches the SVG
 * mark exactly. The old version set a "Z" in system-ui, which resolved to a
 * different typeface on every platform.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <svg width={32} height={32} viewBox="0 0 512 512">
        <rect width="512" height="512" rx="112" fill="#0f2c4d" />
        <path
          d="M140 168 H372 L140 344 H372"
          fill="none"
          stroke="#ffffff"
          strokeWidth="62"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </svg>
    ),
    { ...size }
  );
}
