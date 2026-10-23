"use client";

import { useState } from "react";
import { SPONSOR_EMAIL as EMAIL } from "@/lib/links";

// Copies the sponsorship address instead of launching a mail app (many
// visitors use webmail, so mailto: just opens nothing useful). Keeps the
// mailto: href as the fallback when the clipboard API is unavailable.
export default function CopyEmail({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <a
      className={className}
      href={`mailto:${EMAIL}`}
      onClick={(e) => {
        if (!navigator.clipboard) return;
        e.preventDefault();
        navigator.clipboard.writeText(EMAIL).then(
          () => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          },
          () => (location.href = `mailto:${EMAIL}`),
        );
      }}
    >
      <span aria-live="polite">{copied ? "Copied to clipboard!" : children}</span>
    </a>
  );
}
