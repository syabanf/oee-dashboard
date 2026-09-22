import { useNavigate } from 'react-router';
import type { LossClass, Machine } from '@oee/types';
import type { LossBucket } from '@oee/fixtures';

/** One loss, or one of the six big losses, as the set of bucket keys it covers. */
export interface LossSelection { label: string; lossClass: LossClass; keys: string[] }
export const selectBucket = (b: LossBucket): LossSelection => ({ label: b.label, lossClass: b.lossClass, keys: [b.key] });

/** Opens the loss drill page for a selection over a set of machines. */
export function useOpenLoss(machines: Machine[]) {
  const navigate = useNavigate();
  return (loss: LossSelection) => {
    const q = new URLSearchParams({ label: loss.label, class: loss.lossClass, keys: loss.keys.join(','), m: machines.map((m) => m.id).join(',') });
    navigate(`/losses/drill?${q}`);
  };
}
