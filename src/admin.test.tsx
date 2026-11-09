import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { capture, confirmDialog, renderApp } from '@/test/render';
import { apiError, EVENT_ID, overview, P, server, summary } from '@/test/server';

const signedIn = (path: string) => renderApp(path, { token: 'good-token' });

describe('signing in', () => {
  it('sends anonymous visitors to log in, then back', async () => {
    const { router } = renderApp(`/events/${EVENT_ID}`);
    await screen.findByRole('heading', { name: 'Log in' });
    // No sign-up: there is one admin.
    expect(screen.queryByText(/Create an account/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Email'), 'root@eventkit.test');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Password'));
    await userEvent.type(screen.getByLabelText('Password'), 'right-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/events/${EVENT_ID}`));
    expect(await screen.findByRole('heading', { name: 'MachZero' })).toBeInTheDocument();
  });

  it('signs out when the token is no longer accepted', async () => {
    const { session } = renderApp('/', { token: 'old-token' });
    await screen.findByRole('heading', { name: 'Log in' });
    expect(session.get()).toBeNull();
  });

  it('asks for a reset link, then sets a new password from it', async () => {
    const forgot = capture('post', `${P}/auth/password/forgot`, null, 202);
    renderApp('/login');
    await userEvent.click(await screen.findByRole('link', { name: 'Forgot password?' }));
    await userEvent.type(await screen.findByLabelText('Email'), 'root@eventkit.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));
    expect(await screen.findByText(/If that's the admin's email/)).toBeInTheDocument();
    expect(forgot[0]?.body).toEqual({ email: 'root@eventkit.test' });
  });

  it('chooses a new password with the emailed link and lands on the events', async () => {
    const reset = capture('post', `${P}/auth/password/reset`, {
      admin: { id: 'a', email: 'root@eventkit.test', name: 'Root Admin' },
      token: { accessToken: 'good-token', tokenType: 'Bearer', expiresIn: '12h' },
    });
    const { router } = renderApp('/reset-password?token=t1');
    await userEvent.type(await screen.findByLabelText('New password'), 'new-pass-123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-pass-123');
    await userEvent.click(screen.getByRole('button', { name: 'Save and log in' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(reset[0]?.body).toEqual({ token: 't1', newPassword: 'new-pass-123' });
    expect(await screen.findByRole('table', { name: 'Events' })).toBeInTheDocument();
  });
});

describe('events', () => {
  it('lists every event with its owner and features; search and filter', async () => {
    server.use(
      http.get(`${P}/events`, () =>
        HttpResponse.json([
          summary(),
          summary({
            id: '55555555-5555-4555-8555-555555555555',
            name: 'Quiet Meetup',
            owner: { id: 'o', name: 'Vik', email: 'vik@club.test' },
            features: [
              { feature: 'mailing', enabled: false },
              { feature: 'registration', enabled: false },
              { feature: 'scanning', enabled: false },
            ],
          }),
        ]),
      ),
    );
    const { router } = signedIn('/');
    const table = within(await screen.findByRole('table', { name: 'Events' }));
    expect(table.getByText('MachZero')).toBeInTheDocument();
    expect(table.getByText('Registration')).toBeInTheDocument();
    expect(table.getByText('None')).toBeInTheDocument();
    expect(screen.getByText('2 events')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Search events'), 'vik');
    await waitFor(() => expect(table.queryByText('MachZero')).not.toBeInTheDocument());
    await userEvent.clear(screen.getByLabelText('Search events'));

    await userEvent.click(screen.getByRole('button', { name: /^Show: / }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'No features on' }));
    await waitFor(() => expect(table.queryByText('MachZero')).not.toBeInTheDocument());
    expect(router.state.location.search).toBe('?feature=none');
    await userEvent.click(screen.getByRole('button', { name: /^Show: / }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'With scanning' }));
    await waitFor(() => expect(table.queryByText('Quiet Meetup')).not.toBeInTheDocument());

    await userEvent.click(table.getByText('MachZero'));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/events/${EVENT_ID}`));
  });

  it('says when there are no events', async () => {
    server.use(http.get(`${P}/events`, () => HttpResponse.json([])));
    signedIn('/');
    expect(await screen.findByText('No events yet.')).toBeInTheDocument();
  });

  it('pages 20 events at a time', async () => {
    server.use(
      http.get(`${P}/events`, () =>
        HttpResponse.json(
          Array.from({ length: 25 }, (_, i) =>
            summary({
              id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
              name: `E${i}`,
            }),
          ),
        ),
      ),
    );
    signedIn('/');
    const table = await screen.findByRole('table', { name: 'Events' });
    expect(within(table).getAllByRole('row')).toHaveLength(21);
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(within(table).getAllByRole('row')).toHaveLength(6);
    expect(screen.getByText('21–25 of 25')).toBeInTheDocument();
  });
});

describe('one event', () => {
  it('shows details, numbers and organisers, read only', async () => {
    signedIn(`/events/${EVENT_ID}`);
    expect(await screen.findByRole('heading', { name: 'MachZero' })).toBeInTheDocument();
    expect(screen.getByText(/PESOS · MRD Auditorium/)).toBeInTheDocument();
    const numbers = within(screen.getByRole('region', { name: 'Numbers' }));
    expect(numbers.getByText('of 150 places')).toBeInTheDocument();
    expect(numbers.getByText('25')).toBeInTheDocument();
    expect(screen.getByText(/₹500 per person/)).toBeInTheDocument();
    const organisers = within(screen.getByRole('table', { name: 'Organisers' }));
    expect(organisers.getByText('Owner')).toBeInTheDocument();
    expect(organisers.getByText('Reviewer')).toBeInTheDocument();
    // Nothing on the page edits the event itself.
    expect(screen.queryByRole('button', { name: /Save/ })).not.toBeInTheDocument();
  });

  it('switches a feature on at once, and asks before switching one off', async () => {
    const put = capture('put', `${P}/events/${EVENT_ID}/features/mailing`, {
      feature: 'mailing',
      enabled: true,
      updatedAt: '2026-11-09T00:00:00.000Z',
    });
    const off = capture('put', `${P}/events/${EVENT_ID}/features/scanning`, {
      feature: 'scanning',
      enabled: false,
      updatedAt: '2026-11-09T00:00:00.000Z',
    });
    signedIn(`/events/${EVENT_ID}`);
    await userEvent.click(await screen.findByRole('switch', { name: 'Mailing' }));
    await waitFor(() => expect(put[0]?.body).toEqual({ enabled: true }));
    expect(await screen.findByText('Mailing on for MachZero.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: 'Scanning' }));
    expect(await screen.findByRole('alertdialog')).toHaveTextContent(
      'Switch scanning off for MachZero?',
    );
    await confirmDialog('Switch off');
    await waitFor(() => expect(off[0]?.body).toEqual({ enabled: false }));
  });

  it('deletes the event once its name is typed', async () => {
    const del = capture('delete', `${P}/events/${EVENT_ID}`, null, 204);
    const { router } = signedIn(`/events/${EVENT_ID}`);
    await userEvent.click(await screen.findByRole('button', { name: 'Delete event' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/40 people in 12 teams/)).toBeInTheDocument();
    const confirm = dialog.getByRole('button', { name: 'Delete event' });
    expect(confirm).toBeDisabled();
    await userEvent.type(dialog.getByLabelText('Event name'), 'MachZero');
    await userEvent.click(confirm);
    await waitFor(() => expect(del[0]?.body).toEqual({ confirmName: 'MachZero' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('shows refusals and a missing event', async () => {
    server.use(
      http.put(`${P}/events/${EVENT_ID}/features/mailing`, () =>
        apiError(404, 'EVENT_NOT_FOUND', 'Event not found.'),
      ),
    );
    signedIn(`/events/${EVENT_ID}`);
    await userEvent.click(await screen.findByRole('switch', { name: 'Mailing' }));
    expect(await screen.findByText('Event not found.')).toBeInTheDocument();

    server.use(
      http.get(`${P}/events/:eventId`, () => apiError(404, 'EVENT_NOT_FOUND', 'Event not found.')),
    );
    signedIn('/events/66666666-6666-4666-8666-666666666666');
    expect(await screen.findByText('Event not found')).toBeInTheDocument();
  });

  it('shows a feature with no history and an event without a portal', async () => {
    server.use(
      http.get(`${P}/events/:eventId`, () => {
        const o = overview();
        return HttpResponse.json({
          ...o,
          event: { ...o.event, portalUrl: null, paymentMode: 'none', registrationFee: null },
        });
      }),
    );
    signedIn(`/events/${EVENT_ID}`);
    expect(await screen.findByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('No payment')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Portal/ })).not.toBeInTheDocument();
  });
});

describe('account', () => {
  it('changes the password and keeps this device signed in', async () => {
    const change = capture('post', `${P}/auth/password`, {
      admin: { id: 'a', email: 'root@eventkit.test', name: 'Root Admin' },
      token: { accessToken: 'good-token', tokenType: 'Bearer', expiresIn: '12h' },
    });
    signedIn('/account');
    expect(await screen.findByText('root@eventkit.test', { selector: 'dd' })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Current password'), 'right-password');
    await userEvent.type(screen.getByLabelText('New password'), 'new-pass-123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-pass-123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText(/Password changed/)).toBeInTheDocument();
    expect(change[0]?.body).toEqual({
      currentPassword: 'right-password',
      newPassword: 'new-pass-123',
    });
  });

  it('logs out from the account menu', async () => {
    const { session } = signedIn('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Account menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Log out' }));
    expect(session.get()).toBeNull();
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('has a not-found page', async () => {
    renderApp('/nowhere');
    expect(await screen.findByText('Page not found')).toBeInTheDocument();
  });
});

describe('around the app', () => {
  it('moves between Events and Account in the sidebar, and changes the theme', async () => {
    const { router } = signedIn('/');
    await userEvent.click(await screen.findByRole('link', { name: 'Account' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
    // The sidebar's, not the breadcrumb's.
    await userEvent.click(screen.getAllByRole('link', { name: 'Events' })[0]!);
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    await userEvent.click(await screen.findByRole('menuitemradio', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Account' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/account'));
  });

  it('pages back, and clears the search', async () => {
    server.use(
      http.get(`${P}/events`, () =>
        HttpResponse.json(
          Array.from({ length: 21 }, (_, i) =>
            summary({
              id: `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
              name: `E${i}`,
            }),
          ),
        ),
      ),
    );
    signedIn('/');
    await userEvent.click(await screen.findByRole('button', { name: 'Next page' }));
    await userEvent.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(screen.getByText('1–20 of 21')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Search events'), 'E20');
    await userEvent.click(await screen.findByRole('button', { name: /Clear/ }));
    expect(screen.getByLabelText('Search events')).toHaveValue('');
  });

  it('shows a per-team fee, a fixed team size and a co-admin; keeps the event', async () => {
    server.use(
      http.get(`${P}/events/:eventId`, () => {
        const o = overview();
        return HttpResponse.json({
          ...o,
          event: { ...o.event, feeBasis: 'per_team', minTeamSize: 3, maxTeamSize: 3 },
          organisers: [
            ...o.organisers,
            { ...o.organisers[1]!, id: 'x', name: 'Co', role: 'admin' },
          ],
        });
      }),
    );
    signedIn(`/events/${EVENT_ID}`);
    expect(await screen.findByText(/₹500 per team/)).toBeInTheDocument();
    expect(screen.getByText('Co-admin')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete event' }));
    await userEvent.click(
      within(await screen.findByRole('dialog')).getByRole('button', { name: 'Keep' }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('keeps the account page error when the password is wrong', async () => {
    server.use(
      http.post(`${P}/auth/password`, () =>
        apiError(400, 'WRONG_PASSWORD', 'Your current password is incorrect.'),
      ),
    );
    signedIn('/account');
    await userEvent.type(await screen.findByLabelText('Current password'), 'nope-nope');
    await userEvent.type(screen.getByLabelText('New password'), 'new-pass-123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-pass-123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('Your current password is incorrect.')).toBeInTheDocument();
  });
});

describe('sign-in errors', () => {
  it('says when password reset is off on the server', async () => {
    server.use(
      http.post(`${P}/auth/password/forgot`, () =>
        apiError(409, 'RESET_UNAVAILABLE', 'Password reset is not set up on this eventKit server.'),
      ),
    );
    renderApp('/forgot-password');
    await userEvent.type(await screen.findByLabelText('Email'), 'root@eventkit.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));
    expect(await screen.findByText(/not set up on this eventKit server/)).toBeInTheDocument();
  });

  it('says when a reset link is missing or expired, with a way to get another', async () => {
    const bare = renderApp('/reset-password');
    expect(await screen.findByText(/This link is incomplete/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and log in' })).toBeDisabled();
    bare.unmount();

    server.use(
      http.post(`${P}/auth/password/reset`, () =>
        apiError(400, 'RESET_LINK_INVALID', 'This reset link has expired or was already used.'),
      ),
    );
    renderApp('/reset-password?token=old');
    await userEvent.type(await screen.findByLabelText('New password'), 'new-pass-123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-pass-123');
    await userEvent.click(screen.getByRole('button', { name: 'Save and log in' }));
    expect(await screen.findByText(/has expired or was already used/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Get a new link' })).toBeInTheDocument();
  });

  it('checks the form before sending', async () => {
    renderApp('/reset-password?token=t');
    await userEvent.type(await screen.findByLabelText('New password'), 'short');
    await userEvent.click(screen.getByRole('button', { name: 'Save and log in' }));
    expect(await screen.findByText('At least 8 characters.')).toBeInTheDocument();
  });

  it('handles a network failure on log in, forgot and reset', async () => {
    server.use(
      http.post(`${P}/auth/login`, () => HttpResponse.error()),
      http.post(`${P}/auth/password/forgot`, () => HttpResponse.error()),
      http.post(`${P}/auth/password/reset`, () => HttpResponse.error()),
    );
    const login = renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Email'), 'root@eventkit.test');
    await userEvent.type(screen.getByLabelText('Password'), 'right-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText(/Could not log in/)).toBeInTheDocument();
    login.unmount();

    const forgot = renderApp('/forgot-password');
    await userEvent.type(await screen.findByLabelText('Email'), 'root@eventkit.test');
    await userEvent.click(screen.getByRole('button', { name: 'Send the link' }));
    expect(await screen.findByText(/Could not send it/)).toBeInTheDocument();
    forgot.unmount();

    renderApp('/reset-password?token=t');
    await userEvent.type(await screen.findByLabelText('New password'), 'new-pass-123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-pass-123');
    await userEvent.click(screen.getByRole('button', { name: 'Save and log in' }));
    expect(await screen.findByText(/Could not save it/)).toBeInTheDocument();
  });

  it('sends a signed-in admin from the login page to the events', async () => {
    const { router } = renderApp('/login', { token: 'good-token' });
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });
});
