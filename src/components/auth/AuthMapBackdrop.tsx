/** Decorative map routes + pins for auth right panel (non-interactive). */
export function AuthMapBackdrop() {
  return (
    <div
      className="auth-map-backdrop pointer-events-none absolute inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      <svg
        className="auth-map-backdrop-svg absolute inset-0 h-full w-full"
        viewBox="0 0 800 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          className="auth-map-route auth-map-route--a"
          d="M80 720 C 180 640, 260 560, 340 480 S 520 360, 620 280 S 700 200, 760 140"
          stroke="#F5A400"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          className="auth-map-route auth-map-route--b"
          d="M120 180 C 220 240, 300 320, 380 400 S 500 520, 580 600 S 660 680, 720 760"
          stroke="#F7B731"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="8 10"
        />
        <circle className="auth-map-pin" cx="340" cy="480" r="10" fill="#F5A400" />
        <circle className="auth-map-pin auth-map-pin--b" cx="620" cy="280" r="8" fill="#F7B731" />
        <circle className="auth-map-pin auth-map-pin--c" cx="580" cy="600" r="7" fill="#D97706" />
        <path
          className="auth-map-pin-tail"
          d="M340 490 L340 508 L332 500 Z"
          fill="#F5A400"
        />
        <path
          className="auth-map-pin-tail"
          d="M620 288 L620 304 L613 297 Z"
          fill="#F7B731"
        />
      </svg>
    </div>
  )
}
