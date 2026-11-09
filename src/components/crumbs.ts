import { createContext, useContext, useEffect, useState } from 'react';

export interface Crumb {
  label: string;
  to?: string;
}

const HOME: Crumb[] = [{ label: 'Events', to: '/' }];

export const CrumbContext = createContext<(trail: Crumb[]) => void>(() => {});

export function useCrumbState() {
  return useState<Crumb[]>(HOME);
}

/** A page names itself after "Events" in the breadcrumb (and the tab title). */
export function useCrumbs(...after: Crumb[]) {
  const set = useContext(CrumbContext);
  const key = JSON.stringify(after);
  useEffect(() => {
    set([...HOME, ...(JSON.parse(key) as Crumb[])]);
    return () => set(HOME);
  }, [key, set]);
}
