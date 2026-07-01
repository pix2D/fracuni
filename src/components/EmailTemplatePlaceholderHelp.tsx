import {
  DATE_PLACEHOLDER_TOKENS,
  EMAIL_PLACEHOLDER_TOKENS,
} from "@/lib/placeholders";

const PLACEHOLDER_TOKENS = [
  ...EMAIL_PLACEHOLDER_TOKENS,
  ...DATE_PLACEHOLDER_TOKENS,
];

export function EmailTemplatePlaceholderHelp() {
  return (
    <span className="flex flex-wrap gap-2">
      {PLACEHOLDER_TOKENS.map(({ token, description }) => (
        <span key={token} className="bg-muted px-1.5 py-0.5 font-mono">
          {token} <span className="text-muted-foreground/70">- {description}</span>
        </span>
      ))}
    </span>
  );
}
