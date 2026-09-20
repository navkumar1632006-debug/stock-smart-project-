import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface MetricCardProps {
  title: string;
  icon: React.ReactNode;
  value: React.ReactNode;
  valueColor?: string;
  subtext?: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  icon,
  value,
  valueColor = 'text-slate-900',
  subtext
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase text-slate-500">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        {subtext && (
          <div className="text-xs mt-1 text-slate-500">
            {subtext}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
