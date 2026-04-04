/**
 * Home Assistant WebSocket connection service
 * Uses the official home-assistant-js-websocket library.
 *
 * Usage:
 *   const conn = await connectToHA('http://homeassistant.local:8123', 'YOUR_TOKEN');
 *   subscribeEntities(conn, (entities) => { ... });
 */

import {
  createConnection,
  subscribeEntities,
  subscribeServices,
  createLongLivedTokenAuth,
  type Connection,
  type HassEntities,
} from 'home-assistant-js-websocket';

let connection: Connection | null = null;

export async function connectToHA(
  url: string,
  token: string
): Promise<Connection> {
  const auth = createLongLivedTokenAuth(url, token);
  connection = await createConnection({ auth });
  return connection;
}

export function getConnection(): Connection | null {
  return connection;
}

export function subscribeToEntities(
  conn: Connection,
  callback: (entities: HassEntities) => void
): () => void {
  return subscribeEntities(conn, callback);
}

export async function callService(
  conn: Connection,
  domain: string,
  service: string,
  data?: Record<string, unknown>,
  target?: { entity_id?: string | string[]; area_id?: string | string[] }
): Promise<void> {
  await conn.sendMessagePromise({
    type: 'call_service',
    domain,
    service,
    service_data: data,
    target,
  });
}

export function disconnect(): void {
  if (connection) {
    connection.close();
    connection = null;
  }
}
