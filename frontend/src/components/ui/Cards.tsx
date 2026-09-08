import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '../layout/Layout';

export function Card({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("bg-[#101D30] rounded-xl border border-[#24344A] shadow-sm overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function TrendIndicator({ value, suffix = '', inverse = false }: { value: number, suffix?: string, inverse?: boolean }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  
  // Inverse means lower is better (e.g. price dropping is good/green)
  let colorClass = "text-[#A9B7C9]";
  let bgClass = "bg-[#14243A]";
  
  if (!isNeutral) {
    if (isPositive) {
      colorClass = inverse ? "text-rose-400" : "text-emerald-400";
      bgClass = inverse ? "bg-rose-500/10" : "bg-emerald-500/10";
    } else {
      colorClass = inverse ? "text-emerald-400" : "text-rose-400";
      bgClass = inverse ? "bg-emerald-500/10" : "bg-rose-500/10";
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
        <h3 className="text-sm font-medium text-[#A9B7C9]">{title}</h3>
        {Icon && <Icon size={18} className="text-[#4F46E5]" />}
      </div>
      <div className="flex items-baseline gap-2 mt-1">
        <div className="text-2xl font-semibold text-white">{value}</div>
      </div>
      {(trend !== undefined || trendLabel) && (
        <div className="mt-3 flex items-center gap-2 text-sm text-[#718198]">
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
      <div className="p-5 border-b border-[#24344A] flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-[#A9B7C9] mt-0.5">{subtitle}</p>}
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
        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
        : "bg-[#14243A] text-[#A9B7C9] border-[#24344A]"
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", isAvailable ? "bg-emerald-500" : "bg-slate-400")} />
      {status}
    </span>
  );
}
