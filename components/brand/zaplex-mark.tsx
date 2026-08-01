import { cn } from "@/lib/utils";

/**
 * The Zaplex mark, as geometry.
 *
 * Single source for the logo shape so the nav, the favicon and the installed
 * app icon cannot drift apart. Previously each surface drew its own "Z" as a
 * text glyph, which resolved to a different typeface on every platform.
 */
export function ZaplexMark({
  className,
  title = "Zaplex",
}: {
  className?: string;
  /** Pass null when the mark sits next to the wordmark and would repeat it. */
  title?: string | null;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn("h-10 w-10", className)}
      role={title ? "img" : "presentation"}
      aria-label={title ?? undefined}
      aria-hidden={title ? undefined : true}
    >
      <rect width="512" height="512" rx="112" className="fill-biz-blue" />
      <path
        d="M140 168 H372 L140 344 H372"
        fill="none"
        stroke="currentColor"
        strokeWidth="54"
        strokeLinecap="butt"
        strokeLinejoin="miter"
        className="text-white"
      />
    </svg>
  );
}
