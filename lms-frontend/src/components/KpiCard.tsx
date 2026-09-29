import type { ReactNode } from "react";

export function KpiCard({ label, value, icon }: { label: string; value: number | string; icon: ReactNode }) {
  return (
    <div className="kpi-card">
      <div className="kpi-card-label">
        <span className="kpi-card-icon">{icon}</span>
        {label}
      </div>
      <div className="kpi-card-value">{value}</div>
    </div>
  );
}
