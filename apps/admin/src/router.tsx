import { createBrowserRouter } from 'react-router';
import { AdminLayout } from './layouts/AdminLayout';
import { ControlTowerPage } from './pages/dashboard/ControlTowerPage';
import { AndonBoardPage } from './pages/andon/AndonBoardPage';
import { TvBoardPage } from './pages/andon/TvBoardPage';
import { EventsPage } from './pages/events/EventsPage';
import { EventDetailPage } from './pages/events/EventDetailPage';
import { MachinesPage } from './pages/machines/MachinesPage';
import { MachineDetailPage } from './pages/machines/MachineDetailPage';
import { LossesPage } from './pages/losses/LossesPage';
import { InsightsPage } from './pages/insights/InsightsPage';
import { StatesPage } from './pages/master/StatesPage';
import { ReasonsPage } from './pages/master/ReasonsPage';
import { RulesPage } from './pages/master/RulesPage';
import { ProductsPage } from './pages/master/ProductsPage';
import { CalendarPage } from './pages/master/CalendarPage';
import { IntegrationPage } from './pages/master/IntegrationPage';
import { OperatorPage } from './pages/operator/OperatorPage';
import { ExplorerPage } from './pages/explorer/ExplorerPage';
import { OeeExplainPage } from './pages/explorer/OeeExplainPage';
import { LossDrillPage } from './pages/losses/LossDrillPage';
import { InboxPage } from './pages/inbox/InboxPage';
import { MyStatsPage } from './pages/me/MyStatsPage';
import { QualityPage } from './pages/quality/QualityPage';
import { ConsolePage } from './pages/integration/ConsolePage';
import { MobileLayout } from './layouts/MobileLayout';
import { CallsPage } from './pages/mobile/CallsPage';
import { CallDetailPage } from './pages/mobile/CallDetailPage';
import { MobileInboxPage } from './pages/mobile/MobileInboxPage';
import { MobileProfilePage } from './pages/mobile/MobileProfilePage';
import { DowntimePage } from './pages/downtime/DowntimePage';
import { TrendsPage } from './pages/trends/TrendsPage';
import { ExecutivePage } from './pages/executive/ExecutivePage';
import { AlertsPage } from './pages/master/AlertsPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const router = createBrowserRouter([
  {
    element: <AdminLayout />,
    children: [
      { path: '/', element: <ControlTowerPage /> },
      { path: '/oee', element: <ExplorerPage /> },
      { path: '/oee/explain', element: <OeeExplainPage /> },
      { path: '/losses/drill', element: <LossDrillPage /> },
      { path: '/inbox', element: <InboxPage /> },
      { path: '/andon', element: <AndonBoardPage /> },
      { path: '/events', element: <EventsPage /> },
      { path: '/events/:eventId', element: <EventDetailPage /> },
      { path: '/machines', element: <MachinesPage /> },
      { path: '/machines/:machineId', element: <MachineDetailPage /> },
      { path: '/losses', element: <LossesPage /> },
      { path: '/insights', element: <InsightsPage /> },
      { path: '/me', element: <MyStatsPage /> },
      { path: '/quality', element: <QualityPage /> },
      { path: '/executive', element: <ExecutivePage /> },
      { path: '/downtime', element: <DowntimePage /> },
      { path: '/trends', element: <TrendsPage /> },
      { path: '/master/alerts', element: <AlertsPage /> },
      { path: '/integration', element: <ConsolePage /> },
      { path: '/master/states', element: <StatesPage /> },
      { path: '/master/reasons', element: <ReasonsPage /> },
      { path: '/master/rules', element: <RulesPage /> },
      { path: '/master/products', element: <ProductsPage /> },
      { path: '/master/calendar', element: <CalendarPage /> },
      { path: '/master/integration', element: <IntegrationPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
  {
    path: '/m', element: <MobileLayout />,
    children: [
      { index: true, element: <CallsPage /> },
      { path: 'calls/:eventId', element: <CallDetailPage /> },
      { path: 'inbox', element: <MobileInboxPage /> },
      { path: 'me', element: <MobileProfilePage /> },
    ],
  },
  // Shopfloor screens run full-bleed, outside the admin shell.
  { path: '/board', element: <TvBoardPage /> },
  { path: '/operator', element: <OperatorPage /> },
  { path: '/operator/:lineId', element: <OperatorPage /> },
]);
