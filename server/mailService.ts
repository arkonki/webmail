import nodemailer from 'nodemailer';
import Imap from 'node-imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import sanitizeHtml from 'sanitize-html';
import { Email, User, SystemFolder, SystemLabel } from '../types';

// --- Connection Configurations ---
const getImapConfig = (user: string, pass: string): Imap.Config => ({
    user,
    password: pass,
    // TODO: Replace with your actual IMAP server details
    host: 'mail.veebimajutus.ee',
    port: 993,
    tls: true,
    tlsOptions: {
        rejectUnauthorized: false // Use true in production with a valid certificate
    }
});

const getSmtpConfig = (user: string, pass: string) => ({
    // TODO: Replace with your actual SMTP server details
    host: 'mail.veebimajutus.ee',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: user,
        pass: pass
    }
});

// --- Helper Functions ---

const connectImap = (config: Imap.Config): Promise<Imap> => {
    return new Promise((resolve, reject) => {
        const imap = new Imap(config);
        imap.once('ready', () => resolve(imap));
        imap.once('error', (err: Error) => reject(err));
        imap.connect();
    });
};

const openImapBox = (imap: Imap, boxName: string): Promise<Imap.Box> => {
    return new Promise((resolve, reject) => {
        imap.openBox(boxName, false, (err, box) => {
            if (err) return reject(err);
            resolve(box);
        });
    });
};

const mapParsedMailToEmail = (parsed: ParsedMail, seqno: number): Email => {
    const conversationId = parsed.inReplyTo || parsed.messageId || `conv-${Date.now()}`;
    
    // Sanitize the HTML body to prevent XSS attacks
    const unsafeBody = parsed.html || parsed.textAsHtml || '<p>No content</p>';
    const safeBody = sanitizeHtml(unsafeBody, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat([ 'img', 'h1', 'h2' ]),
        allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            '*': [ 'style' ],
            'a': [ 'href', 'name', 'target' ],
            'img': [ 'src', 'srcset', 'alt', 'title', 'width', 'height', 'loading' ]
        }
    });

    const getAddressString = (field: AddressObject | AddressObject[] | undefined): string => {
        if (!field) return '';
        const addresses = Array.isArray(field) ? field.flatMap(t => t.value) : field.value;
        return addresses.map(a => a.address || '').filter(Boolean).join(', ');
    };
    
    return {
        id: parsed.messageId || `email-${seqno}`,
        conversationId: conversationId,
        senderName: parsed.from?.value[0]?.name || 'Unknown Sender',
        senderEmail: parsed.from?.value[0]?.address || 'unknown@example.com',
        recipientEmail: getAddressString(parsed.to),
        cc: getAddressString(parsed.cc),
        bcc: getAddressString(parsed.bcc),
        subject: parsed.subject || '(no subject)',
        body: safeBody,
        snippet: (parsed.text || '').substring(0, 100),
        timestamp: parsed.date?.toISOString() || new Date().toISOString(),
        isRead: false, // This needs to be set from IMAP flags
        folderId: 'Inbox', // This needs to be set from the mailbox name
        labelIds: [], // This needs to be set from IMAP flags
        attachments: parsed.attachments.map(att => ({
            fileName: att.filename || 'attachment',
            fileSize: att.size
        }))
    };
};

// --- Service Functions ---

/**
 * Validates user credentials by attempting to log in. Connects and immediately disconnects.
 * @param user The user's email address.
 * @param pass The user's password.
 * @returns The user's profile information if successful.
 */
export const login = async (user: string, pass: string): Promise<{name: string, email: string}> => {
    console.log(`MAIL SERVICE: Attempting to log in ${user}`);
    let imap;
    try {
        const config = getImapConfig(user, pass);
        imap = await connectImap(config);
        console.log("IMAP connection successful for login test.");
        const name = user.split('@')[0]; // Simple name generation
        return { name, email: user };
    } catch (err) {
        console.error("IMAP login failed:", err);
        throw new Error("Invalid email or password.");
    } finally {
        imap?.end();
    }
};

/**
 * Creates a persistent IMAP connection for the duration of a user session.
 * @param user The user's email address.
 * @param pass The user's password.
 * @returns A promise that resolves with the active IMAP connection object.
 */
export const createImapConnection = (user: string, pass: string): Promise<Imap> => {
    const config = getImapConfig(user, pass);
    return connectImap(config);
};

/**
 * Creates a Nodemailer SMTP transport for sending emails.
 * @param user The user's email address.
 * @param pass The user's password.
 * @returns A Nodemailer Transporter object.
 */
export const createSmtpTransport = (user: string, pass: string) => {
    return nodemailer.createTransport(getSmtpConfig(user, pass));
};


export const getEmailsForUser = async (imap: Imap): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Fetching emails for user`);
    try {
        await openImapBox(imap, 'INBOX');
        
        return new Promise<Email[]>((resolve, reject) => {
            const fetchedEmails: Email[] = [];
            const fetch = imap.seq.fetch('1:*', { bodies: '', struct: true });
            
            fetch.on('message', (msg, seqno) => {
                let buffer = '';
                msg.on('body', (stream) => {
                    stream.on('data', (chunk) => {
                        buffer += chunk.toString('utf8');
                    });
                });
                msg.once('end', async () => {
                    try {
                        const parsed = await simpleParser(buffer);
                        const email = mapParsedMailToEmail(parsed, seqno);
                        fetchedEmails.push(email);
                    } catch (parseError) {
                        console.error('Error parsing email:', parseError);
                    }
                });
            });

            fetch.once('error', (err) => {
                console.error('Fetch error:', err);
                reject(err);
            });

            fetch.once('end', () => {
                console.log('Done fetching all messages!');
                // Do not end the connection here, it's persistent
                resolve(fetchedEmails);
            });
        });
    } catch (error) {
        // Do not end the connection here, let the main error handler in index.ts do it.
        throw error;
    }
};

// Placeholder functions for other actions
// These require significant logic to map conversation IDs back to IMAP message UIDs or sequence numbers.
// A robust implementation would need a local cache or database to map our app's IDs to mail server UIDs.
// For this example, we'll return a static empty array, but the structure is here.

export const moveConversations = async (imap: Imap, conversationIds: string[], targetFolderId: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Moving conversations ${conversationIds} to ${targetFolderId}`);
    // TODO: Implement actual IMAP move logic.
    return getEmailsForUser(imap); // Re-fetch emails to show changes
};

export const deleteConversationsPermanently = async (imap: Imap, conversationIds: string[]): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Deleting conversations ${conversationIds}`);
    // TODO: Implement actual IMAP delete logic.
    return getEmailsForUser(imap);
};

export const toggleLabelOnConversations = async (imap: Imap, conversationIds: string[], labelName: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Toggling label ${labelName} on conversations ${conversationIds}`);
    // TODO: Implement actual IMAP flag toggling. Starred is '\Flagged'. Custom labels are keywords.
    return getEmailsForUser(imap);
};

export const markConversationsAsRead = async (imap: Imap, conversationIds: string[], isRead: boolean): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Marking conversations ${conversationIds} as read: ${isRead}`);
    // TODO: Implement actual IMAP flag setting for '\Seen'.
    return getEmailsForUser(imap);
};

interface SendEmailParams {
    data: { to: string; cc?: string; bcc?: string; subject: string; body: string; scheduleDate?: Date; attachments: File[] };
    user: User;
    smtp: nodemailer.Transporter;
    imap: Imap;
    conversationId?: string;
    draftId?: string;
}

export const sendEmail = async (params: SendEmailParams): Promise<Email[]> => {
    const { data, user, smtp, imap } = params;
    
    console.log(`MAIL SERVICE: Sending email from ${user.email} to ${data.to}`);

    try {
        await smtp.sendMail({
            from: `"${user.name}" <${user.email}>`,
            to: data.to,
            cc: data.cc,
            bcc: data.bcc,
            subject: data.subject,
            html: data.body,
            // attachments would be more complex, requiring file paths or buffers
        });
        console.log("Email sent successfully via Nodemailer.");
    } catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("SMTP Error: Failed to send email.");
    }
    
    // After sending, re-fetch emails to show the new sent item.
    return getEmailsForUser(imap);
};

interface DraftParams {
    data: SendEmailParams['data'];
    user: User;
    imap: Imap;
    conversationId?: string;
    draftId?: string;
}

export const saveDraft = async (params: DraftParams): Promise<{ emails: Email[], newDraftId: string }> => {
    // This would save the draft to the 'Drafts' folder on the IMAP server.
    console.log("MAIL SERVICE: Saving draft...");
    // TODO: Implement IMAP append to Drafts folder.
    return { emails: await getEmailsForUser(params.imap), newDraftId: params.draftId || `draft-${Date.now()}` };
};

export const deleteDraft = async (imap: Imap, draftId: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Deleting draft ${draftId}`);
    // TODO: Find draft by message-id and delete it.
    return getEmailsForUser(imap);
};

export const removeLabelFromAllEmails = async (imap: Imap, labelName: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Removing label (keyword) ${labelName} from all relevant emails.`);
    // TODO: Implement IMAP search for keyword and then remove it.
    return getEmailsForUser(imap);
}

export const moveEmailsFromFolder = async (imap: Imap, folderName: string, targetFolderName: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Moving emails from ${folderName} to ${targetFolderName}.`);
    // TODO: Implement IMAP search for box, then move all messages.
    return getEmailsForUser(imap);
}
