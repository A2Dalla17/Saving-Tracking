import { formatCurrency } from "@/lib/calculations";
import { cn } from "@/lib/utils";

interface CurrencyDisplayProps {
  amount: number;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-lg",
  lg: "text-2xl",
  xl: "text-4xl",
};

export function CurrencyDisplay({ amount, className, size = "md" }: CurrencyDisplayProps) {
  return (
    <span className={cn("font-mono-currency font-semibold tracking-tight", sizeClasses[size], className)}>
      {formatCurrency(amount)}
    </span>
  );
}
