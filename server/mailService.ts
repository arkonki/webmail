

import nodemailer from 'nodemailer';
import Imap from 'node-imap';
import { simpleParser, ParsedMail, AddressObject } from 'mailparser';
import sanitizeHtml from 'sanitize-html';
import { Email, User, SystemFolder, SystemLabel } from '../src/types';

export interface Credentials {
    user: string;
    pass: string;
}

// --- Connection Configurations ---
export const getImapConfig = (user: string, pass: string): Imap.Config => ({
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

export const mapParsedMailToEmail = (parsed: ParsedMail, seqno: number, boxName: string, flags: string[]): Email => {
    const conversationId = parsed.inReplyTo || parsed.messageId || `conv-${Date.now()}`;
    
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
    
    const labelIds = [];
    if (flags.includes('\\Flagged')) {
        labelIds.push(SystemLabel.STARRED);
    }
    
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
        isRead: flags.includes('\\Seen'),
        folderId: boxName,
        labelIds,
        attachments: parsed.attachments.map(att => ({
            fileName: att.filename || 'attachment',
            fileSize: att.size
        }))
    };
};

// --- Service Functions ---

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

export const getEmailsForUser = async (credentials: Credentials): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Fetching emails for user ${credentials.user}`);
    let imap: Imap | undefined;
    try {
        imap = await connectImap(getImapConfig(credentials.user, credentials.pass));
        const box = await openImapBox(imap, 'INBOX');
        
        if (box.messages.total === 0) {
            console.log("Inbox is empty.");
            imap.end();
            return [];
        }

        return new Promise<Email[]>((resolve, reject) => {
            const fetchedEmails: Email[] = [];
            
            imap.search(['ALL'], (err, uids) => {
                if (err) {
                    return reject(err);
                }
                if (uids.length === 0) {
                    return resolve([]);
                }

                const fetch = imap.fetch(uids, { bodies: '', struct: true });
                
                fetch.on('message', (msg, seqno) => {
                    let buffer = '';
                    let flags: string[] = [];
                    msg.on('attributes', (attrs) => {
                        flags = attrs.flags;
                    });
                    msg.on('body', (stream) => {
                        stream.on('data', (chunk) => { buffer += chunk.toString('utf8'); });
                    });
                    msg.once('end', async () => {
                        try {
                            const parsed = await simpleParser(buffer);
                            const email = mapParsedMailToEmail(parsed, seqno, 'Inbox', flags);
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
                    console.log(`Done fetching ${fetchedEmails.length} messages!`);
                    resolve(fetchedEmails);
                });
            });
        });
    } finally {
        if (imap && imap.state !== 'disconnected') {
            imap.end();
        }
    }
};

export const fetchEmailsByUIDs = (imap: Imap, uids: string[], boxName: string): Promise<Email[]> => {
    return new Promise<Email[]>((resolve, reject) => {
        if (uids.length === 0) {
            return resolve([]);
        }
        const fetchedEmails: Email[] = [];
        const fetch = imap.fetch(uids, { bodies: '', struct: true });

        fetch.on('message', (msg, seqno) => {
            let buffer = '';
            let flags: string[] = [];
            msg.on('attributes', (attrs) => {
                flags = attrs.flags;
            });
            msg.on('body', stream => {
                stream.on('data', chunk => { buffer += chunk.toString('utf8'); });
            });
            msg.once('end', async () => {
                try {
                    const parsed = await simpleParser(buffer);
                    fetchedEmails.push(mapParsedMailToEmail(parsed, seqno, boxName, flags));
                } catch (parseError) {
                    console.error('Error parsing new email:', parseError);
                }
            });
        });

        fetch.once('error', reject);
        fetch.once('end', () => resolve(fetchedEmails));
    });
};

const flattenBoxes = (boxes: Imap.MailBoxes, prefix = ''): string[] => {
    let folderList: string[] = [];
    for (const name in boxes) {
        if (Object.prototype.hasOwnProperty.call(boxes, name)) {
            const box = boxes[name];
            if (!box.attribs.includes('\\Noselect')) {
                const fullPath = prefix ? `${prefix}${box.delimiter}${name}` : name;
                folderList.push(fullPath);
                if (box.children) {
                    folderList = folderList.concat(flattenBoxes(box.children, fullPath));
                }
            }
        }
    }
    return folderList;
};

export const getImapFolders = async (credentials: Credentials): Promise<string[]> => {
    console.log(`MAIL SERVICE: Fetching IMAP folders for ${credentials.user}`);
    let imap: Imap | undefined;
    try {
        imap = await connectImap(getImapConfig(credentials.user, credentials.pass));
        const boxes = await new Promise<Imap.MailBoxes>((resolve, reject) => {
            imap!.getBoxes((err, boxes) => {
                if (err) return reject(err);
                resolve(boxes);
            });
        });
        return flattenBoxes(boxes);
    } finally {
        imap?.end();
    }
};

export const moveConversations = async (credentials: Credentials, conversationIds: string[], targetFolderId: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Moving conversations ${conversationIds} to ${targetFolderId}`);
    // TODO: Implement actual IMAP move logic within a single connection.
    return getEmailsForUser(credentials); // Re-fetch emails to show changes
};

export const deleteConversationsPermanently = async (credentials: Credentials, conversationIds: string[]): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Deleting conversations ${conversationIds}`);
    // TODO: Implement actual IMAP delete logic.
    return getEmailsForUser(credentials);
};

export const toggleLabelOnConversations = async (credentials: Credentials, conversationIds: string[], labelName: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Toggling label ${labelName} on conversations ${conversationIds}`);
    // TODO: Implement actual IMAP flag toggling. Starred is '\\Flagged'. Custom labels are keywords.
    return getEmailsForUser(credentials);
};

export const markConversationsAsRead = async (credentials: Credentials, conversationIds: string[], isRead: boolean): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Marking conversations ${conversationIds} as read: ${isRead}`);
    // TODO: Implement actual IMAP flag setting for '\\Seen'.
    return getEmailsForUser(credentials);
};

interface SendEmailParams {
    data: { to: string; cc?: string; bcc?: string; subject: string; body: string; scheduleDate?: Date; attachments: File[] };
    user: User;
    credentials: Credentials;
    conversationId?: string;
    draftId?: string;
}

export const sendEmail = async (params: SendEmailParams): Promise<Email[]> => {
    const { data, user, credentials } = params;
    const smtp = nodemailer.createTransport(getSmtpConfig(credentials.user, credentials.pass));
    
    console.log(`MAIL SERVICE: Sending email from ${user.name} <${user.email}> to ${data.to}`);

    try {
        await smtp.sendMail({
            from: `"${user.name}" <${user.email}>`,
            to: data.to,
            cc: data.cc,
            bcc: data.bcc,
            subject: data.subject,
            html: data.body,
        });
        console.log("Email sent successfully via Nodemailer.");
    } catch (error) {
        console.error("Failed to send email:", error);
        throw new Error("SMTP Error: Failed to send email.");
    }
    
    return getEmailsForUser(credentials);
};

interface DraftParams {
    data: SendEmailParams['data'];
    user: User;
    credentials: Credentials;
    conversationId?: string;
    draftId?: string;
}

export const saveDraft = async (params: DraftParams): Promise<{ emails: Email[], newDraftId: string }> => {
    console.log("MAIL SERVICE: Saving draft...");
    // TODO: Implement IMAP append to Drafts folder.
    return { emails: await getEmailsForUser(params.credentials), newDraftId: params.draftId || `draft-${Date.now()}` };
};

export const deleteDraft = async (credentials: Credentials, draftId: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Deleting draft ${draftId}`);
    // TODO: Find draft by message-id and delete it.
    return getEmailsForUser(credentials);
};

export const removeLabelFromAllEmails = async (credentials: Credentials, labelName: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Removing label (keyword) ${labelName} from all relevant emails.`);
    // TODO: Implement IMAP search for keyword and then remove it.
    return getEmailsForUser(credentials);
}

export const moveEmailsFromFolder = async (credentials: Credentials, folderName: string, targetFolderName: string): Promise<Email[]> => {
    console.log(`MAIL SERVICE: Moving emails from ${folderName} to ${targetFolderName}.`);
    // TODO: Implement IMAP search for box, then move all messages.
    return getEmailsForUser(credentials);
}