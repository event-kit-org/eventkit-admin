import type { ReactNode } from 'react';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

/** A list with nothing in it yet. */
export function EmptyState({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="border border-dashed">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {children && <EmptyDescription>{children}</EmptyDescription>}
      </EmptyHeader>
    </Empty>
  );
}

function Busy({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={className} aria-busy="true">
      <span className="sr-only">Loading…</span>
      {children}
    </div>
  );
}

/** A grid of cards with a heading, a few lines and a footer. */
export function CardsSkeleton({
  count = 2,
  className = 'lg:grid-cols-2',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <Busy className={cn('grid gap-4', className)}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="grid gap-4 rounded-xl border bg-card p-4">
          <div className="grid gap-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </Busy>
  );
}

/** A bordered table: a header strip and rows of cells. */
export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <Busy className="overflow-hidden rounded-lg border">
      <Skeleton className="h-10 rounded-none" />
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 border-t p-3">
          {Array.from({ length: cols }, (_, c) => (
            <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-40')} />
          ))}
        </div>
      ))}
    </Busy>
  );
}
