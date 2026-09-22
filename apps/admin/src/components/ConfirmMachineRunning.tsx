import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
} from '@oee/ui';

export function ConfirmMachineRunning({
  onConfirm,
  language = 'en',
  className,
  disabled = false,
}: {
  onConfirm: () => void;
  language?: 'en' | 'id';
  className?: string;
  disabled?: boolean;
}) {
  const id = language === 'id';
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="lg" className={className} disabled={disabled}>
          {id ? 'Mesin sudah berjalan' : 'Machine is running'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogTitle>
          {id ? 'Mesin benar-benar sudah berjalan?' : 'Is the machine running normally?'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {id
            ? 'Pastikan mesin menghasilkan produk dan tidak kembali berhenti. Tindakan ini menutup waktu downtime.'
            : 'Confirm that the machine is producing and has not stopped again. This closes the downtime.'}
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogCancel>{id ? 'Belum' : 'Not yet'}</AlertDialogCancel>
          <AlertDialogAction className="bg-action hover:bg-action-strong" onClick={onConfirm}>
            {id ? 'Ya, mesin berjalan' : 'Yes, machine is running'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
