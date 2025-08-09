
import Imap from 'node-imap';
import { getImapConfig, fetchEmailsByUIDs, Credentials } from './mailService';
import * as wsManager from './wsManager';

class ImapSession {
    private imap: Imap;
    private userId: string;
    private isIdling = false;
    private reconnectTimeout: NodeJS.Timeout | null = null;

    constructor(userId: string, credentials: Credentials) {
        this.userId = userId;
        this.imap = new Imap(getImapConfig(credentials.user, credentials.pass));
        this.setupListeners();
        this.connect();
    }

    private setupListeners() {
        this.imap.on('ready', () => this.onReady());
        this.imap.on('mail', () => this.onMail());
        this.imap.on('error', (err) => this.onError(err));
        this.imap.on('end', () => this.onEnd());
    }
    
    private connect() {
        console.log(`[IMAP Manager] Connecting for user ${this.userId}...`);
        this.imap.connect();
    }
    
    private onReady() {
        console.log(`[IMAP Manager] Connection ready for user ${this.userId}`);
        if(this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.openInbox();
    }

    private openInbox() {
        this.imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                console.error(`[IMAP Manager] Error opening INBOX for ${this.userId}:`, err);
                return;
            }
            console.log(`[IMAP Manager] INBOX opened for ${this.userId}. Listening for new mail.`);
            this.enterIdle();
        });
    }
    
    private enterIdle() {
        if (!this.isIdling) {
            (this.imap as any).idle();
            this.isIdling = true;
        }
    }

    private onMail() {
        console.log(`[IMAP Manager] New mail received for user ${this.userId}`);
        this.isIdling = false; // Exits idle implicitly
        
        this.imap.search(['UNSEEN'], (err, uids) => {
            if (err || uids.length === 0) {
                if (err) console.error(`[IMAP Manager] Error searching for unseen mail for ${this.userId}:`, err);
                this.enterIdle(); // Re-enter idle if search fails or finds nothing
                return;
            }

            fetchEmailsByUIDs(this.imap, uids.map(String), 'INBOX')
                .then(emails => {
                    emails.forEach(email => {
                        wsManager.send(this.userId, 'NEW_EMAIL', email);
                    });
                })
                .catch(fetchErr => {
                    console.error(`[IMAP Manager] Error fetching new mail for ${this.userId}:`, fetchErr);
                })
                .finally(() => {
                    this.enterIdle(); // Always re-enter idle after processing
                });
        });
    }
    
    private onError(err: Error) {
        console.error(`[IMAP Manager] Connection error for user ${this.userId}:`, err);
        this.isIdling = false;
    }

    private onEnd() {
        console.log(`[IMAP Manager] Connection ended for user ${this.userId}. Attempting to reconnect in 15s.`);
        this.isIdling = false;
        // Simple reconnect logic
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
            this.connect();
        }, 15000);
    }
    
    public stop() {
        console.log(`[IMAP Manager] Stopping connection for user ${this.userId}.`);
        this.isIdling = false;
        if(this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        if (this.imap.state !== 'disconnected') {
            this.imap.end();
        }
    }
}

const sessions = new Map<string, ImapSession>();

export function start(userId: string, credentials: Credentials) {
    if (sessions.has(userId)) {
        console.log(`[IMAP Manager] Session already exists for user ${userId}.`);
        return;
    }
    console.log(`[IMAP Manager] Starting new session for user ${userId}.`);
    const session = new ImapSession(userId, credentials);
    sessions.set(userId, session);
}

export function stop(userId: string) {
    const session = sessions.get(userId);
    if (session) {
        session.stop();
        sessions.delete(userId);
    }
}
