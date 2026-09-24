import type { Response } from "express";

// One Express process, one in-memory map of userId -> their open SSE
// connections (a user can have more than one tab open). No broker, no
// cross-process fan-out — fine at single-instance scale, and consistent
// with the rest of this app running as a single Node process against a
// single SQLite file.
const clients = new Map<string, Set<Response>>();

export function addClient(userId: string, res: Response) {
  if (!clients.has(userId)) clients.set(userId, new Set());
  clients.get(userId)!.add(res);
}

export function removeClient(userId: string, res: Response) {
  const set = clients.get(userId);
  if (!set) return;
  set.delete(res);
  if (set.size === 0) clients.delete(userId);
}

export function pushToUser(userId: string, event: unknown) {
  const set = clients.get(userId);
  if (!set || set.size === 0) return;
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of set) res.write(data);
}
