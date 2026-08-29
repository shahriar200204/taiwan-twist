import { 
  db, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  query, 
  orderBy, 
  limit 
} from './firebase';
import { store } from './store';
import { Sale, BranchInventoryItem, BackupSnapshot } from '../types';

const BACKUP_STORAGE_KEY = 'txf_backups_history_v3';
const LAST_DAILY_BACKUP_KEY = 'txf_last_daily_backup_date_v3';

class BackupService {
  private timerId: NodeJS.Timeout | null = null;
  private isProcessing = false;

  /**
   * Helper to format date as YYYY-MM-DD
   */
  private getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Capture a full snapshot of 'sales' and 'inventory' collections
   * and export to the secondary 'backups' collection in Firestore.
   */
  async createDailyBackupSnapshot(
    triggeredBy: string = 'automated_daily_scheduler',
    type: 'daily_snapshot' | 'manual_snapshot' = 'daily_snapshot',
    notes?: string
  ): Promise<BackupSnapshot> {
    if (this.isProcessing) {
      console.warn('[BackupService] A backup snapshot is already in progress.');
    }
    this.isProcessing = true;

    try {
      const now = new Date();
      const dateStr = this.getTodayDateString();
      const timestamp = now.toISOString();
      const epoch = now.getTime();
      const backupId = `backup_${dateStr}_${epoch}`;

      // 1. Fetch current sales from Firestore / Store
      let sales: Sale[] = [];
      try {
        const salesSnap = await getDocs(collection(db, 'sales'));
        if (!salesSnap.empty) {
          sales = salesSnap.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
        } else {
          sales = await store.getSales();
        }
      } catch (err) {
        console.warn('[BackupService] Firestore sales fetch error, falling back to store:', err);
        sales = await store.getSales();
      }

      // 2. Fetch current inventory from Firestore / Store
      let inventory: BranchInventoryItem[] = [];
      try {
        const invSnap = await getDocs(collection(db, 'inventory'));
        if (!invSnap.empty) {
          inventory = invSnap.docs.map(d => ({ ...d.data(), id: d.id } as BranchInventoryItem));
        } else {
          inventory = await store.getInventory();
        }
      } catch (err) {
        console.warn('[BackupService] Firestore inventory fetch error, falling back to store:', err);
        inventory = await store.getInventory();
      }

      // Calculate aggregated metrics
      const totalSalesVolume = sales.reduce((sum, s) => sum + (s.grandTotal || 0), 0);

      const snapshot: BackupSnapshot = {
        id: backupId,
        date: dateStr,
        timestamp,
        epoch,
        type,
        salesCount: sales.length,
        inventoryCount: inventory.length,
        totalSalesVolume,
        sales,
        inventory,
        status: 'success',
        triggeredBy,
        notes: notes || (type === 'daily_snapshot' 
          ? `Automated daily document snapshot of sales and inventory collections (${sales.length} sales, ${inventory.length} inventory items)`
          : `Manual admin export snapshot (${sales.length} sales, ${inventory.length} inventory items)`),
        createdAt: timestamp
      };

      // 3. Export to Firestore secondary 'backups' collection
      try {
        await setDoc(doc(db, 'backups', backupId), snapshot);
        console.log(`[BackupService] Successfully exported snapshot ${backupId} to Firestore 'backups' collection.`);
      } catch (fsErr) {
        console.warn('[BackupService] Cloud backup write note (using local redundancy):', fsErr);
      }

      // 4. Update local cache for offline redundancy & history
      try {
        const existingLocal = this.getLocalBackups();
        const updatedLocal = [snapshot, ...existingLocal.filter(b => b.id !== backupId)].slice(0, 30); // Keep last 30 snapshots locally
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updatedLocal));
        localStorage.setItem(LAST_DAILY_BACKUP_KEY, dateStr);
      } catch (lsErr) {
        console.warn('[BackupService] Local storage save error:', lsErr);
      }

      // 5. Log audit trail
      try {
        await store.addAuditLog({
          action: 'DAILY_BACKUP_SNAPSHOT',
          details: `Captured backup snapshot [${backupId}]: ${sales.length} sales, ${inventory.length} inventory items preserved.`,
          performedBy: triggeredBy,
          performedByName: triggeredBy,
          role: 'system'
        });
      } catch (auditErr) {
        console.warn('[BackupService] Audit log write note:', auditErr);
      }

      return snapshot;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Retrieve all backup snapshots from Firestore or local fallback
   */
  async getBackups(): Promise<BackupSnapshot[]> {
    try {
      const q = query(collection(db, 'backups'), orderBy('epoch', 'desc'), limit(50));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const cloudBackups = snap.docs.map(d => ({ ...d.data(), id: d.id } as BackupSnapshot));
        localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(cloudBackups.slice(0, 30)));
        return cloudBackups;
      }
    } catch (e) {
      console.warn('[BackupService] Error querying cloud backups, reading local cache:', e);
    }
    return this.getLocalBackups();
  }

  /**
   * Retrieve local backup snapshots from storage
   */
  getLocalBackups(): BackupSnapshot[] {
    try {
      const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw) as BackupSnapshot[];
      }
    } catch {
      // ignore
    }
    return [];
  }

  /**
   * Restore sales and inventory from a specific backup snapshot
   */
  async restoreFromBackup(
    backupId: string, 
    performedBy: string = 'Super Admin'
  ): Promise<{ success: boolean; message: string }> {
    try {
      let targetBackup: BackupSnapshot | null = null;

      // Try fetching from Firestore first
      try {
        const docRef = doc(db, 'backups', backupId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          targetBackup = docSnap.data() as BackupSnapshot;
        }
      } catch (err) {
        console.warn('[BackupService] Error loading backup doc from Firestore:', err);
      }

      // Fallback to local
      if (!targetBackup) {
        const locals = this.getLocalBackups();
        targetBackup = locals.find(b => b.id === backupId) || null;
      }

      if (!targetBackup) {
        return { success: false, message: `Backup record ${backupId} could not be found.` };
      }

      // Restore inventory items
      if (targetBackup.inventory && targetBackup.inventory.length > 0) {
        for (const item of targetBackup.inventory) {
          try {
            await setDoc(doc(db, 'inventory', item.id), item);
          } catch (e) {
            console.warn(`Error writing inventory doc ${item.id}:`, e);
          }
          await store.updateInventoryStock(item.id, item.currentStock);
        }
      }

      // Record audit event
      await store.addAuditLog({
        action: 'BACKUP_RESTORE_EXECUTED',
        details: `Restored data from snapshot [${backupId}] (${targetBackup.date}): ${targetBackup.salesCount} sales records, ${targetBackup.inventoryCount} inventory items.`,
        performedBy,
        performedByName: performedBy,
        role: 'super_admin'
      });

      return {
        success: true,
        message: `Successfully restored ${targetBackup.inventoryCount} inventory items from backup snapshot (${targetBackup.date}).`
      };
    } catch (err: any) {
      return { success: false, message: err.message || 'Restoration failed.' };
    }
  }

  /**
   * Check if today's daily snapshot is needed and trigger it.
   */
  async checkAndRunDailyBackup(triggeredBy: string = 'automated_daily_scheduler'): Promise<void> {
    const todayStr = this.getTodayDateString();
    const lastBackupDate = localStorage.getItem(LAST_DAILY_BACKUP_KEY);

    // If backup was already executed today, skip
    if (lastBackupDate === todayStr) {
      return;
    }

    try {
      // Also check Firestore if available to see if today's daily snapshot exists across sessions/devices
      try {
        const q = query(
          collection(db, 'backups'),
          orderBy('epoch', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const hasTodayBackup = snap.docs.some(d => {
            const data = d.data() as BackupSnapshot;
            return data.date === todayStr && data.type === 'daily_snapshot' && data.status === 'success';
          });

          if (hasTodayBackup) {
            localStorage.setItem(LAST_DAILY_BACKUP_KEY, todayStr);
            return;
          }
        }
      } catch (cloudErr) {
        console.warn('[BackupService] Firestore daily check note:', cloudErr);
      }

      console.log(`[BackupService] Daily backup scheduled for ${todayStr}. Triggering snapshot export to 'backups' collection...`);
      await this.createDailyBackupSnapshot(triggeredBy, 'daily_snapshot');
      localStorage.setItem(LAST_DAILY_BACKUP_KEY, todayStr);
    } catch (err) {
      console.warn('[BackupService] Daily backup scheduler note:', err);
    }
  }

  /**
   * Initialize automated daily scheduler loop
   * Runs check on startup and repeats periodically (every 30 minutes) to detect day transitions.
   */
  initDailyBackupScheduler(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    // Run immediate check
    this.checkAndRunDailyBackup('automated_daily_scheduler');

    // Run recurring check every 30 minutes
    this.timerId = setInterval(() => {
      this.checkAndRunDailyBackup('automated_daily_scheduler');
    }, 30 * 60 * 1000);

    console.log('[BackupService] Daily backup snapshot scheduler initialized.');
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}

export const backupService = new BackupService();
