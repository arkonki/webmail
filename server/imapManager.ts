import { ImapFlow } from 'imapflow';
import { getImapConfig, fetchEmailsByUIDs, Credentials } from './mailService';
import * as wsManager from './wsManager';
import * as rulesEngine from './rulesEngine';
import * as dbService from './databaseService';
import { logger } from './logger';

type ImapState = { uidValidity: number; lastProcessedUid: number };

const memState = new Map<string, ImapState>();
const makeKey = (userId: string, folder: string) => `${userId}::${folder}`;

async function loadState(userId: string, folder: string): Promise<ImapState | null> {
    try {
      return await dbService.getImapState(userId, folder);
    } catch (e) {
      logger.warn(`DB loadState failed for ${userId} in ${folder}, falling back to memory.`, { e });
    }
    return memState.get(makeKey(userId, folder)) || null;
}

async function saveState(userId: string, folder: string, state: ImapState) {
    try {
      await dbService.setImapState(userId, folder, state);
      return;
    } catch (e) {
      logger.warn(`DB saveState failed for ${userId} in ${folder}, falling back to memory.`, { e });
    }
    memState.set(makeKey(userId, folder), state);
}


class ImapSession {
  private client: ImapFlow;
  private userId: string;
  private creds: Credentials;

  private isRunning = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  
  private static readonly POLLING_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor(userId: string, credentials: Credentials) {
    this.userId = userId;
    this.creds = credentials;
    this.client = new ImapFlow({ ...getImapConfig(credentials), logger: false });
    this.setupListeners();
  }

  private setupListeners() {
    this.client.on('error', (err) => this.onError(err));
    this.client.on('close', () => this.onClose());
  }

  public start() {
    if (this.isRunning) return;
    logger.info('Starting IMAP session', { userId: this.userId });
    this.isRunning = true;
    void this.connectAndRun();
  }

  public async stop() {
    logger.info('Stopping IMAP session', { userId: this.userId });
    this.isRunning = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    try {
      if (this.client.usable) await this.client.logout();
    } catch (err) {
      logger.error('IMAP logout error on stop', { userId: this.userId, err });
    }
  }

  private scheduleReconnect(delayMs = 15_000) {
    if (this.reconnectTimeout || !this.isRunning) return;
    logger.info(`Scheduling IMAP reconnect in ${delayMs}ms`, { userId: this.userId });
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      void this.connectAndRun();
    }, delayMs);
  }

  private async connectAndRun() {
    if (!this.isRunning) return;
    logger.info('Attempting to connect and run IMAP session', { userId: this.userId });
    try {
      if (!this.client.usable) {
        this.client = new ImapFlow({ ...getImapConfig(this.creds), logger: false });
        this.setupListeners();
        await this.client.connect();
      }

      if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
      logger.info('IMAP session successfully connected', { userId: this.userId });
      
      this.startPolling();

    } catch (err) {
      logger.error('IMAP connect/run error', { userId: this.userId, err });
      this.scheduleReconnect();
    }
  }

  private startPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    logger.info('Starting IMAP polling for all subscribed folders', { userId: this.userId, interval: `${ImapSession.POLLING_INTERVAL_MS}ms` });
    void this.pollAllFolders(); // Run once immediately on startup
    this.pollingInterval = setInterval(() => { void this.pollAllFolders(); }, ImapSession.POLLING_INTERVAL_MS);
  }
  
  private async pollAllFolders() {
      if (!this.client.usable || !this.isRunning) {
          if (this.isRunning) this.onClose();
          return;
      }
      
      logger.debug('Polling all folders...', { userId: this.userId });

      try {
          await this.client.noop();
      } catch (err) {
          logger.error('IMAP health check (NOOP) failed. Connection likely stale.', { userId: this.userId, err });
          this.onClose(); // Trigger reconnect and stop this cycle.
          return;
      }

      const allUserFolders = await dbService.getUserFolders(this.userId);
      const foldersToPoll = allUserFolders.filter(f => f.isSubscribed);

      for (const folder of foldersToPoll) {
          if (!this.client.usable) {
              logger.warn('IMAP connection lost during polling. Aborting.', { userId: this.userId });
              this.onClose();
              break;
          }
          try {
              await this.fetchNewMessagesForFolder(folder.path);
          } catch (err) {
              logger.error(`Error while polling folder`, { userId: this.userId, folder: folder.path, err });
              if (!this.client.usable) {
                  this.onClose();
                  break; 
              }
          }
      }
  }
  
  public async refreshFolder(folderPath: string) {
      logger.info('Immediate refresh triggered for folder', { userId: this.userId, folderPath });
      await this.fetchNewMessagesForFolder(folderPath);
  }

  private async fetchNewMessagesForFolder(folderPath: string) {
    if (!this.client.usable || !this.isRunning) return;
    try {
        const lock = await this.client.getMailboxLock(folderPath);
        try {
            const mb = this.client.mailbox;
            if (!mb) {
                logger.error('Mailbox not available', { userId: this.userId, folderPath });
                return;
            }
            
            const savedState = await loadState(this.userId, folderPath);
            let lastUid = savedState?.lastProcessedUid || 0;
            
            if (savedState && savedState.uidValidity !== Number(mb.uidValidity)) {
                logger.info('UIDVALIDITY changed for folder. Resetting lastUid.', { userId: this.userId, folderPath, old: savedState.uidValidity, new: Number(mb.uidValidity) });
                lastUid = 0;
            }

            const range = `${lastUid + 1}:*`;
            const uidsResult = await this.client.search({ uid: range }, { uid: true });

            if (uidsResult && uidsResult.length > 0) {
                logger.info(`Found ${uidsResult.length} new message(s) in folder`, { userId: this.userId, folderPath });
                await this.processUidsForFolder(uidsResult, folderPath);
            } else {
                 logger.debug('No new messages found in folder', { userId: this.userId, folderPath, lastUid });
                 // Still save state to update UIDVALIDITY if it was the first time checking this folder
                 if (lastUid > 0 || !savedState) {
                    await saveState(this.userId, folderPath, {
                        uidValidity: Number(mb.uidValidity),
                        lastProcessedUid: lastUid
                    });
                }
            }
        } finally {
            lock.release();
        }
    } catch (err) {
        logger.error(`fetchNewMessagesForFolder error`, { userId: this.userId, folderPath, err });
        this.onClose();
    }
}

  private async processUidsForFolder(uids: number[], folderPath: string) {
    const unique = Array.from(new Set(uids)).sort((a, b) => a - b);
    if (unique.length === 0) return;
    
    const userFolders = await dbService.getUserFolders(this.userId);
    const currentFolder = userFolders.find(f => f.path === folderPath);
    const folderIdForEmailObject = currentFolder?.id || folderPath;

    const emails = await fetchEmailsByUIDs(this.client, unique, folderIdForEmailObject, this.userId);

    for (const originalEmail of emails) {
      const finalEmail = await rulesEngine.applyRulesToNewEmail(
        originalEmail,
        this.client,
        originalEmail.uid,
        this.userId
      );
      wsManager.send(this.userId, 'NEW_EMAIL', finalEmail);
    }

    const newMax = unique[unique.length - 1];
    if (typeof newMax === 'number') {
      const mb = this.client.mailbox;
      if (!mb) {
          logger.error('Mailbox not available when saving state', { userId: this.userId, folderPath });
          return;
      }
      await saveState(this.userId, folderPath, {
        uidValidity: Number(mb.uidValidity),
        lastProcessedUid: newMax
      });
      logger.debug('Updated lastProcessedUid for folder', { userId: this.userId, folderPath, newMax });
    }
  }

  private onError(err: Error) {
    logger.error('IMAP Client error event', { userId: this.userId, err });
    this.onClose();
  }

  private onClose() {
    if (!this.isRunning) return;
    logger.warn('IMAP connection closed. Scheduling reconnect.', { userId: this.userId });
    if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
    }
    this.scheduleReconnect();
  }
}

const sessions = new Map<string, ImapSession>();

export function getSession(userId: string): ImapSession | undefined {
    return sessions.get(userId);
}

export function start(userId: string, credentials: Credentials) {
  if (sessions.has(userId)) {
      logger.info('IMAP session already exists for user', { userId });
      return;
  }
  const s = new ImapSession(userId, credentials);
  s.start();
  sessions.set(userId, s);
}

export async function stop(userId: string) {
  const s = sessions.get(userId);
  if (!s) return;
  await s.stop();
  sessions.delete(userId);
}