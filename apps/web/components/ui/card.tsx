import { cn } from "../../lib/utils";

export function Card({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
