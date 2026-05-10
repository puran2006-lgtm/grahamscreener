import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ArrowRight } from "lucide-react";
import { listDocs } from "@/lib/docs";

export const dynamic = "force-dynamic";

export default function DocsIndexPage() {
  const docs = listDocs();

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 glass p-8">
        <div className="absolute -top-32 -right-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <Badge variant="default" className="mb-4">
            <BookOpen className="h-3 w-3 mr-1" /> Documentation
          </Badge>
          <h1 className="text-3xl font-semibold tracking-tight">
            GrahamScreener Docs
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Everything you need to set up, run, and understand GrahamScreener —
            from quick-start to architecture deep-dives and valuation formula
            references.
          </p>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <Link key={doc.slug} href={`/docs/${doc.slug}`} className="group">
            <Card className="glass h-full transition-all hover:border-primary/40 hover:translate-y-[-1px]">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">
                    {doc.slug.slice(0, 2)}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </CardHeader>
              <CardContent>
                <CardTitle className="text-sm">{doc.title}</CardTitle>
                {doc.description && (
                  <CardDescription className="mt-1 text-xs">
                    {doc.description}
                  </CardDescription>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
