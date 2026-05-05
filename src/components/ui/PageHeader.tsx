interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6 pb-5 border-b border-[#1c2438]">
      <div>
        <h2 className="text-lg font-bold text-[#eef1f8] tracking-tight">{title}</h2>
        {description && <p className="text-sm text-[#5a6278] mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
