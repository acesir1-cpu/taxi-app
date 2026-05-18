/** Subtle route/map decoration for the orange hero panel. */
export function AuthHeroMapDecor() {
  return (
    <div className="auth-hero-map-decor pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <svg
        className="auth-hero-map-decor__svg"
        viewBox="0 0 480 520"
        preserveAspectRatio="xMinYMax slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="auth-hero-map-decor__route auth-hero-map-decor__route--a"
          d="M24 420 C 90 360, 140 300, 200 250 S 300 170, 360 110"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          className="auth-hero-map-decor__route auth-hero-map-decor__route--b"
          d="M60 120 C 130 180, 190 240, 250 300 S 320 380, 380 440"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="6 8"
        />
        <circle cx="200" cy="250" r="5" fill="rgba(255,255,255,0.5)" />
        <circle cx="380" cy="110" r="4" fill="rgba(255,255,255,0.4)" />
        <path
          className="auth-hero-map-decor__car"
          d="M332 96 L348 92 L356 100 L352 112 L328 114 L320 106 Z"
          fill="rgba(255,255,255,0.28)"
        />
      </svg>
    </div>
  )
}
