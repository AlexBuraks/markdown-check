"use client";

import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type ApiResponse = {
  found: boolean;
  reason: string;
  request: {
    url: string;
    userAgent: string;
  };
  response: {
    status: number;
    statusText: string;
    contentType: string | null;
    contentLength: string | null;
    location: string | null;
    xMarkdownTokens: string | null;
    latencyMs: number;
    headers: Record<string, string>;
  };
  markdown: string;
  truncated: boolean;
};

const USER_AGENTS = [
  {
    label: "Browser-like",
    value:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
  },
  {
    label: "Claude-User",
    value: "Claude-User/1.0 (+https://www.anthropic.com)",
  },
  {
    label: "ChatGPT-User",
    value: "ChatGPT-User/1.0 (+https://openai.com/bot)",
  },
  {
    label: "Googlebot",
    value:
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  },
  {
    label: "Custom",
    value: "custom",
  },
];

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--panel)] p-3">
      <p className="text-xs uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-[var(--foreground)]">
        {value || "-"}
      </p>
    </div>
  );
}

export default function MarkdownChecker() {
  const [url, setUrl] = useState("");
  const [agent, setAgent] = useState(USER_AGENTS[0].value);
  const [customAgent, setCustomAgent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ApiResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const resolvedUserAgent = useMemo(() => {
    if (agent === "custom") {
      return customAgent.trim();
    }
    return agent;
  }, [agent, customAgent]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");
    setCopied(false);
    setResult(null);

    try {
      const response = await fetch("/api/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          userAgent: resolvedUserAgent,
        }),
      });

      const data = (await response.json()) as ApiResponse | { error: string; details?: string };
      if (!response.ok || "error" in data) {
        setError(
          "error" in data
            ? `${data.error}${data.details ? ` (${data.details})` : ""}`
            : "Unexpected API error.",
        );
        return;
      }

      setResult(data);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unknown error.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!result?.markdown) return;
    await navigator.clipboard.writeText(result.markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:py-14">
      <section className="rounded-3xl border border-[var(--border)] bg-[color:var(--panel)]/95 p-6 shadow-[0_12px_40px_rgba(23,33,47,0.09)] sm:p-8">
        <p className="inline-flex rounded-full border border-[var(--border)] bg-[#f4efe3] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#7a5a22]">
          Markdown Discovery
        </p>
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">
          Check if a URL serves markdown
        </h1>
        <p className="mt-4 max-w-3xl text-sm text-[var(--muted)] sm:text-base">
          Enter any URL and this tool will request it with{" "}
          <code className="font-mono text-xs">Accept: text/markdown</code>. If the
          server answers with <code className="font-mono text-xs">Content-Type: text/markdown</code>,
          you will see a rendered preview plus response details.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold">Target URL</span>
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              required
              placeholder="https://example.com/blog/post"
              className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d9963b] focus:ring-2 focus:ring-[#eeb86940]"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">User-Agent</span>
              <select
                value={agent}
                onChange={(event) => setAgent(event.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#d9963b] focus:ring-2 focus:ring-[#eeb86940]"
              >
                {USER_AGENTS.map((item) => (
                  <option key={item.label} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Custom User-Agent</span>
              <input
                value={customAgent}
                onChange={(event) => setCustomAgent(event.target.value)}
                disabled={agent !== "custom"}
                placeholder="MyCrawler/1.0"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:bg-[#f3f3ef] focus:border-[#d9963b] focus:ring-2 focus:ring-[#eeb86940]"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center rounded-xl bg-[#183a37] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#22534f] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Checking..." : "Check MD"}
          </button>
        </form>
      </section>

      {error ? (
        <section className="mt-6 rounded-2xl border border-[#efbfca] bg-[#fff5f7] p-4 text-sm text-[var(--danger)]">
          <p className="font-semibold">Request failed</p>
          <p className="mt-1 break-words">{error}</p>
        </section>
      ) : null}

      {result ? (
        <section className="mt-6 space-y-5">
          {!result.found ? (
            <div className="rounded-2xl border border-[#e8dcc5] bg-[#fffaf0] p-5">
              <p className="text-xl font-extrabold text-[#8a5a0a]">Markdown not found</p>
              <p className="mt-2 text-sm text-[var(--muted)]">{result.reason}</p>
            </div>
          ) : null}

          {result.found ? (
            <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-[var(--success)]">Markdown found</h2>
                  <p className="mt-1 text-xs text-[var(--muted)]">{result.reason}</p>
                </div>
                <button
                  onClick={copyMarkdown}
                  type="button"
                  className="rounded-lg border border-[var(--border)] bg-white px-3 py-1 text-xs font-semibold transition hover:bg-[#f8f5eb]"
                >
                  {copied ? "Copied" : "Copy markdown"}
                </button>
              </div>
              <div className="prose-markdown style-github mt-4 max-h-[34rem] overflow-auto text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {result.markdown || "_No markdown body returned._"}
                </ReactMarkdown>
              </div>
              {result.truncated ? (
                <p className="mt-3 text-xs text-[var(--muted)]">
                  Preview truncated to 50,000 characters for performance.
                </p>
              ) : null}
            </article>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DetailItem label="Status" value={`${result.response.status} ${result.response.statusText}`} />
            <DetailItem label="Content-Type" value={result.response.contentType ?? "-"} />
            <DetailItem label="Latency" value={`${result.response.latencyMs} ms`} />
            <DetailItem label="x-markdown-tokens" value={result.response.xMarkdownTokens ?? "-"} />
            <DetailItem label="Content-Length" value={result.response.contentLength ?? "-"} />
            <DetailItem label="Redirect Location" value={result.response.location ?? "-"} />
            <DetailItem label="Requested URL" value={result.request.url} />
            <DetailItem label="Used User-Agent" value={result.request.userAgent} />
          </div>

          <article className="rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="text-lg font-bold">Raw headers</h2>
            <div className="mt-3 max-h-96 overflow-auto rounded-xl border border-[var(--border)] bg-[#11161f] p-4 font-mono text-xs text-[#d7e0ea]">
              {Object.entries(result.response.headers)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => (
                  <p key={key} className="break-all">
                    <span className="text-[#91f2ce]">{key}</span>: {value}
                  </p>
                ))}
            </div>
          </article>
        </section>
      ) : null}

      <section className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <h2 className="text-xl font-bold">How this checker works</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>Requests use `Accept: text/markdown`.</li>
          <li>Redirects are not followed by design.</li>
          <li>`found = true` only when response is 2xx and content type is `text/markdown`.</li>
          <li>Private/local network targets are blocked to prevent abuse.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <h2 className="text-xl font-bold">Why Markdown for Agents matters</h2>
        <p className="mt-3 rounded-xl border border-[#e4dcc8] bg-[#fff8e8] p-4 text-sm text-[#5c4720]">
          “Markdown has quickly become the lingua franca for agents and AI systems as a whole.”
          {" "}
          <a
            href="https://blog.cloudflare.com/markdown-for-agents/"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-[#c08d2f] underline-offset-4"
          >
            Cloudflare
          </a>
        </p>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>Agents parse markdown faster and more reliably than complex HTML layouts.</li>
          <li>Cleaner extraction improves summaries, answers, and tool decisions.</li>
          <li>Structured markdown reduces noise from nav, scripts, and decorative UI elements.</li>
          <li>It gives you a machine-friendly layer without changing your public page design.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <h2 className="text-xl font-bold">Quick manual: how to add it</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            Define what content should be exposed to agents: main text, headings, tables, links,
            and docs-like sections.
          </li>
          <li>
            Configure your stack/CDN to return a markdown version when request header is
            <code className="ml-1 font-mono text-xs">Accept: text/markdown</code>.
          </li>
          <li>
            Return markdown with
            <code className="ml-1 font-mono text-xs">Content-Type: text/markdown</code>.
          </li>
          <li>
            Keep markdown semantically clean: heading hierarchy, short sections, valid links, and
            code fences where needed.
          </li>
          <li>
            Validate using this tool: check status, content type, optional markdown headers, and
            preview quality.
          </li>
        </ol>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Reference implementation and details:
          {" "}
          <a
            href="https://blog.cloudflare.com/markdown-for-agents/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[#184c45] underline underline-offset-4"
          >
            Cloudflare: Markdown for Agents
          </a>
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--panel)] p-6">
        <h2 className="text-xl font-bold">Business benefits</h2>
        <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
          <li>Higher chance your content is accurately used in AI answers and citations.</li>
          <li>Lower parsing friction for crawlers and agent frameworks.</li>
          <li>Better control over what machines consume from each URL.</li>
          <li>Faster experimentation: you can iterate markdown without redesigning frontend pages.</li>
        </ul>
      </section>
    </div>
  );
}
