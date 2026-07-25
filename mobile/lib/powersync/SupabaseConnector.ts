import { PowerSyncBackendConnector, UpdateType } from '@powersync/react-native';
import { supabase } from '../supabase';

export class SupabaseConnector implements PowerSyncBackendConnector {
  constructor(private instanceUrl: string) {
  }

  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      return null;
    }

    return {
      endpoint: this.instanceUrl,
      token: session.access_token,
      expiresAt: session.expires_at ? new Date(session.expires_at * 1000) : undefined
    };
  }

  async uploadData(database: any) {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    try {
      for (const op of transaction.crud) {
        const table = op.table;
        const record = op.opData;
        const id = op.id;

        if (op.op === UpdateType.PUT) {
          const { error } = await supabase.from(table).upsert({ id, ...record });
          if (error) throw error;
        } else if (op.op === UpdateType.PATCH) {
          const { error } = await supabase.from(table).update(record).eq('id', id);
          if (error) throw error;
        } else if (op.op === UpdateType.DELETE) {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        }
      }
      await transaction.complete();
    } catch (ex) {
      console.error('Error uploading to Supabase', ex);
    }
  }
}
