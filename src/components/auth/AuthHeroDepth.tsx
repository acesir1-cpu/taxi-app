/** Soft radial glows for depth on the orange hero panel. */
export function AuthHeroDepth() {
  return (
    <div className="auth-hero-depth" aria-hidden>
      <div className="auth-hero-depth__glow auth-hero-depth__glow--top" />
      <div className="auth-hero-depth__glow auth-hero-depth__glow--preview" />
    </div>
  )
}
