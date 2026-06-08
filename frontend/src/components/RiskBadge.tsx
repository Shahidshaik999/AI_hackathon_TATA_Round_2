interface RiskBadgeProps {
  level: string;
  size?: 'sm' | 'md';
}

export default function RiskBadge({ level, size = 'sm' }: RiskBadgeProps) {
  const classes: Record<string, string> = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
    active: 'badge-high',
    acknowledged: 'badge-medium',
    resolved: 'badge-low',
    immediate: 'badge-critical',
    within_week: 'badge-high',
    planned: 'badge-medium',
  };

  const labels: Record<string, string> = {
    critical: 'Critical',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
    active: 'Active',
    acknowledged: 'Acknowledged',
    resolved: 'Resolved',
    immediate: 'Immediate',
    within_week: 'Within Week',
    planned: 'Planned',
  };

  const dots: Record<string, string> = {
    critical: 'bg-red-500',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
    active: 'bg-red-500',
    acknowledged: 'bg-yellow-500',
    resolved: 'bg-green-500',
    immediate: 'bg-red-500',
    within_week: 'bg-orange-500',
    planned: 'bg-blue-500',
  };

  const key = level?.toLowerCase() || 'medium';
  const cls = classes[key] || 'badge-medium';
  const label = labels[key] || level;
  const dot = dots[key] || 'bg-yellow-500';

  return (
    <span className={`inline-flex items-center gap-1.5 ${cls} ${size === 'md' ? 'text-sm px-3 py-1' : ''}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {label}
    </span>
  );
}
