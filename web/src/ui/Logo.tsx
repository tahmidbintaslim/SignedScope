// The lockup: brand mark plus wordmark. The text follows the theme's colors.
export function Logo({ size = 28, wordmark = true }: { size?: number; wordmark?: boolean }) {
  return (
    <span className="ss-logo" style={{ fontSize: size * 0.72 }}>
      <img src="/brand/mark.svg" width={size} height={size} alt={wordmark ? '' : 'SignedScope'} />
      {wordmark && <span className="ss-logo-text">Signed<span>Scope</span></span>}
    </span>
  );
}
