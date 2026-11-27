/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "../../packages/ui/src/**/*.{ts,tsx}",
    "../../packages/invitation-engine/src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Nimantro brand
        nimantro: {
          burgundy: "#8B2635",
          gold: "#D6B56D",
          ivory: "#FFF9F1",
          charcoal: "#242124",
          cream: "#EAE1D8",
        },

        // shadcn/ui tokens (CSS variable driven)
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "rgb(var(--card) / <alpha-value>)",
          foreground: "rgb(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "rgb(var(--popover) / <alpha-value>)",
          foreground: "rgb(var(--popover-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "rgb(var(--primary) / <alpha-value>)",
          foreground: "rgb(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "rgb(var(--secondary) / <alpha-value>)",
          foreground: "rgb(var(--secondary-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "rgb(var(--muted) / <alpha-value>)",
          foreground: "rgb(var(--muted-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "rgb(var(--accent) / <alpha-value>)",
          foreground: "rgb(var(--accent-foreground) / <alpha-value>)",
        },
        destructive: {
          DEFAULT: "rgb(var(--destructive) / <alpha-value>)",
          foreground: "rgb(var(--destructive-foreground) / <alpha-value>)",
        },
        border: "rgb(var(--border) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",
        ring: "rgb(var(--ring) / <alpha-value>)",
      },

      fontFamily: {
        "noto-serif-bengali": ["var(--font-noto-serif-bengali)", "serif"],
        "noto-sans-bengali": ["var(--font-noto-sans-bengali)", "sans-serif"],
        "hind-siliguri": ["var(--font-hind-siliguri)", "sans-serif"],
        "anek-bangla": ["var(--font-anek-bangla)", "sans-serif"],
        "playfair": ["var(--font-playfair)", "serif"],
        "lato": ["var(--font-lato)", "sans-serif"],
      },

      borderRadius: {
        sm: "var(--radius-sm, 6px)",
        DEFAULT: "var(--radius, 8px)",
        md: "var(--radius-md, 8px)",
        lg: "var(--radius-lg, 12px)",
        xl: "var(--radius-xl, 16px)",
        "2xl": "20px",
      },

      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
        modal: "var(--shadow-modal)",
      },

      backgroundImage: {
        "gradient-brand":
          "linear-gradient(135deg, #8B2635 0%, #C4425A 50%, #D6B56D 100%)",
        "gradient-ivory":
          "linear-gradient(180deg, #FFF9F1 0%, #F5EDE0 100%)",
        "gradient-celebration":
          "radial-gradient(ellipse at top, #FFF1E6 0%, #FFF9F1 60%)",
      },

      animation: {
        "fade-in": "fadeIn 0.5s ease forwards",
        "fade-up": "fadeUp 0.5s ease forwards",
        "slide-in": "slideIn 0.4s ease forwards",
        "scale-reveal": "scaleReveal 0.5s ease forwards",
        "shimmer": "shimmer 1.5s infinite",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        fadeUp: {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-20px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        scaleReveal: {
          from: { opacity: "0", transform: "scale(0.9)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
