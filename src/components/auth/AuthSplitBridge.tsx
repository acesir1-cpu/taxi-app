/** Subtle warm glow across the split — no stroked paths (avoids dark seam line). */
export function AuthSplitBridge() {
  return (
    <div className="auth-split-bridge" aria-hidden>
      <div className="auth-split-bridge__glow" />
    </div>
  )
}
