import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // IBM Plex Sans: built for data-dense interfaces, with tabular figures
        // that hold a money column and apertures that stay legible in glare.
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Receipt numbers, SKUs and barcodes are machine data — set them as such.
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        biz: {
          // Darkened from #1e3a5f for contrast against the lighter surfaces.
          blue: "#0f2c4d",
          "blue-light": "#1d4f88",
          // Old emerald (#10b981) failed contrast as text on white.
          emerald: "#0f7a52",
          "emerald-dark": "#0a5c3d",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Redefined, not removed: 48 files use these. Big soft blurs read as
        // haze in sunlight and cost GPU on low-end Androids, so both are now
        // crisp edges that define a surface without smearing it.
        glass: "0 1px 2px rgba(15, 44, 77, 0.06), 0 2px 8px rgba(15, 44, 77, 0.05)",
        soft: "0 1px 2px rgba(15, 44, 77, 0.07)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        // Tightened to two stops: the old three-stop blue→emerald ramp put mid
        // tones behind white text that dropped below readable contrast.
        "biz-gradient": "linear-gradient(135deg, #0f2c4d 0%, #1d4f88 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
