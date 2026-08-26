import type { ReactNode } from 'react';
import { ToastProvider } from './ToastProvider';
import { SettingsProvider } from './SettingsProvider';
import { ConnectionProvider } from './ConnectionProvider';
import { AuthProvider } from './AuthProvider';
import { EventCountsProvider } from './EventCountsProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <ToastProvider>
        <AuthProvider>
          <ConnectionProvider>
            <EventCountsProvider>{children}</EventCountsProvider>
          </ConnectionProvider>
        </AuthProvider>
      </ToastProvider>
    </SettingsProvider>
  );
}
