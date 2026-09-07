import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '../layout/Layout';

export function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function TrendIndicator({ value, suffix = '', inverse = false }: { value: number, suffix?: string, inverse?: boolean }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  // Inverse means lower is better (e.g. price dropping is good/green)
  let colorClass = "text-slate-500";
  let bgClass = "bg-slate-100";
  
  if (!isNeutral) {
    if (isPositive) {
      colorClass = inverse ? "text-rose-600" : "text-emerald-600";
      bgClass = inverse ? "bg-rose-50" : "bg-emerald-50";
    } else {
      colorClass = inverse ? "text-emerald-600" : "text-rose-600";
      bgClass = inverse ? "bg-emerald-50" : "bg-rose-50";
    }
  }

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium", colorClass, bgClass)}>
      {isNeutral ? (
        <Minus size={14} />
      ) : isPositive ? (
        <ArrowUpRight size={14} />
      ) : (
        <ArrowDownRight size={14} />
      )}
      {Math.abs(value)}{suffix}
    </span>
  );
}

export function KpiCard({
  title,
  value,
  trend,
  trendLabel,
  inverseTrend = false,
  icon: Icon
}: {
  title: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  inverseTrend?: boolean;
  icon?: React.ElementType;
}) {
  return (
    <Card className="p-5">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm font-medium text-slate-500">{title}</h3>
        {Icon && <Icon size={18} className="text-slate-400" />}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-2xl font-semibold text-slate-800">{value}</div>
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
          {trend !== undefined && <TrendIndicator value={trend} suffix="%" inverse={inverseTrend} />}
          {trendLabel && <span>{trendLabel}</span>}
        </div>
      )}
    </Card>
  );
}

export function ChartCard({ title, subtitle, children, action }: { title: string, subtitle?: string, children: React.ReactNode, action?: React.ReactNode }) {
  return (
    <Card className="flex flex-col">
      <div className="p-5 border-b border-slate-100 flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5 flex-1">
        {children}
      </div>
    </Card>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const isAvailable = status.toLowerCase() === 'available' || status.toLowerCase() === 'operational';
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
      isAvailable 
        ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
        : "bg-slate-50 text-slate-700 border-slate-200"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isAvailable ? "bg-emerald-500" : "bg-slate-400")} />
      {status}
    </span>
  );
}
