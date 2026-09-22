import * as React from 'react';
import type { AppAction, AppState } from '@oee/fixtures';

export interface AppStateValue {
  state: AppState;
  dispatch: (action: AppAction) => void;
  /** Random stops for an unattended demo. Local to the tab that switched it on, so only one tab generates them. */
  autoStops: boolean;
  setAutoStops: (on: boolean) => void;
}

/** Lives in its own module so hot reloads of the provider or the hooks keep the same context object. */
export const AppStateContext = React.createContext<AppStateValue | null>(null);
