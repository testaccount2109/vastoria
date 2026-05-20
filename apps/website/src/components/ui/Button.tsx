import Link from "next/link";
import { cn } from "@/lib/cn";

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
} & (
  | ({ href: string } & React.ComponentProps<typeof Link>)
  | ({ href?: never } & React.ButtonHTMLAttributes<HTMLButtonElement>)
);

export function Button({
  children,
  className,
  variant = "primary",
  size = "md",
  href,
  ...props
}: ButtonProps) {
  const styles = cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
    size === "sm" && "px-3 py-1.5 text-sm",
    size === "md" && "px-4 py-2 text-sm",
    size === "lg" && "px-6 py-3 text-base",
    variant === "primary" &&
      "bg-vast-accent text-white hover:bg-vast-accent-hover",
    variant === "secondary" &&
      "bg-vast-bg-hover text-vast-fg ring-1 ring-vast-border hover:bg-vast-bg-hover/80",
    variant === "ghost" &&
      "text-vast-fg-muted hover:bg-vast-bg-hover hover:text-vast-fg",
    className,
  );

  if (href) {
    return (
      <Link href={href} className={styles} {...(props as object)}>
        {children}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = props as React.ButtonHTMLAttributes<HTMLButtonElement>;

  return (
    <button className={styles} type={type} {...buttonProps}>
      {children}
    </button>
  );
}
