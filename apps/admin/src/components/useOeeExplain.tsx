import * as React from 'react';
import { useNavigate } from 'react-router';
import { cn } from '@oee/ui';

/** Opens the "how is this calculated" page for any set of machines. */
export function useOeeExplain() {
  const navigate = useNavigate();
  return (scope: string, machineIds: string[]) => navigate(`/oee/explain?scope=${encodeURIComponent(scope)}&m=${machineIds.join(',')}`);
}

/** Wraps an OEE figure so it reads as tappable everywhere: dotted underline, same hint. */
export const ExplainButton = ({ onClick, className, children }: { onClick: () => void; className?: string; children: React.ReactNode }) => (
  <button type="button" title="How is this calculated?" onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={cn('cursor-help rounded-md underline decoration-dotted decoration-1 underline-offset-4 hover:decoration-solid', className)}>
    {children}
  </button>
);
