import * as React from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Toggle } from '@oee/ui';

/** Shared frame for the master-data dialogs: keeps a draft of `entity`, resets it when another record opens. `id === ''` means create. */
export function EntityDialog<T extends { id: string }>({ entity, noun, description, valid, onSave, onClose, children }: {
  entity: T | null;
  noun: string;
  description: string;
  valid: (draft: T) => boolean;
  onSave: (draft: T) => void;
  onClose: () => void;
  children: (draft: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const [draft, setDraft] = React.useState(entity);
  const [seen, setSeen] = React.useState(entity);
  if (entity !== seen) { setSeen(entity); setDraft(entity); }
  if (!entity || !draft) return null;
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent size="lg">
        <form onSubmit={(e) => { e.preventDefault(); if (valid(draft)) { onSave(draft); onClose(); } }}>
          <DialogHeader><DialogTitle>{entity.id ? `Edit ${noun}` : `Add ${noun}`}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
          <div className="grid max-h-[60dvh] grid-cols-1 gap-4 overflow-y-auto p-0.5 sm:grid-cols-2">{children(draft, (patch) => setDraft((d) => (d ? { ...d, ...patch } : d)))}</div>
          <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Cancel</Button><Button type="submit" disabled={!valid(draft)}>Save</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export const ToggleRow = ({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-3 py-2">
    <div><p className="text-sm font-medium">{label}</p>{hint ? <p className="text-xs text-muted">{hint}</p> : null}</div>
    <Toggle checked={checked} onCheckedChange={onChange} label={label} />
  </div>
);

export const num = (value: string) => (Number.isFinite(Number(value)) ? Number(value) : 0);
