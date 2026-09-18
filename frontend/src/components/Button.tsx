import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export function Button({ variant = "primary", className = "", ...props }: ButtonProps) {
  const base =
    "min-h-[48px] rounded-lg px-6 font-label-md text-label-md font-semibold transition-opacity disabled:opacity-50 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-primary text-on-primary hover:opacity-90"
      : "bg-surface-container text-on-surface border border-outline-variant hover:bg-surface-container-high";
  return <button className={`${base} ${styles} ${className}`} {...props} />;
}

export function ErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="rounded-lg border border-error-container bg-error-container px-4 py-3 font-body-md text-body-md text-on-error-container">
      {message}
    </div>
  );
}
