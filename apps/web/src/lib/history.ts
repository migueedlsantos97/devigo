'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VigMethod } from '@devigo/core';

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

export const useHistory = () => {
  const [tickets, setTickets] = useState<ReadonlyArray<SavedTicket>>([]);

  useEffect(() => {
    setTickets(load());
  }, []);

  const save = useCallback((ticket: Omit<SavedTicket, 'id' | 'createdAt' | 'status'>): void => {
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
  }, []);

  const setStatus = useCallback((id: string, status: TicketStatus): void => {
    setTickets((prev) => {
      const next = prev.map((ticket) => (ticket.id === id ? { ...ticket, status } : ticket));
      persist(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string): void => {
    setTickets((prev) => {
      const next = prev.filter((ticket) => ticket.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { tickets, save, setStatus, remove };
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
