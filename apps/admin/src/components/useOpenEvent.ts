import { useNavigate } from 'react-router';

/** Every list, tile and notification opens an event the same way: on its own page. */
export function useOpenEvent() {
  const navigate = useNavigate();
  return (eventId: string) => navigate(`/events/${eventId}`);
}
