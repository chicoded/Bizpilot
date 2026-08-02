import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * A marketing illustration that sits directly on the page, with no frame.
 *
 * The source art is black-and-blue line work baked onto an opaque white
 * rectangle, so it cannot simply be dropped onto a themed page — you get a
 * visible white box. There is no alpha channel to lean on either, so the
 * background is removed with blend modes instead of by editing the files:
 *
 *   light — `multiply` against a pale page leaves white untouched and keeps
 *           every dark stroke, so the rectangle disappears.
 *
 *   dark  — `screen` does the same for black, but the art's background is
 *           white and its strokes are black, i.e. exactly backwards. So it is
 *           inverted first: white ground becomes black and vanishes under
 *           `screen`, while black strokes become white and stay legible.
 *           `hue-rotate(180deg)` undoes the hue flip that `invert` inflicts on
 *           the blues, which are the brand colour and the point of the art.
 *
 * The alternative was exporting transparent PNGs, which would have meant
 * shipping larger files and still needing the dark-mode inversion.
 */
export function LandingIllustration({
  src,
  alt,
  width,
  height,
  priority = false,
  className,
  sizes = "(min-width: 1024px) 960px, 100vw",
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={cn(
        "h-auto w-full",
        // Written as one arbitrary filter rather than `dark:invert
        // dark:hue-rotate-180`, because Tailwind composes its filter utilities
        // in a fixed order that puts hue-rotate first — which inverts the
        // wrong way round and turns the blues muddy.
        "mix-blend-multiply dark:mix-blend-screen dark:[filter:invert(1)_hue-rotate(180deg)]",
        className
      )}
    />
  );
}
