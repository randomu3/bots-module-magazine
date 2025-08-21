import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface ErrorMessageProps {
  message: string;
  className?: string;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, className }) => {
  return (
    <div className={cn(
      'flex items-center gap-2 text-red-600 dark:text-red-400 text-sm',
      className
    )}>
      <AlertCircle className="h-4 w-4 flex-shrink-0" />
      <span>{message}</span>
    </div>
  );
};