import { useNavigate } from 'react-router';
import { NotificationList } from '../../components/NotificationList';
import { useScoped } from '../../state/app-state';
import { MobileHeader } from './MobileHeader';

export function MobileInboxPage() {
  const navigate = useNavigate();
  const { inbox } = useScoped();
  return (
    <div className="space-y-6">
      <MobileHeader kicker={`${inbox.filter((n) => n.unread).length} belum dibaca`} title="Pesan" />
      <NotificationList
        onOpen={(eventId) => navigate(`/m/calls/${eventId}`)}
        onOpenAlert={() => navigate('/oee')}
      />
    </div>
  );
}
