import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  change: string;
  changeType: "up" | "down" | "neutral";
  icon: LucideIcon;
  iconColor?: string;
}

export function StatCard({ label, value, change, changeType, icon: Icon, iconColor = "#18b8f0" }: StatCardProps) {
  return (
    <div className="bg-[#0c0f15] border border-[#1c2438] rounded-xl p-5 hover:border-[#263050] transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${iconColor}15`, border: `1px solid ${iconColor}28` }}
        >
          <Icon size={16} style={{ color: iconColor }} />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
            changeType === "up"
              ? "bg-[#22c55e]/10 text-[#22c55e]"
              : changeType === "down"
              ? "bg-[#ef4444]/10 text-[#ef4444]"
              : "bg-[#5a6278]/10 text-[#5a6278]"
          }`}
        >
          {changeType === "up" && <TrendingUp size={10} />}
          {changeType === "down" && <TrendingDown size={10} />}
          {change}
        </div>
      </div>
      <div className="text-2xl font-bold text-[#eef1f8] mb-1 tracking-tight">{value}</div>
      <div className="text-xs text-[#5a6278] font-medium">{label}</div>
    </div>
  );
}
