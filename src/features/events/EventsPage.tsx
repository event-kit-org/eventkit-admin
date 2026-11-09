import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router';
import { ErrorAlert } from '@/components/ErrorAlert';
import { FilterMenu } from '@/components/FilterMenu';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState, TableSkeleton } from '@/components/PageState';
import { Pager, usePage } from '@/components/Pager';
import { SearchInput } from '@/components/SearchInput';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCrumbs } from '@/components/crumbs';
import { useListFilter } from '@/hooks/useListFilter';
import { useSearchParam } from '@/hooks/useSearchParam';
import { formatDateIST } from '@/lib/datetime';
import { type EventSummary, FEATURES, featureLabel, useEvents } from './queries';

const eventText = (e: EventSummary) => [e.name, e.hostedBy, e.venue, e.owner.name, e.owner.email];

const FILTERS = [
  ['', 'All events'],
  ...FEATURES.map((f) => [f.value, `With ${f.label.toLowerCase()}`] as const),
  ['none', 'No features on'],
] as const;

/** Every event on the server, newest first. A row opens the event. */
export function EventsPage() {
  useCrumbs();
  const navigate = useNavigate();
  const events = useEvents();
  const [filter, setFilter] = useSearchParam('feature', '');
  const [query, setQuery] = useSearchParam('q', '');
  const shown = useMemo(
    () =>
      (events.data ?? []).filter((e) => {
        const on = e.features.filter((f) => f.enabled).map((f) => f.feature as string);
        if (filter === 'none') return on.length === 0;
        return !filter || on.includes(filter);
      }),
    [events.data, filter],
  );
  const search = useListFilter(shown, eventText, [query, setQuery]);
  const page = usePage(search.filtered);
  const all = events.data ?? [];

  return (
    <div className="grid gap-4">
      <PageHeader
        title="Events"
        description="Every event on eventKit. Open one to switch its features on or off."
      />
      {all.length > 0 && (
        <div className="flex min-w-0 items-center gap-2">
          <SearchInput
            label="Search events"
            placeholder="Event, host or owner"
            className="min-w-0 flex-1 sm:w-80 sm:flex-none"
            value={search.query}
            onChange={search.setQuery}
          />
          <FilterMenu value={filter} onChange={setFilter} options={FILTERS} fallback="" />
        </div>
      )}
      {events.data && all.length > 0 && (
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {search.filtered.length === all.length
            ? `${all.length} ${all.length === 1 ? 'event' : 'events'}`
            : `${search.filtered.length} of ${all.length} events`}
        </p>
      )}
      <ErrorAlert error={events.error} />
      {events.isPending && <TableSkeleton cols={4} />}
      {events.data && search.filtered.length === 0 && (
        <EmptyState
          icon={CalendarDays}
          title={all.length === 0 ? 'No events yet.' : 'No event matches.'}
        />
      )}
      {page.items.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <Table aria-label="Events">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead className="hidden lg:table-cell">Owner</TableHead>
                <TableHead className="hidden sm:table-cell">Dates</TableHead>
                <TableHead className="hidden text-right md:table-cell">People</TableHead>
                <TableHead>Features</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {page.items.map((e) => {
                const on = e.features.filter((f) => f.enabled);
                return (
                  <TableRow
                    key={e.id}
                    className="cursor-pointer"
                    onClick={(ev) => {
                      if ((ev.target as HTMLElement).closest('a')) return;
                      void navigate(`/events/${e.id}`);
                    }}
                  >
                    <TableCell className="whitespace-normal">
                      <Link
                        to={`/events/${e.id}`}
                        className="font-medium wrap-anywhere hover:underline"
                      >
                        {e.name}
                      </Link>
                      <div className="text-xs text-muted-foreground wrap-anywhere">
                        {e.hostedBy}
                        <span className="lg:hidden"> · {e.owner.email}</span>
                      </div>
                      <div className="text-xs text-muted-foreground sm:hidden">
                        {formatDateIST(e.startAt)}
                      </div>
                    </TableCell>
                    <TableCell className="hidden whitespace-normal lg:table-cell">
                      <div className="wrap-anywhere">{e.owner.name}</div>
                      <div className="text-xs break-all text-muted-foreground">{e.owner.email}</div>
                    </TableCell>
                    <TableCell className="hidden whitespace-normal text-muted-foreground sm:table-cell">
                      {formatDateIST(e.startAt)}
                    </TableCell>
                    <TableCell className="hidden text-right tabular-nums md:table-cell">
                      {e.people}
                      <div className="text-xs text-muted-foreground">
                        {e.teams} {e.teams === 1 ? 'team' : 'teams'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {on.length === 0 ? (
                        <span className="text-sm text-muted-foreground">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {on.map((f) => (
                            <Badge key={f.feature} variant="secondary">
                              {featureLabel(f.feature)}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager {...page} />
    </div>
  );
}
