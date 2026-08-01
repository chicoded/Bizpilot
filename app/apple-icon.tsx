import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * iOS applies its own rounded mask, so the field is drawn square and full
 * bleed — a pre-rounded corner would show a dark halo inside the mask.
 */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <svg width={180} height={180} viewBox="0 0 512 512">
        <rect width="512" height="512" fill="#0f2c4d" />
        <path
          d="M156 186 H356 L156 326 H356"
          fill="none"
          stroke="#ffffff"
          strokeWidth="50"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </svg>
    ),
    { ...size }
  );
}
