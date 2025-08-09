import WebSocket from 'ws';

const connections = new Map<string, WebSocket>();

export function add(userId: string, ws: WebSocket) {
    console.log(`[WS Manager] User ${userId} connected.`);
    connections.set(userId, ws);
}

export function remove(userId: string) {
    console.log(`[WS Manager] User ${userId} disconnected.`);
    connections.delete(userId);
}

export function send(userId: string, type: string, payload: any) {
    const ws = connections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log(`[WS Manager] Sending '${type}' to user ${userId}.`);
        ws.send(JSON.stringify({ type, payload }));
    } else {
        console.log(`[WS Manager] Could not send to user ${userId}, no active connection.`);
    }
}