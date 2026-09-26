import { useSyncExternalStore } from 'react';

import { Button, Dialog } from '../../components/ui';

interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
}

let current: ConfirmRequest | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

/** `await confirmAction({...})` → true when the person confirms. One dialog at a time. */
export function confirmAction(request: Omit<ConfirmRequest, 'resolve'>): Promise<boolean> {
  current?.resolve(false);
  return new Promise((resolve) => {
    current = { ...request, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  const request = current;
  current = null;
  emit();
  request?.resolve(ok);
}

export function ConfirmHost() {
  const request = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
  );
  return (
    <Dialog open={!!request} onClose={() => settle(false)} labelledBy="confirm-title">
      {request ? (
        <div className="dialog__body">
          <h2 id="confirm-title" className="t-headline-md">
            {request.title}
          </h2>
          {request.body ? <p className="t-body-md c-secondary">{request.body}</p> : null}
          <div className="dialog__actions">
            <Button variant="ghost" onClick={() => settle(false)}>
              {request.cancelLabel ?? 'Cancel'}
            </Button>
            <Button variant={request.danger ? 'danger' : 'dock'} onClick={() => settle(true)} autoFocus>
              {request.confirmLabel ?? 'OK'}
            </Button>
          </div>
        </div>
      ) : null}
    </Dialog>
  );
}
