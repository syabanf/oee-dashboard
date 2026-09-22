import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@oee/ui';

export const RowActions = ({ name, onEdit, onDelete }: { name: string; onEdit: () => void; onDelete: () => void }) => (
  <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
    <Button variant="ghost" size="icon" className="size-8" aria-label={`Edit ${name}`} onClick={onEdit}><Pencil /></Button>
    <Button variant="ghost" size="icon" className="size-8 text-accent" aria-label={`Delete ${name}`} onClick={onDelete}><Trash2 /></Button>
  </div>
);
