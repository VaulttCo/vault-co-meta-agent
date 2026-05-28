interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Micro uppercase label rendered above the title */
  sectionLabel?: string;
  /** Status badge or pill rendered inline with the title */
  badge?: React.ReactNode;
}

export function PageHeader({ title, description, action, sectionLabel, badge }: PageHeaderProps) {
  return (
    <div
      className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6 pb-5 border-b"
      style={{ borderColor: "var(--t-border-nav)" }}
    >
      <div className="min-w-0">
        {sectionLabel && (
          <p className="vc-label mb-1">{sectionLabel}</p>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2
            className="text-[19px] sm:text-[22px] font-bold tracking-wide"
            style={{
              fontFamily: "var(--font-rajdhani), Rajdhani, sans-serif",
              color: "var(--t-text)",
            }}
          >
            {title}
          </h2>
          {badge}
        </div>
        {description && (
          <p className="text-[12px] mt-0.5" style={{ color: "var(--t-muted)" }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}
