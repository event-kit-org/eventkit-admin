import { Fragment } from 'react';
import { Link, Outlet } from 'react-router';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { usePageTitle } from '@/hooks/usePageTitle';
import { AppSidebar } from './AppSidebar';
import { CrumbContext, type Crumb, useCrumbState } from './crumbs';

export function AppShell() {
  const [trail, setTrail] = useCrumbState();
  return (
    <CrumbContext.Provider value={setTrail}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-vertical:h-4 data-vertical:self-auto"
            />
            <Crumbs trail={trail} />
          </header>
          <div className="mx-auto w-full max-w-6xl flex-1 p-4 md:p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </CrumbContext.Provider>
  );
}

/** Where you are: Events › the event. The last crumb is the page you're on. */
function Crumbs({ trail }: { trail: Crumb[] }) {
  usePageTitle(...(trail.length > 1 ? trail.slice(1) : trail).map((c) => c.label).reverse());
  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
            <BreadcrumbItem className={i < trail.length - 1 ? 'hidden md:inline-flex' : 'min-w-0'}>
              {c.to && i < trail.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link to={c.to}>{c.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="truncate">{c.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
