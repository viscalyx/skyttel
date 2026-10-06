import { createContext, type ReactNode, useContext, useEffect, useRef } from 'react';
import { UNSAFE_DataRouterContext, useBlocker } from 'react-router';

export type FormLeaveGuard = {
  active: () => boolean;
  leave: (proceed: () => void, cancel: () => void) => void;
  retain?: (pathname: string, search: string) => boolean;
};
const fallback = {
  register: (_guard: FormLeaveGuard) => () => {},
  requestLeave: (proceed: () => void, _cancel?: () => void) => proceed(),
};
const Context = createContext(fallback);
export const useFormLeave = () => useContext(Context);

/** One active unsent form protects household navigation and pre-navigation actions. */
export function FormLeaveProvider({ children }: { children: ReactNode }) {
  const guard = useRef<FormLeaveGuard | null>(null);
  const value = useRef({
    register(next: FormLeaveGuard) {
      guard.current = next;
      return () => {
        if (guard.current === next) guard.current = null;
      };
    },
    requestLeave(proceed: () => void, cancel: () => void = () => {}) {
      if (guard.current?.active()) guard.current.leave(proceed, cancel);
      else proceed();
    },
  }).current;
  const dataRouter = useContext(UNSAFE_DataRouterContext);
  return (
    <Context.Provider value={value}>
      {dataRouter && <RouteLeaveBlocker guard={guard} />}
      {children}
    </Context.Provider>
  );
}

function RouteLeaveBlocker({ guard }: { guard: { current: FormLeaveGuard | null } }) {
  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    Boolean(
      guard.current?.active() &&
        !guard.current.retain?.(nextLocation.pathname, nextLocation.search) &&
        (currentLocation.pathname !== nextLocation.pathname ||
          currentLocation.search !== nextLocation.search),
    ),
  );
  useEffect(() => {
    if (blocker.state === 'blocked') {
      if (guard.current?.active()) guard.current.leave(blocker.proceed, blocker.reset);
      else blocker.proceed();
    }
  }, [blocker, guard]);
  return null;
}
