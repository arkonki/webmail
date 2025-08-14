


import { ImapFlow } from 'imapflow';
import { Email, Rule, SystemLabel, SystemFolder, Label } from '../src/types.js';
import * as dbService from './databaseService.js';

export const checkCondition = (email: Partial<Email>, condition: Rule['condition']): boolean => {
    const value = condition.value.toLowerCase();
    if (!value) return false;

    switch (condition.field) {
        case 'sender':
            return (email.senderEmail?.toLowerCase().includes(value) || email.senderName?.toLowerCase().includes(value)) ?? false;
        case 'recipient':
            return email.recipientEmail?.toLowerCase().includes(value) ?? false;
        case 'subject':
            return email.subject?.toLowerCase().includes(value) ?? false;
        default:
            return false;
    }
};

export const applyRulesToNewEmail = async (
    email: Email, 
    client: ImapFlow, 
    uid: number, 
    userId: string
): Promise<Email> => {
    const settings = await dbService.getAppSettings(userId);
    if (!settings.rules || settings.rules.length === 0) {
        return email;
    }

    const modifiedEmail = { ...email, labelIds: [...email.labelIds] }; // Create a mutable copy
    let wasMoved = false;

    for (const rule of settings.rules) {
        if (checkCondition(modifiedEmail, rule.condition)) {
            console.log(`[Rules Engine] Rule ${rule.id} matched for email ${email.id}`);

            if (wasMoved && rule.action.type === 'moveToFolder') {
                console.log(`[Rules Engine] Skipping move action for rule ${rule.id} as email was already moved.`);
                continue;
            }
            
            switch (rule.action.type) {
                case 'moveToFolder':
                    if (rule.action.folderId) {
                        const folder = await dbService.getFolderById(rule.action.folderId, userId);
                        const folderName = folder ? folder.name : rule.action.folderId;
                        
                        console.log(`[Rules Engine] Moving email ${uid} to folder "${folderName}"`);
                        await client.messageMove([uid], folderName, { uid: true });
                        modifiedEmail.folderId = rule.action.folderId;
                        wasMoved = true;
                    }
                    break;
                case 'applyLabel':
                    if (rule.action.labelId) {
                        const label = await dbService.getLabelById(rule.action.labelId, userId);
                        if (label) {
                            console.log(`[Rules Engine] Applying label "${label.name}" to email ${uid}`);
                            await client.messageFlagsAdd([uid], [label.name], { uid: true });
                            if (!modifiedEmail.labelIds.includes(label.id)) {
                                modifiedEmail.labelIds.push(label.id);
                            }
                        }
                    }
                    break;
                case 'star':
                    console.log(`[Rules Engine] Starring email ${uid}`);
                    await client.messageFlagsAdd([uid], ['\\Flagged'], { uid: true });
                    if (!modifiedEmail.labelIds.includes(SystemLabel.STARRED)) {
                        modifiedEmail.labelIds.push(SystemLabel.STARRED);
                    }
                    break;
                case 'markAsRead':
                    console.log(`[Rules Engine] Marking email ${uid} as read`);
                    await client.messageFlagsAdd([uid], ['\\Seen'], { uid: true });
                    modifiedEmail.isRead = true;
                    break;
            }
        }
    }
    
    return modifiedEmail;
};

// This new function calculates the final state of an email based on rules, without performing IMAP actions.
// It's used by the efficient initial backlog sweep.
export const applyRulesToEmailObject = async (
    email: Email,
    userId: string,
    allLabels: Label[]
): Promise<{ finalEmail: Email; flagsToAdd: string[]; destinationFolderId: string | null }> => {
    const settings = await dbService.getAppSettings(userId);
    if (!settings.rules || settings.rules.length === 0) {
        return { finalEmail: email, flagsToAdd: [], destinationFolderId: null };
    }

    const finalEmail = { ...email, labelIds: [...email.labelIds] };
    const flagsToAdd = new Set<string>();
    let destinationFolderId: string | null = null;
    let hasMoveRuleApplied = false;

    for (const rule of settings.rules) {
        if (checkCondition(finalEmail, rule.condition)) {
            switch (rule.action.type) {
                case 'moveToFolder':
                    if (rule.action.folderId && !hasMoveRuleApplied) {
                        destinationFolderId = rule.action.folderId;
                        hasMoveRuleApplied = true;
                    }
                    break;
                case 'applyLabel':
                    if (rule.action.labelId) {
                        const label = allLabels.find(l => l.id === rule.action.labelId);
                        if (label && !finalEmail.labelIds.includes(label.id)) {
                            finalEmail.labelIds.push(label.id);
                            flagsToAdd.add(label.name);
                        }
                    }
                    break;
                case 'star':
                    if (!finalEmail.labelIds.includes(SystemLabel.STARRED)) {
                        finalEmail.labelIds.push(SystemLabel.STARRED);
                    }
                    flagsToAdd.add('\\Flagged');
                    break;
                case 'markAsRead':
                    finalEmail.isRead = true;
                    flagsToAdd.add('\\Seen');
                    break;
            }
        }
    }
    
    if (destinationFolderId) {
        finalEmail.folderId = destinationFolderId;
    }

    return { finalEmail, flagsToAdd: Array.from(flagsToAdd), destinationFolderId };
};

export const getRuleActionsForEmail = async (
    email: Partial<Pick<Email, 'senderEmail' | 'senderName' | 'recipientEmail' | 'subject'>>,
    userId: string
): Promise<{ destinationFolderId: string; flagsToAdd: string[] }> => {
    const settings = await dbService.getAppSettings(userId);
    if (!settings.rules || settings.rules.length === 0) {
        return { destinationFolderId: SystemFolder.SENT, flagsToAdd: [] };
    }

    let destinationFolderId: string = SystemFolder.SENT;
    const flagsToAdd: string[] = [];
    let hasMoveRuleApplied = false;

    for (const rule of settings.rules) {
        if (checkCondition(email, rule.condition)) {
            switch (rule.action.type) {
                case 'moveToFolder':
                    if (rule.action.folderId && !hasMoveRuleApplied) {
                        destinationFolderId = rule.action.folderId;
                        hasMoveRuleApplied = true; // First move rule wins
                    }
                    break;
                case 'applyLabel':
                    if (rule.action.labelId) {
                        const label = await dbService.getLabelById(rule.action.labelId, userId);
                        if (label) {
                            flagsToAdd.push(label.name);
                        }
                    }
                    break;
                case 'star':
                    flagsToAdd.push('\\Flagged');
                    break;
                case 'markAsRead':
                     flagsToAdd.push('\\Seen');
                     break;
            }
        }
    }
    
    return { destinationFolderId, flagsToAdd: [...new Set(flagsToAdd)] };
};