import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface OperationsGuidanceCardProps {
  badgeVariant: 'default' | 'secondary' | 'outline' | 'destructive' | 'success' | 'warning';
  badgeText: string;
  urgencyText?: string;
  title: string;
  description: React.ReactNode;
  buttonVariant: 'primary' | 'secondary' | 'destructive' | 'ghost' | 'outline';
  buttonClassName?: string;
  buttonText: string;
  onAction: () => void;
}

export const OperationsGuidanceCard: React.FC<OperationsGuidanceCardProps> = ({
  badgeVariant,
  badgeText,
  urgencyText,
  title,
  description,
  buttonVariant,
  buttonClassName,
  buttonText,
  onAction
}) => {
  return (
    <Card className="flex flex-col justify-between">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-3">
          <Badge variant={badgeVariant}>{badgeText}</Badge>
          {urgencyText && <span className="text-xs font-medium text-slate-500">{urgencyText}</span>}
        </div>
        <h4 className="text-sm font-bold text-slate-900 mb-1">{title}</h4>
        <div className="text-xs text-slate-600 leading-relaxed">
          {description}
        </div>
      </CardContent>
      <div className="p-4 pt-0">
        <Button 
          variant={buttonVariant} 
          className={`w-full text-xs ${buttonClassName || ''}`}
          onClick={onAction}
        >
          {buttonText}
        </Button>
      </div>
    </Card>
  );
};
