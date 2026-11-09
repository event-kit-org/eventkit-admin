import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlert, CircleCheck } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError, unwrap } from '@/api/client';
import { useAuth } from '@/auth/context';
import { FormField } from '@/components/FormField';
import { PageHeader } from '@/components/PageHeader';
import { useCrumbs } from '@/components/crumbs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * The platform admin: who it is, and its password. The email changes only by
 * running `eventkit-admin-create` again on the server.
 */
export function AccountPage() {
  const { user } = useAuth();
  useCrumbs({ label: 'Account' });
  return (
    <div className="grid max-w-2xl gap-4">
      <PageHeader
        as="h1"
        title="Account"
        description="The one eventKit platform admin. To change the email, run eventkit-admin-create on the server."
      />
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
            <dt className="text-muted-foreground">Name</dt>
            <dd>{user?.name}</dd>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="break-all">{user?.email}</dd>
          </dl>
        </CardContent>
      </Card>
      <ChangePassword />
    </div>
  );
}

const passwordSchema = z
  .object({
    current: z.string().min(1, 'Enter your current password.'),
    next: z.string().min(8, 'At least 8 characters.'),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    path: ['confirm'],
    message: "The passwords don't match.",
  });
type PasswordValues = z.infer<typeof passwordSchema>;

function ChangePassword() {
  const { api, start } = useAuth();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });

  const onSubmit = form.handleSubmit(async ({ current, next }) => {
    setError(null);
    setDone(false);
    try {
      // The reply's token keeps this device signed in; every other session ends.
      start(
        await unwrap(
          api.POST('/v1/platform/auth/password', {
            body: { currentPassword: current, newPassword: next },
          }),
        ),
      );
      form.reset();
      setDone(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not change it. Check your connection.');
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
        <CardDescription>Every other device signed in as the admin is signed out.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid max-w-sm gap-4" onSubmit={onSubmit} noValidate>
          {error && (
            <Alert variant="destructive">
              <CircleAlert aria-hidden />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {done && (
            <Alert>
              <CircleCheck aria-hidden />
              <AlertDescription>Password changed. Other devices are signed out.</AlertDescription>
            </Alert>
          )}
          <FormField
            label="Current password"
            type="password"
            autoComplete="current-password"
            error={form.formState.errors.current?.message}
            {...form.register('current')}
          />
          <FormField
            label="New password"
            type="password"
            autoComplete="new-password"
            error={form.formState.errors.next?.message}
            {...form.register('next')}
          />
          <FormField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            error={form.formState.errors.confirm?.message}
            {...form.register('confirm')}
          />
          <Button type="submit" className="w-fit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : 'Change password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
