export function randomDelayMs(): number {
  return 300 + Math.floor(Math.random() * 1200)
}

export function delay(ms?: number): Promise<void> {
  const d = ms ?? randomDelayMs()
  return new Promise((r) => setTimeout(r, d))
}
