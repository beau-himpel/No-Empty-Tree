/** The No Empty Tree logo: three tiers and a trunk. */
export function TreeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1.5 16.2 8H7.8L12 1.5Z" />
      <path d="M12 6 17.6 14.2H6.4L12 6Z" />
      <path d="M12 11 19 20H5L12 11Z" />
      <rect x="10.75" y="20" width="2.5" height="2.5" rx="0.5" />
    </svg>
  );
}
