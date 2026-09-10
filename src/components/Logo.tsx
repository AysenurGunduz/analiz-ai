/**
 * Pusula markası — minimal pusula (iğne + çevre) işareti.
 * `currentColor` ile çalışır; pivot noktası `var(--bg)` ile "delik" hissi verir,
 * yani kullanıldığı zeminin rengini otomatik alır (header'daki yarı şeffaf zemin dahil).
 */
export function CompassMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.3"
        opacity="0.35"
      />
      <polygon points="12,4 15.2,12 8.8,12" fill="currentColor" />
      <polygon points="12,20 15.2,12 8.8,12" fill="currentColor" opacity="0.4" />
      <circle cx="12" cy="12" r="1.4" fill="var(--bg)" />
    </svg>
  );
}
