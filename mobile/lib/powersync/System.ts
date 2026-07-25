import { PowerSyncDatabase } from '@powersync/react-native';
import { AppSchema } from './AppSchema';
import { SupabaseConnector } from './SupabaseConnector';

// Set up the local SQLite database
export const powersync = new PowerSyncDatabase({
  schema: AppSchema,
  database: {
    dbFilename: 'unistudy_sync.sqlite'
  }
});

export const setupPowerSync = (powerSyncUrl: string | null) => {
  if (!powerSyncUrl) {
    // No URL provided – run in offline‑only mode
    return;
  }
  const connector = new SupabaseConnector(powerSyncUrl);
  powersync.connect(connector);
};
