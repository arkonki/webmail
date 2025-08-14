import { Response } from 'express';
import { logger } from './logger';

// Map of userId to a set of active long polling response objects
const connections = new Map<string, Set<Response>>();

export function add(userId: string, res: Response) {
    if (!connections.has(userId)) {
        connections.set(userId, new Set());
    }
    connections.get(userId)!.add(res);
    logger.debug(`[Polling Manager] User ${userId} connected. Total connections for user: ${connections.get(userId)!.size}`);
}

export function remove(userId: string, res: Response) {
    const userConnections = connections.get(userId);
    if (userConnections) {
        userConnections.delete(res);
        if (userConnections.size === 0) {
            connections.delete(userId);
        }
    }
     logger.debug(`[Polling Manager] User ${userId} disconnected. Remaining connections: ${getConnectionCount(userId)}`);
}

export function getConnectionCount(userId: string): number {
    return connections.get(userId)?.size || 0;
}

export function send(userId: string, type: string, payload: any) {
    const userConnections = connections.get(userId);
    if (userConnections && userConnections.size > 0) {
        const message = JSON.stringify({ type, payload });
        
        // Iterate over a copy because sending the response will trigger 'remove' and modify the set
        [...userConnections].forEach(res => {
            if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(message);
                // remove is called in the 'close' event handler of the request in server/index.ts
            }
        });
    }
}

// Send a message to ALL connected clients of ALL users
export function broadcast(type: string, payload: any) {
    if (connections.size === 0) return;
    
    const message = JSON.stringify({ type, payload });
    connections.forEach((userSockets, userId) => {
        [...userSockets].forEach(res => {
             if (!res.headersSent) {
                res.setHeader('Content-Type', 'application/json');
                res.status(200).send(message);
            }
        });
    });
}