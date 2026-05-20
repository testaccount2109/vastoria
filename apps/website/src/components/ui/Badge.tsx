import { cn } from "@/lib/cn";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "accent" | "green";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        variant === "default" &&
          "bg-vast-bg-hover text-vast-fg-muted ring-vast-border",
        variant === "accent" &&
          "bg-vast-accent/15 text-vast-accent ring-vast-accent/30",
        variant === "green" &&
          "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
        className,
      )}
    >
      {children}
    </span>
  );
}
