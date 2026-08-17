import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    "bg-primary-800 text-white hover:bg-primary-900 focus-visible:outline-accent-500 shadow-sm",
  secondary:
    "bg-accent-500 text-primary-950 hover:bg-accent-600 focus-visible:outline-primary-800 shadow-sm",
  outline:
    "border border-primary-800 text-primary-800 hover:bg-primary-50 focus-visible:outline-primary-800",
  ghost: "text-primary-800 hover:bg-primary-50",
  danger: "bg-danger text-white hover:bg-red-800",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "text-sm px-3 py-1.5 gap-1.5",
  md: "text-sm px-4 py-2.5 gap-2",
  lg: "text-base px-6 py-3 gap-2",
};

const BASE =
  "inline-flex items-center justify-center rounded-md font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export function buttonClasses(variant: Variant = "primary", size: Size = "md", className = ""): string {
  return [BASE, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className].filter(Boolean).join(" ");
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({ variant = "primary", size = "md", className, ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

interface LinkButtonProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function LinkButton({ href, children, variant = "primary", size = "md", className }: LinkButtonProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
