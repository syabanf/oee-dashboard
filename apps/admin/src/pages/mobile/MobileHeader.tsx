import { Link } from 'react-router';
import { Avatar } from '@oee/ui';
import { useScoped } from '../../state/app-state';

export function MobileHeader({ kicker, title }: { kicker: string; title: string }) {
  const { personById, viewerId } = useScoped();
  const me = personById.get(viewerId);
  return (
    <header className="flex items-center justify-between pt-3">
      <div className="min-w-0">
        <p className="text-muted truncate text-sm">{kicker}</p>
        <h1 className="mt-0.5 text-[28px] font-bold leading-tight tracking-tight">
          {title}
          <span className="text-action">.</span>
        </h1>
      </div>
      <Link to="/m/me" aria-label="Profil saya">
        <Avatar
          name={me?.name ?? '?'}
          color={me?.color}
          size="lg"
          className="shadow-card ring-card ring-4"
        />
      </Link>
    </header>
  );
}
