'use client';

export interface ControlSettings {
  validWalkingSpeedBand: {
    min: number;
    max: number;
  };
  gpsJumpMaxSpeed: number;
  segmentGapThreshold: number;
  stepsPerMinuteMin: number;
  stepsPerMinuteMax: number;
  // Movement Classification Controls
  sustainedHighSpeedDurationThreshold: number;
  vehicleSpeedTriggerThreshold: number;
  lowSpeedDropToleranceWindow: number;
  accelerationSpikeSensitivity: number;
  cadenceConsistencyCheck: boolean;
}

export type ValidationProfileType = 'human';

export const CONTROLS_STORAGE_KEY = 'wearonomicsControls';

export const defaultControls: Record<ValidationProfileType, ControlSettings> = {
  human: {
    validWalkingSpeedBand: { min: 0.5, max: 8.0 },
    gpsJumpMaxSpeed: 15.0,
    segmentGapThreshold: 120,
    stepsPerMinuteMin: 20,
    stepsPerMinuteMax: 220,
    sustainedHighSpeedDurationThreshold: 20,
    vehicleSpeedTriggerThreshold: 3.5,
    lowSpeedDropToleranceWindow: 15,
    accelerationSpikeSensitivity: 1.8,
    cadenceConsistencyCheck: true,
  }
};

export function getControls(profile: ValidationProfileType = 'human'): ControlSettings {
  if (typeof window === 'undefined') {
    return defaultControls[profile];
  }
  try {
    const storedControls = localStorage.getItem(`${CONTROLS_STORAGE_KEY}_${profile}`);
    if (storedControls) {
      const parsed = JSON.parse(storedControls);
      return { ...defaultControls[profile], ...parsed };
    }
  } catch (e) {
    console.error(`Failed to parse controls from local storage`, e);
  }
  return defaultControls[profile];
}

export function saveControls(profile: ValidationProfileType, controls: ControlSettings): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(`${CONTROLS_STORAGE_KEY}_${profile}`, JSON.stringify(controls));
  } catch (e) {
    console.error(`Failed to save controls to local storage`, e);
  }
}