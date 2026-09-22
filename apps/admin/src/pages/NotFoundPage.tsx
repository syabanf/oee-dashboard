import { Link } from 'react-router';
import { Compass } from 'lucide-react';
import { Button, Card, EmptyState } from '@oee/ui';

export const NotFoundPage = () => (
  <Card><EmptyState icon={<Compass />} title="Page not found" description="This address does not match any screen." action={<Button asChild><Link to="/">Control Tower</Link></Button>} /></Card>
);
