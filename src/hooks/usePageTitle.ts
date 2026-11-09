import { useEffect } from 'react';

/** Sets the browser tab title, most specific part first: "MachZero · eventKit admin". */
export function usePageTitle(...parts: string[]) {
  const title = [...parts, 'eventKit admin'].join(' · ');
  useEffect(() => {
    document.title = title;
  }, [title]);
}
