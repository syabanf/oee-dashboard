import * as React from 'react';
import {
  Button,
  Combobox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
} from '@oee/ui';
import { useScoped } from '../state/app-state';

const CALL_TYPES = [
  {
    value: 'AUTO',
    label: 'Machine stops, engine detects',
    hint: 'Silent for 2 min, then the state engine opens the event',
  },
  {
    value: 'MICRO',
    label: 'Short stop, clears in 45 s',
    hint: 'Ends as a micro stop with no alarm',
  },
  { value: 'STOP', label: 'Operator pulls the Andon', hint: 'Event opens at once' },
  {
    value: 'ASSIST',
    label: 'Assistance call',
    hint: 'Machine keeps running, operator needs support',
  },
];

/** Demo control: inject a stop or an assistance call so the escalation ladder can be watched from T+0. */
export function RaiseAndonDialog({
  open,
  onClose,
  machineId,
}: {
  open: boolean;
  onClose: () => void;
  machineId?: string;
}) {
  const { machines, lineById, openEventByMachine, stateByCode, reasons, dispatch } = useScoped();
  const free = machines.filter(
    (m) =>
      m.active &&
      !openEventByMachine.has(m.id) &&
      stateByCode.get(m.stateCode)?.andonLevel !== 'STOP',
  );
  const [machine, setMachine] = React.useState(machineId ?? free[0]?.id ?? '');
  const [stateCode, setStateCode] = React.useState('AUTO');
  const [l1, setL1] = React.useState('');
  const categories = [...new Set(reasons.map((r) => r.l1))];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!machine) return;
    if (stateCode === 'AUTO' || stateCode === 'MICRO')
      dispatch({
        type: 'machines/stop',
        machineId: machine,
        stateCode: 'STOP',
        clearsAfterMs: stateCode === 'MICRO' ? 45_000 : undefined,
      });
    else dispatch({ type: 'events/raise', machineId: machine, stateCode, l1: l1 || undefined });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>Raise Andon</DialogTitle>
            <DialogDescription>
              Stops a machine at the current plant time. Speed up the demo clock to watch detection
              and escalation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Machine" className="sm:col-span-2">
              <Combobox
                label="Machine"
                value={machine}
                onChange={setMachine}
                placeholder={
                  free.length
                    ? 'Select a machine'
                    : 'Every machine is already stopped or has an open call'
                }
                options={free.map((m) => ({
                  value: m.id,
                  label: `${m.tag} · ${m.name}`,
                  hint: `${m.code} · ${lineById.get(m.lineId)?.name ?? ''}`,
                }))}
              />
            </FormField>
            <FormField label="Call type">
              <Combobox
                label="Call type"
                searchable={false}
                value={stateCode}
                onChange={setStateCode}
                options={CALL_TYPES}
              />
            </FormField>
            <FormField
              label="Category"
              hint={
                stateCode === 'AUTO' || stateCode === 'MICRO'
                  ? 'A machine cannot say why it stopped. A person classifies it later.'
                  : 'Leave empty to let the operator classify it.'
              }
            >
              <Combobox
                label="Category"
                searchable={false}
                disabled={stateCode === 'AUTO' || stateCode === 'MICRO'}
                value={l1}
                onChange={setL1}
                placeholder="No reason selected"
                options={[
                  { value: '', label: 'No reason selected' },
                  ...categories.map((c) => ({ value: c, label: c })),
                ]}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!machine}>
              Raise Andon
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
