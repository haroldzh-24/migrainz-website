"use client";

/**
 * Inline script that runs while the browser parses the server HTML. A client component so React renders it as
 * text/plain on the client (no "script tag while rendering" warning on soft navigations). See the Next.js guide
 * "preventing flash before hydration".
 */
export default function InlineScript({ code }: { code: string }) {
  return <script type={typeof window === "undefined" ? "text/javascript" : "text/plain"} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: code }} />;
}
