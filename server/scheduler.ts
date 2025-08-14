import * as dbService from './databaseService';
import * as security from './security';
import * as mailService from './mailService';
import nodemailer from 'nodemailer';
import { withClient } from './mailService';
import { SystemFolder } from '../src/types';
import { logger } from './logger';

async function sendScheduledMail(job: any) {
    const user = await dbService.getUserById(job.userId);
    if (!user) {
        logger.error(`[SCHEDULER] User with ID ${job.userId} not found for job ${job.id}. Deleting job.`);
        await dbService.deleteScheduledSend(job.id);
        return;
    }

    const password = security.decrypt(job.encryptedPassword);
    const credentials = { user: user.email, pass: password };

    // 1. Send via SMTP
    logger.info(`[SCHEDULER] Sending email for user ${user.email}`, { jobId: job.id });
    const smtp = nodemailer.createTransport(mailService.getSmtpConfig(credentials.user, credentials.pass));
    await smtp.sendMail({
        from: user.email,
        to: job.recipientTo,
        cc: job.recipientCc,
        bcc: job.recipientBcc,
        raw: job.rawMessage
    });

    // 2. Move from Scheduled to final destination folder on IMAP server
    const messageIdHeader = job.rawMessage.match(/^Message-ID: (.*)$/im);
    if (!messageIdHeader) {
        throw new Error(`Could not find Message-ID in raw message for job ${job.id}`);
    }
    const messageId = messageIdHeader[1].trim();
    
    const destinationFolderId = job.destinationFolderId || SystemFolder.SENT;
    const destinationFolderName = (await dbService.getFolderById(destinationFolderId, job.userId))?.name || destinationFolderId;

    await withClient(credentials, async (client) => {
        let lock = await client.getMailboxLock(SystemFolder.SCHEDULED);
        try {
            const uids = await client.search({ header: { 'message-id': messageId.replace(/[<>]/g, '') } }, { uid: true });
            if (uids && uids.length > 0) {
                await client.messageMove(uids, destinationFolderName, { uid: true });
                logger.info(`[SCHEDULER] Moved scheduled email ${messageId} to ${destinationFolderName} for user ${user.email}`);
            } else {
                 logger.warn(`[SCHEDULER] Could not find scheduled email ${messageId} in Scheduled folder for user ${user.email} to move it.`);
            }
        } finally {
            lock.release();
        }
    });

    // 3. Delete job from DB
    await dbService.deleteScheduledSend(job.id);
    logger.info(`[SCHEDULER] Successfully sent and processed scheduled email job ${job.id}`);
}

export const processScheduledEmails = async () => {
    logger.debug('[SCHEDULER] Checking for due emails...');
    try {
        const jobs = await dbService.getDueScheduledSends();
        if (jobs.length === 0) {
            return;
        }

        logger.info(`[SCHEDULER] Found ${jobs.length} email(s) to send.`);
        // Process jobs sequentially to avoid overwhelming services
        for (const job of jobs) {
            try {
                await sendScheduledMail(job);
            } catch (error) {
                logger.error(`[SCHEDULER] Failed to process job ${job.id}:`, { error });
                // Future enhancement: Add a retry mechanism with an attempt counter in the DB
            }
        }
    } catch (error) {
        logger.error('[SCHEDULER] Error during processing loop:', { error });
    }
};
