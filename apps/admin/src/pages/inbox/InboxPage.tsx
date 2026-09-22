import { useNavigate } from 'react-router';
import { Button, Card, CardContent, PageHeader } from '@oee/ui';
import { useScoped } from '../../state/app-state';
import { NotificationList } from '../../components/NotificationList';
import { BackButton } from '../../components/BackButton';

export function InboxPage() {
  const navigate = useNavigate();
  const { inbox, personById, viewerId, dispatch } = useScoped();
  const viewer = personById.get(viewerId);
  const unread = inbox.filter((n) => n.unread);
  return (
    <div className="space-y-4">
      <BackButton fallback="/" />
      <PageHeader title={`Inbox · ${viewer?.role ?? ''}`} description={`${viewer?.name}. Escalations reach a role when its step on the ladder comes up; assignments reach the person. Switch the viewer from the account menu to read another inbox.`} className="mb-2"
        actions={unread.length ? <Button variant="outline" onClick={() => dispatch({ type: 'notifications/read', ids: unread.map((n) => n.id) })}>Mark {unread.length} as read</Button> : undefined} />
      <Card><CardContent className="p-5"><NotificationList onOpen={(id) => navigate(`/events/${id}`)} onOpenAlert={() => navigate('/oee')} /></CardContent></Card>
    </div>
  );
}
