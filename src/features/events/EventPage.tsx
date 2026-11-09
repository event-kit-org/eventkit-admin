import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarDays, ExternalLink, Trash2 } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { unwrap } from '@/api/client';
import { useApi } from '@/auth/context';
import { ConfirmDialog } from '@/components/ConfirmButton';
import { ErrorAlert } from '@/components/ErrorAlert';
import { PageHeader } from '@/components/PageHeader';
import { CardsSkeleton, EmptyState } from '@/components/PageState';
import { useCrumbs } from '@/components/crumbs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateIST, formatIST } from '@/lib/datetime';
import { formatMoney } from '@/lib/money';
import { type EventOverview, type Feature, FEATURES, useEventOverview } from './queries';

/** One event, read only, with its feature switches and deleting it. */
export function EventPage() {
  const { eventId = '' } = useParams();
  const overview = useEventOverview(eventId);
  const o = overview.data;
  useCrumbs({ label: o?.event.name ?? 'Event' });

  return (
    <div className="grid gap-6">
      <Link
        to="/"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:underline"
      >
        <ArrowLeft className="size-4" aria-hidden /> All events
      </Link>
      <ErrorAlert error={overview.error} />
      {overview.isPending && <CardsSkeleton />}
      {o && (
        <>
          <PageHeader
            title={o.event.name}
            description={`${o.event.hostedBy} · ${o.event.venue} · ${formatDateIST(o.event.startAt)} – ${formatDateIST(o.event.endAt)}`}
          >
            {o.event.portalUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={o.event.portalUrl} target="_blank" rel="noreferrer">
                  <ExternalLink aria-hidden /> Portal
                </a>
              </Button>
            )}
          </PageHeader>
          <FeaturesCard overview={o} />
          <Counts overview={o} />
          <div className="grid gap-6 lg:grid-cols-2">
            <DetailsCard overview={o} />
            <OrganisersCard overview={o} />
          </div>
          <DangerZone overview={o} />
        </>
      )}
      {overview.isError && !o && (
        <EmptyState icon={CalendarDays} title="Event not found">
          It may have been deleted.
        </EmptyState>
      )}
    </div>
  );
}

/** Only the platform admin switches features. Switching one off asks first. */
function FeaturesCard({ overview }: { overview: EventOverview }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const eventId = overview.event.id;
  const [turningOff, setTurningOff] = useState<Feature | null>(null);
  const toggle = useMutation({
    mutationFn: ({ feature, enabled }: { feature: Feature; enabled: boolean }) =>
      unwrap(
        api.PUT('/v1/platform/events/{eventId}/features/{feature}', {
          params: { path: { eventId, feature } },
          body: { enabled },
        }),
      ),
    onSuccess: (t) => {
      const label = FEATURES.find((f) => f.value === t.feature)?.label ?? t.feature;
      toast.success(`${label} ${t.enabled ? 'on' : 'off'} for ${overview.event.name}.`);
      return queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
  const state = (f: Feature) => overview.features.find((x) => x.feature === f);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
        <CardDescription>
          Organisers can&apos;t switch these themselves: they ask you. Changes apply at once.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <ErrorAlert error={toggle.error} />
        <ul className="divide-y rounded-lg border" aria-label="Features">
          {FEATURES.map((f) => {
            const s = state(f.value);
            const id = `feature-${f.value}`;
            return (
              <li key={f.value} className="flex items-center justify-between gap-4 p-4">
                <div className="grid min-w-0 gap-0.5">
                  <label htmlFor={id} className="font-medium">
                    {f.label}
                  </label>
                  <p className="text-sm text-muted-foreground">{f.explain}</p>
                  {s?.updatedAt && (
                    <p className="text-xs text-muted-foreground">
                      Changed {formatIST(s.updatedAt)}
                    </p>
                  )}
                </div>
                <Switch
                  id={id}
                  checked={s?.enabled ?? false}
                  disabled={toggle.isPending}
                  onCheckedChange={(enabled) =>
                    enabled ? toggle.mutate({ feature: f.value, enabled }) : setTurningOff(f.value)
                  }
                />
              </li>
            );
          })}
        </ul>
      </CardContent>
      <ConfirmDialog
        open={turningOff !== null}
        onOpenChange={(o) => !o && setTurningOff(null)}
        title={`Switch ${FEATURES.find((f) => f.value === turningOff)?.label.toLowerCase()} off for ${overview.event.name}?`}
        description="The event loses it straight away; its data stays. You can switch it back on."
        confirmLabel="Switch off"
        destructive
        onConfirm={() => turningOff && toggle.mutate({ feature: turningOff, enabled: false })}
      />
    </Card>
  );
}

function Counts({ overview }: { overview: EventOverview }) {
  const c = overview.counts;
  const tiles: [string, number, string?][] = [
    ['Teams', c.teams],
    ['People', c.people, `of ${overview.event.maxParticipants} places`],
    ['Confirmed', c.confirmed],
    ['Checked in', c.checkedIn],
    ['Staff', c.staff, 'volunteers and judges'],
    ['Cancelled', c.cancelled],
  ];
  return (
    <section aria-label="Numbers" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map(([label, value, hint]) => (
        <div key={label} className="grid gap-0.5 rounded-xl border bg-card p-4">
          <span className="text-xs text-muted-foreground">{label}</span>
          <span className="text-2xl font-semibold tabular-nums">{value}</span>
          {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
        </div>
      ))}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid min-w-0 gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-anywhere">{children}</dd>
    </div>
  );
}

const PAYMENT: Record<EventOverview['event']['paymentMode'], string> = {
  none: 'No payment',
  at_registration: 'At registration',
  after_shortlist: 'After shortlist',
};

function DetailsCard({ overview }: { overview: EventOverview }) {
  const e = overview.event;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Details</CardTitle>
        <CardDescription>Read only: organisers edit these in their console.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
          <Fact label="Starts">{formatIST(e.startAt)}</Fact>
          <Fact label="Ends">{formatIST(e.endAt)}</Fact>
          <Fact label="Registration opens">{formatIST(e.registrationStart)}</Fact>
          <Fact label="Registration closes">{formatIST(e.registrationDeadline)}</Fact>
          <Fact label="Capacity">{e.maxParticipants} people</Fact>
          <Fact label="Team size">
            {e.minTeamSize === e.maxTeamSize ? e.minTeamSize : `${e.minTeamSize}–${e.maxTeamSize}`}
          </Fact>
          <Fact label="Payment">
            {PAYMENT[e.paymentMode]}
            {e.registrationFee !== null &&
              ` · ${formatMoney(e.registrationFee, e.currency)} ${e.feeBasis === 'per_team' ? 'per team' : 'per person'}`}
          </Fact>
          <Fact label="Portal">{e.portalUrl ?? 'Not set'}</Fact>
          <Fact label="Created">{formatIST(e.createdAt)}</Fact>
          <Fact label="Event ID">
            <code className="font-mono text-xs break-all">{e.id}</code>
          </Fact>
        </dl>
      </CardContent>
    </Card>
  );
}

function OrganisersCard({ overview }: { overview: EventOverview }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Organisers</CardTitle>
        <CardDescription>Who runs the event in the console.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          <Table aria-label="Organisers">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.organisers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="whitespace-normal">
                    <div className="font-medium wrap-anywhere">{p.name}</div>
                    <div className="text-xs break-all text-muted-foreground">{p.email}</div>
                  </TableCell>
                  <TableCell>
                    {p.isOwner ? (
                      <Badge variant="secondary">Owner</Badge>
                    ) : p.role === 'admin' ? (
                      'Co-admin'
                    ) : (
                      'Reviewer'
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

/** Deleting the event, typed out by name. */
function DangerZone({ overview }: { overview: EventOverview }) {
  const api = useApi();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const e = overview.event;
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const remove = useMutation({
    mutationFn: () =>
      unwrap(
        api.DELETE('/v1/platform/events/{eventId}', {
          params: { path: { eventId: e.id } },
          body: { confirmName: typed },
        }),
      ),
    onSuccess: () => {
      toast.success(`${e.name} deleted.`);
      void navigate('/', { replace: true });
      queryClient.removeQueries({ queryKey: ['events', e.id] });
      return queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
  const close = (o: boolean) => {
    setOpen(o);
    if (!o) {
      setTyped('');
      remove.reset();
    }
  };
  const matches = typed.trim() === e.name.trim();

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Deleting the event removes every team, registration, link, poll, check-in, score and staff
          account in it. It can&apos;t be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
          <Trash2 aria-hidden /> Delete event
        </Button>
      </CardContent>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (matches) remove.mutate();
            }}
          >
            <DialogHeader>
              <DialogTitle className="wrap-anywhere">Delete {e.name}?</DialogTitle>
              <DialogDescription>
                {overview.counts.people} people in {overview.counts.teams}{' '}
                {overview.counts.teams === 1 ? 'team' : 'teams'} go with it. Type the event&apos;s
                name to confirm.
              </DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel htmlFor="confirm-name">Event name</FieldLabel>
              <Input
                id="confirm-name"
                autoComplete="off"
                placeholder={e.name}
                value={typed}
                onChange={(ev) => setTyped(ev.target.value)}
              />
            </Field>
            <ErrorAlert error={remove.error} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>
                Keep
              </Button>
              <Button type="submit" variant="destructive" disabled={!matches || remove.isPending}>
                Delete event
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
