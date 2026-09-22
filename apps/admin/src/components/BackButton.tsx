import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Button } from '@oee/ui';

/**
 * Goes back to the page the reader came from. A page opened from a shared link or a fresh tab has no
 * history inside the app, so it lands on `fallback` instead.
 */
export function BackButton({ fallback, label = 'Back' }: { fallback: string; label?: string }) {
  const navigate = useNavigate();
  const hasHistory = typeof window !== 'undefined' && window.history.state?.idx > 0;
  return (
    <Button variant="ghost" onClick={() => (hasHistory ? navigate(-1) : navigate(fallback))}>
      <ArrowLeft />
      {label}
    </Button>
  );
}
