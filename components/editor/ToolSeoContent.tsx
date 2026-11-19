import Link from "next/link";
import { ArrowRight, CheckCircle2, HelpCircle, Lightbulb, ListOrdered, ShieldCheck, Wrench } from "lucide-react";
import type { EditorTool } from "@/lib/editor/tools";

/** Crawlable, task-specific guide rendered under the editor on /tools/[slug]. */
export default function ToolSeoContent({ tool, related }: { tool: EditorTool; related: EditorTool[] }) {
  return (
    <section className="w-full max-w-full overflow-x-hidden flex justify-center border-t border-border/40 bg-card/20 py-12">
      <div className="w-full max-w-full min-w-0 space-y-12 px-4 lg:max-w-[85%]">
        <div className="max-w-3xl space-y-4">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{tool.name}: free, private, in your browser</h2>
          {tool.intro.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-muted-foreground sm:text-base">
              {p}
            </p>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">How to {tool.name.toLowerCase()} online</h2>
            </div>
            <ol className="space-y-3">
              {tool.steps.map((step, i) => (
                <li key={step.name} id={`step-${i + 1}`} className="flex gap-3 rounded-2xl border border-border/50 bg-card/40 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold">{step.name}</h3>
                    <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" />
              <h2 className="text-xl font-bold tracking-tight">Tips for better results</h2>
            </div>
            <ul className="space-y-2.5">
              {tool.tips.map((tip) => (
                <li key={tip} className="flex gap-2.5 text-sm leading-relaxed text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <div className="flex gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-500" />
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Your videos are processed on your own device with WebCodecs. Nothing is uploaded unless you choose
                to publish to BuzzClips, and exports never carry a watermark.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight">{tool.name}: frequently asked questions</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {tool.faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-2xl border border-border/50 bg-card/50 p-4 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm font-semibold">
                  <h3>{faq.question}</h3>
                  <span className="shrink-0 text-primary transition group-open:-rotate-180">▼</span>
                </summary>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground sm:text-sm">{faq.answer}</p>
              </details>
            ))}
          </div>
        </div>

        {related.length > 0 && (
          <nav aria-label="Related video tools" className="space-y-4">
            <div className="flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight">Related free video tools</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/tools/${r.slug}`}
                  className="group rounded-2xl border border-border/50 bg-card/40 p-4 transition-colors hover:border-primary/50"
                >
                  <span className="flex items-center justify-between text-sm font-semibold">
                    {r.name}
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{r.tagline}</span>
                </Link>
              ))}
            </div>
            <p className="text-sm">
              <Link href="/tools" className="font-medium text-primary hover:underline">
                See all free video tools
              </Link>{" "}
              <span className="text-muted-foreground">or open the</span>{" "}
              <Link href="/" className="font-medium text-primary hover:underline">
                full online video editor
              </Link>
              .
            </p>
          </nav>
        )}
      </div>
    </section>
  );
}
