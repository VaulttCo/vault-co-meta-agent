interface BadgeProps {
  label: string;
  variant: "success" | "warning" | "danger" | "neutral" | "blue" | "orange";
}

const variants = {
  success: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  warning: "bg-[#f59e0b]/10 text-[#f59e0b] border-[#f59e0b]/20",
  danger: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
  neutral: "bg-[#5a6278]/10 text-[#5a6278] border-[#5a6278]/20",
  blue: "bg-[#18b8f0]/10 text-[#18b8f0] border-[#18b8f0]/20",
  orange: "bg-[#f07820]/10 text-[#f07820] border-[#f07820]/20",
  // legacy alias
  gold: "bg-[#f07820]/10 text-[#f07820] border-[#f07820]/20",
};

export function Badge({ label, variant }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variants[variant as keyof typeof variants]}`}>
      {label}
    </span>
  );
}
