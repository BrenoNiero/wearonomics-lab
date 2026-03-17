
'use client';

import { type ValidationProfileType } from './controls';

/**
 * @fileOverview Minimal high-fidelity research ledger logic.
 */

export interface LedgerEntry {
  id: string;
  activityDate: string;
  activityLabel: string;
  datasetName: string;
  totalSeconds: number;
  validatedSeconds: number;
  validatedMinutes: number; // Stored pre-computed minutes
  validatedDistanceKm: number;
  avgValidatedSpeedMs: number;
  transportSeconds: number;
  artifactSeconds: number;
  pauseCount: number;
  longestPauseSeconds: number;
  hrMin: number | null;
  hrMax: number | null;
  credits: number; // authoritative credits field
  createdAt: string;
  validationProfile: ValidationProfileType;
  // Computed for display/charting
  cumulativeCredits: number;
  // Deprecated fields kept for backward compatibility if needed during migration
  baseCredits?: number;
  finalCredits?: number;
}

export const LEDGER_STORAGE_KEY = 'wearonomicsLedger';

export function getLedgerEntries(): LedgerEntry[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const storedLedger = localStorage.getItem(LEDGER_STORAGE_KEY);
  try {
    const entries = storedLedger ? JSON.parse(storedLedger) : [];
    if (Array.isArray(entries)) {
      return entries;
    }
  } catch (e) {
    return [];
  }
  return [];
}

export function saveLedgerEntries(entries: LedgerEntry[]): void {
  localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(entries));
}
