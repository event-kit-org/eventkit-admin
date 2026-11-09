import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';

export function NotFoundPage() {
  usePageTitle('Not found');
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-4 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted-foreground">There's nothing at this address.</p>
      <Button asChild>
        <Link to="/">All events</Link>
      </Button>
    </main>
  );
}
