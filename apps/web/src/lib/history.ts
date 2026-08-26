'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VigMethod } from '@devigo/core';
import { getSupabase } from './supabase';

const STORAGE_KEY = 'devigo:history';
const MAX_TICKETS = 200;

export type TicketStatus = 'pending' | 'won' | 'lost' | 'void';

export interface SavedLeg {
  readonly runnerId: string;
  readonly label: string;
  readonly matchup: string;
  readonly book: string;
  readonly price: number;
  readonly fairPrice: number;
}

export interface SavedTicket {
  readonly id: string;
  readonly createdAt: string;
  readonly stake: number;
  readonly currency: string;
  readonly method: VigMethod;
  readonly corr: number;
  readonly source: 'live' | 'demo';
  readonly legs: ReadonlyArray<SavedLeg>;
  readonly combined: number;
  readonly fairCombined: number;
  readonly ev: number;
  readonly edge: number;
  readonly status: TicketStatus;
}

const load = (): SavedTicket[] => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedTicket[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const persist = (tickets: ReadonlyArray<SavedTicket>): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets.slice(0, MAX_TICKETS)));
  } catch {
    // storage full or unavailable — history is best-effort
  }
};

interface TicketRow {
  client_id: string;
  saved_at: string;
  stake: number;
  currency: string;
  method: string;
  corr: number;
  source: string;
  combined: number;
  fair_combined: number;
  ev: number;
  edge: number;
  status: TicketStatus;
  legs: SavedLeg[];
}

const toRow = (ticket: SavedTicket): TicketRow => ({
  client_id: ticket.id,
  saved_at: ticket.createdAt,
  stake: ticket.stake,
  currency: ticket.currency,
  method: ticket.method,
  corr: ticket.corr,
  source: ticket.source,
  combined: ticket.combined,
  fair_combined: ticket.fairCombined,
  ev: ticket.ev,
  edge: ticket.edge,
  status: ticket.status,
  legs: [...ticket.legs],
});

const fromRow = (row: TicketRow): SavedTicket => ({
  id: row.client_id,
  createdAt: row.saved_at,
  stake: Number(row.stake),
  currency: row.currency,
  method: row.method as VigMethod,
  corr: row.corr,
  source: row.source === 'live' ? 'live' : 'demo',
  legs: row.legs,
  combined: Number(row.combined),
  fairCombined: Number(row.fair_combined),
  ev: Number(row.ev),
  edge: Number(row.edge),
  status: row.status,
});

const pushRow = (userId: string, ticket: SavedTicket): void => {
  void getSupabase()
    ?.from('tickets')
    .upsert({ user_id: userId, ...toRow(ticket) }, { onConflict: 'user_id,client_id' })
    .then(({ error }) => {
      if (error) console.warn('history sync failed:', error.message);
    });
};

export const useHistory = () => {
  const [tickets, setTickets] = useState<ReadonlyArray<SavedTicket>>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    setTickets(load());
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // On sign-in: merge the account's remote history with this device's, both ways.
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase || !userId) return;
    let cancelled = false;
    void supabase
      .from('tickets')
      .select('client_id, saved_at, stake, currency, method, corr, source, combined, fair_combined, ev, edge, status, legs')
      .order('saved_at', { ascending: false })
      .limit(MAX_TICKETS)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const remote = (data as TicketRow[]).map(fromRow);
        setTickets((local) => {
          const remoteIds = new Set(remote.map((ticket) => ticket.id));
          for (const ticket of local) {
            if (!remoteIds.has(ticket.id)) pushRow(userId, ticket);
          }
          const localIds = new Set(local.map((ticket) => ticket.id));
          const merged = [...local, ...remote.filter((ticket) => !localIds.has(ticket.id))].sort(
            (a, b) => b.createdAt.localeCompare(a.createdAt),
          );
          persist(merged);
          return merged;
        });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const save = useCallback(
    (ticket: Omit<SavedTicket, 'id' | 'createdAt' | 'status'>): void => {
      const entry: SavedTicket = {
        ...ticket,
        id: `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
        createdAt: new Date().toISOString(),
        status: 'pending',
      };
      setTickets((prev) => {
        const next = [entry, ...prev];
        persist(next);
        return next;
      });
      if (userId) pushRow(userId, entry);
    },
    [userId],
  );

  const setStatus = useCallback(
    (id: string, status: TicketStatus): void => {
      setTickets((prev) => {
        const next = prev.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket));
        persist(next);
        const changed = next.find((ticket) => ticket.id === id);
        if (userId && changed) pushRow(userId, changed);
        return next;
      });
    },
    [userId],
  );

  const remove = useCallback(
    (id: string): void => {
      setTickets((prev) => {
        const next = prev.filter((ticket) => ticket.id !== id);
        persist(next);
        return next;
      });
      if (userId) {
        void getSupabase()
          ?.from('tickets')
          .delete()
          .eq('user_id', userId)
          .eq('client_id', id)
          .then(({ error }) => {
            if (error) console.warn('history delete failed:', error.message);
          });
      }
    },
    [userId],
  );

  return { tickets, save, setStatus, remove, synced: userId !== null };
};

/** Realized profit for a settled ticket; null while pending. */
export const realizedProfit = (ticket: SavedTicket): number | null => {
  switch (ticket.status) {
    case 'won':
      return ticket.stake * (ticket.combined - 1);
    case 'lost':
      return -ticket.stake;
    case 'void':
      return 0;
    case 'pending':
      return null;
  }
};
