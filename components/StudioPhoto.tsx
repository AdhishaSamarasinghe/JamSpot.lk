/* eslint-disable @next/next/no-img-element */

/** A studio photo, or a placeholder when the studio has none. */
export default function StudioPhoto({
  src,
  alt,
  className = "",
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={`grid place-items-center overflow-hidden bg-gradient-to-br from-brand-100 to-brand-200 text-3xl text-brand-600 ${className}`}
        aria-label={alt}
      >
        ♪
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}
