import Link from "next/link";

/**
 * Visible, server-rendered H1 strip above the editor. Kept to a fixed 40px so the
 * editor (which sizes itself to the viewport) can subtract it via --editor-offset.
 */
export default function EditorHeading({
  title,
  tagline,
  breadcrumb,
}: {
  title: string;
  tagline?: string;
  breadcrumb?: { name: string; href: string }[];
}) {
  return (
    <div className="flex h-10 items-center gap-3 overflow-hidden border-b border-border/50 bg-background/70 px-3 sm:px-4">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="hidden shrink-0 text-xs text-muted-foreground md:block">
          <ol className="flex items-center gap-1">
            {breadcrumb.map((b) => (
              <li key={b.href} className="flex items-center gap-1">
                <Link href={b.href} className="hover:text-foreground hover:underline">
                  {b.name}
                </Link>
                <span aria-hidden>/</span>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <h1 className="truncate text-sm font-bold tracking-tight sm:text-base">{title}</h1>
      {tagline && <p className="hidden truncate text-xs text-muted-foreground lg:block">{tagline}</p>}
    </div>
  );
}
