'use client';

export type PricingMode = 'fixed' | 'progressive' | 'capped';
export type DecayMode = 'none' | 'inactivity' | 'time';

export interface EconomicsSettings {
  pricingMode: PricingMode;
  creditRatePerMinute: number;
  progressiveBase: number;
  progressiveIncrement: number;
  dailyCap: number;
  decayMode: DecayMode;
  inactiveDaysBeforeDecay: number;
  decayRatePerInactiveDay: number;
  decayInterval: number;
  decayRatePerInterval: number;
  minValidatedMinutes: number;
  includePartialSegments: boolean;
  partialSegmentWeight: number;
}

export const ECONOMICS_STORAGE_KEY = 'wearonomicsEconomics';

export const defaultEconomics: EconomicsSettings = {
  pricingMode: 'fixed',
  creditRatePerMinute: 0.10,
  progressiveBase: 0.005,
  progressiveIncrement: 0.002,
  dailyCap: 2.0,
  decayMode: 'inactivity',
  inactiveDaysBeforeDecay: 2,
  decayRatePerInactiveDay: 0.05,
  decayInterval: 30,
  decayRatePerInterval: 0.1,
  minValidatedMinutes: 5,
  includePartialSegments: true,
  partialSegmentWeight: 0.5,
};

export function getEconomics(): EconomicsSettings {
  if (typeof window === 'undefined') {
    return defaultEconomics;
  }
  try {
    const storedEconomics = localStorage.getItem(ECONOMICS_STORAGE_KEY);
    if (storedEconomics) {
      const parsed = JSON.parse(storedEconomics);
      // Migration: handle old fixedPrice key if it exists
      if (parsed.fixedPrice !== undefined && parsed.creditRatePerMinute === undefined) {
          parsed.creditRatePerMinute = parsed.fixedPrice;
          delete parsed.fixedPrice;
      }
      const hasAllKeys = Object.keys(defaultEconomics).every(key => key in parsed);
      if (hasAllKeys) {
        return { ...defaultEconomics, ...parsed };
      }
    }
  } catch (e) {
    console.error('Failed to parse economics settings from local storage', e);
  }
  return defaultEconomics;
}

export function saveEconomics(settings: EconomicsSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(ECONOMICS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save economics settings to local storage', e);
  }
}
