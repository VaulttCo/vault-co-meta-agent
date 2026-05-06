interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, action }: PageHeaderProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 pb-5 border-b"
      style={{ borderColor: "rgba(0, 129, 242, 0.12)" }}
    >
      <div className="min-w-0">
        <h2
          className="text-[18px] sm:text-[20px] font-bold tracking-wide"
          style={{
            fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
            color: "#f8f8f7",
          }}
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: "#6b7a99" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
