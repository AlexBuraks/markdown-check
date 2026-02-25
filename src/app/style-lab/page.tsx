import type { Metadata } from "next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const metadata: Metadata = {
  title: "Markdown Style Lab",
  description: "Visual style variants for markdown preview.",
};

const SAMPLE_MARKDOWN = `# Markdown Preview Example

This is a realistic sample to compare styles quickly.

## Why this matters

- Better readability = more trust
- Cleaner hierarchy = faster scanning
- Nice code blocks = better tech feel

## Feature checklist

1. Render headings, lists, links, tables, and code
2. Keep spacing balanced on mobile
3. Make important content easy to spot

> This quote block should be easy to read and visually distinct.

### Example table

| Signal | Value | Notes |
|---|---:|---|
| Content-Type | text/markdown | Strong positive signal |
| Status | 200 | Must be 2xx |
| Latency | 342ms | Informational |

### Example code

\`\`\`ts
async function checkMarkdown(url: string) {
  const response = await fetch(url, {
    headers: { Accept: "text/markdown" },
    redirect: "manual",
  });

  const contentType = response.headers.get("content-type") ?? "";
  return response.ok && contentType.includes("text/markdown");
}
\`\`\`

### Link

Read more: [Cloudflare announcement](https://blog.cloudflare.com/markdown-for-agents/)
`;

function Preview({
  variant,
  title,
  subtitle,
}: {
  variant: string;
  title: string;
  subtitle: string;
}) {
  return (
    <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
      <div className={`style-lab-preview ${variant}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{SAMPLE_MARKDOWN}</ReactMarkdown>
      </div>
    </section>
  );
}

function SplitView() {
  return (
    <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-bold">4. Split View</h2>
        <p className="text-sm text-[var(--muted)]">
          Left = rendered markdown, right = raw markdown.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="style-lab-preview style-clean rounded-xl border border-[var(--border)] p-4">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{SAMPLE_MARKDOWN}</ReactMarkdown>
        </div>
        <pre className="max-h-[32rem] overflow-auto rounded-xl border border-[var(--border)] bg-[#111827] p-4 text-xs text-[#d4deea]">
          <code>{SAMPLE_MARKDOWN}</code>
        </pre>
      </div>
    </section>
  );
}

function FocusMode() {
  return (
    <section className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5 sm:p-7">
      <div className="mb-5">
        <h2 className="text-xl font-bold">5. Focus Mode</h2>
        <p className="text-sm text-[var(--muted)]">
          Large reading container with reduced visual noise.
        </p>
      </div>
      <div className="mx-auto max-w-3xl rounded-2xl border border-[var(--border)] bg-white p-8 shadow-[0_20px_40px_rgba(0,0,0,0.08)]">
        <div className="style-lab-preview style-editorial">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{SAMPLE_MARKDOWN}</ReactMarkdown>
        </div>
      </div>
    </section>
  );
}

export default function StyleLabPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Markdown Style Lab</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Compare all visual approaches. Pick one, and I will apply it to the main checker page.
        </p>

        <div className="mt-8">
          <Preview
            variant="style-clean"
            title="1. Clean Docs"
            subtitle="Neutral, readable, low-risk visual style."
          />
          <Preview
            variant="style-github"
            title="2. GitHub-like"
            subtitle="Familiar README look and spacing."
          />
          <Preview
            variant="style-editorial"
            title="3. Editorial / Notion-like"
            subtitle="Softer typography, more content-first vibe."
          />
          <SplitView />
          <FocusMode />
          <Preview
            variant="style-toc"
            title="6. Section Navigator"
            subtitle="Simulated sidebar feel with stronger heading hierarchy."
          />
          <Preview
            variant="style-syntax"
            title="7. Syntax-first"
            subtitle="High contrast code and technical visual accents."
          />
          <Preview
            variant="style-brand"
            title="8. Brand Card"
            subtitle="More product personality and colorful accents."
          />
        </div>
      </div>
    </main>
  );
}
