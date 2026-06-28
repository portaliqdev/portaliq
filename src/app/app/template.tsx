"use client";

/**
 * Next.js re-mounts `template` on every navigation, so this CSS fade-up gives smooth,
 * dependency-free page transitions. Reduced-motion users get an instant render (the
 * animation duration collapses to 0ms via the global prefers-reduced-motion block).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
