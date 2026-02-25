import type { Metadata } from "next";
import MarkdownChecker from "@/components/markdown-checker";

export const metadata: Metadata = {
  title: "Markdown Presence Checker | Verify text/markdown support",
  description:
    "Public tool to test if a URL serves Markdown when requested with Accept: text/markdown.",
};

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <MarkdownChecker />
    </main>
  );
}
