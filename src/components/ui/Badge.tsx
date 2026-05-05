interface BadgeProps {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral" | "blue" | "orange";
}

const variantStyles: Record<string, React.CSSProperties> = {
  success: { color: "#22c55e", backgroundColor: "rgba(34, 197, 94, 0.10)", border: "1px solid rgba(34, 197, 94, 0.20)" },
  warning: { color: "#f59e0b", backgroundColor: "rgba(245, 158, 11, 0.10)", border: "1px solid rgba(245, 158, 11, 0.20)" },
  danger:  { color: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.10)", border: "1px solid rgba(239, 68, 68, 0.20)" },
  neutral: { color: "#6b7a99", backgroundColor: "rgba(107, 122, 153, 0.10)", border: "1px solid rgba(107, 122, 153, 0.20)" },
  blue:    { color: "#0081f2", backgroundColor: "rgba(0, 129, 242, 0.10)", border: "1px solid rgba(0, 129, 242, 0.20)" },
  orange:  { color: "#ff8400", backgroundColor: "rgba(255, 132, 0, 0.10)", border: "1px solid rgba(255, 132, 0, 0.20)" },
};

export function Badge({ label, variant }: BadgeProps) {
  const style = variantStyles[variant] ?? variantStyles.neutral;
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={style}
    >
      {label}
    </span>
  );
}
