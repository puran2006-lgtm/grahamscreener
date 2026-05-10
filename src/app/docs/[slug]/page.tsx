import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import { listDocs, readDoc } from "@/lib/docs";
import { DocRenderer } from "@/components/docs/doc-renderer";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export default function DocPage({ params }: Props) {
  const docs = listDocs();
  const currentIdx = docs.findIndex((d) => d.slug === params.slug);
  if (currentIdx === -1) {
    const content = readDoc(params.slug);
    if (!content) return notFound();
    // Non-numbered doc (like AUDIT_LOG) — render without sidebar nav
    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to docs
          </Link>
        </div>
        <div className="glass rounded-xl border border-border/60 p-6 lg:p-10">
          <DocRenderer content={content} />
        </div>
      </div>
    );
  }

  const current = docs[currentIdx];
  const content = readDoc(current.slug);
  if (!content) return notFound();

  const prev = currentIdx > 0 ? docs[currentIdx - 1] : null;
  const next = currentIdx < docs.length - 1 ? docs[currentIdx + 1] : null;

  return (
    <div className="flex gap-8">
      {/* Sidebar */}
      <aside className="hidden lg:block w-56 shrink-0 sticky top-24 self-start max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin">
        <div className="flex items-center gap-2 mb-4 px-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <Link href="/docs" className="text-sm font-medium hover:text-primary transition-colors">
            All Docs
          </Link>
        </div>
        <nav className="flex flex-col gap-0.5">
          {docs.map((doc) => (
            <Link
              key={doc.slug}
              href={`/docs/${doc.slug}`}
              className={`rounded-md px-2 py-1.5 text-xs transition-colors ${
                doc.slug === current.slug
                  ? "bg-primary/10 text-foreground ring-1 ring-primary/20 font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <span className="text-muted-foreground/60 mr-1.5">{doc.slug.slice(0, 2)}</span>
              {doc.title}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="mb-4 lg:hidden">
          <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to docs
          </Link>
        </div>

        <div className="glass rounded-xl border border-border/60 p-6 lg:p-10">
          <Badge variant="outline" className="mb-4 text-[10px]">
            {current.slug.slice(0, 2)} — {current.title}
          </Badge>
          <DocRenderer content={content} />
        </div>

        {/* Prev / Next */}
        <div className="flex items-center justify-between mt-6">
          {prev ? (
            <Link href={`/docs/${prev.slug}`}>
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                {prev.title}
              </Button>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link href={`/docs/${next.slug}`}>
              <Button variant="outline" size="sm">
                {next.title}
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
