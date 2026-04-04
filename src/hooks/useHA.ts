/**
 * React hooks for Home Assistant integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Connection, HassEntities } from 'home-assistant-js-websocket';
import { connectToHA, subscribeToEntities, callService, disconnect } from '../services/ha-connection';
import type { ConnectionStatus } from '../types/ha';

/**
 * Main hook — connects to HA and provides live entity state
 */
export function useHomeAssistant(url: string, token: string) {
  const [entities, setEntities] = useState<HassEntities>({});
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const connRef = useRef<Connection | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    async function connect() {
      try {
        setStatus('connecting');
        const conn = await connectToHA(url, token);
        connRef.current = conn;
        setStatus('connected');

        unsubscribe = subscribeToEntities(conn, (ents) => {
          setEntities(ents);
        });

        conn.addEventListener('disconnected', () => setStatus('disconnected'));
        conn.addEventListener('ready', () => setStatus('connected'));
      } catch (err) {
        console.error('HA connection failed:', err);
        setStatus('error');
      }
    }

    if (url && token) connect();

    return () => {
      unsubscribe?.();
      disconnect();
    };
  }, [url, token]);

  const callHA = useCallback(
    async (domain: string, service: string, data?: Record<string, unknown>, target?: { entity_id?: string | string[] }) => {
      if (connRef.current) {
        await callService(connRef.current, domain, service, data, target);
      }
    },
    []
  );

  return { entities, status, callHA };
}

/**
 * Convenience hook — subscribe to a single entity
 */
export function useEntity(entities: HassEntities, entityId: string) {
  return entities[entityId] ?? null;
}

/**
 * Convenience hook — get all entities matching a domain
 */
export function useDomain(entities: HassEntities, domain: string) {
  return Object.values(entities).filter((e) => e.entity_id.startsWith(`${domain}.`));
}
