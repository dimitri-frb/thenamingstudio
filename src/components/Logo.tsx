// Brand mark for "the naming studio", an asterisk (the studio motif),
// used in the header, checkout and the generating screen.

export function BrandMark({ className = "h-8 w-8 rounded-lg" }: { className?: string }) {
  return (
    <span className={`grid place-items-center bg-gradient-to-br from-accent to-accent2 text-white shadow-lg shadow-accent2/20 ${className}`}>
      <svg viewBox="0 0 24 24" width="56%" height="56%" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <path d="M12 4.5v15M5.5 8.25l13 7.5M18.5 8.25l-13 7.5" />
      </svg>
    </span>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return <span className={`font-serif text-lg italic tracking-tight ${className}`}>the naming studio</span>;
}
