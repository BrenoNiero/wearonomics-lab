import { getControls, type ControlSettings } from './controls';

export interface Point {
  timestamp: number | null;
  steps: number | null;
  distance: number | null;
  cadence: number | null;
  speed: number | null;
  lat: number | null;
  lon: number | null;
  ele: number | null;
  heart_rate_bpm: number | null;
}

export interface CsvSummary {
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  totalSeconds: number;
  totalSteps: number | null;
  totalDistance: number | null;
  pointsCount: number;
  hasHeartRateData?: boolean;
  hrSampleCount?: number;
  hrMin?: number | null;
  hrMax?: number | null;
  hrAvg?: number | null;
}

export type MovementMode = 'WALK' | 'CAR' | 'UNKNOWN';

export interface LedgerSegment {
  segment_id: number;
  t_start: number;
  t_end: number;
  lat1: number | null;
  lon1: number | null;
  ele1: number | null;
  lat2: number | null;
  lon2: number | null;
  ele2: number | null;
  dt_seconds: number;
  distance_meters: number;
  speed_mps: number;
  vertical_change_meters: number;
  slope: number;
  flags: string[];
  movementMode: MovementMode;
  walkBlockSeconds: number;
  classification:
    | 'walking'
    | 'stationary'
    | 'vertical_transport'
    | 'non_human_transport'
    | 'gps_artifact'
    | 'unknown';
  confidence: number;
  heart_rate_bpm: number | null;
}

export interface ValidationReport {
  segmentLedger: LedgerSegment[];
  totalSeconds: number;
  totalMinutes: number;
  activeMinutes: number;
  inactiveMinutes: number;
  excludedMinutes: number;
  activeWalkingSec: number;
  stationarySec: number;
  excludedSec: number;
  vehicleSec: number;
  excludedBreakdown: {
    gps_artifact: number;
    non_human_transport: number;
    vertical_transport: number;
    unknown: number;
  };
  decisionStatus: string;
  decisionReason: string;
  debugWarnings: string[];
}

export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

function normalizeHeartRate(points: Point[]) {
  let lastKnownHr: number | null = null;
  let lastKnownHrTimestamp: number | null = null;

  for (const point of points) {
    if (point.heart_rate_bpm !== null && point.heart_rate_bpm !== undefined) {
      lastKnownHr = point.heart_rate_bpm;
      lastKnownHrTimestamp = point.timestamp;
    } else if (
      lastKnownHr !== null &&
      lastKnownHrTimestamp !== null &&
      point.timestamp !== null
    ) {
      const diff = point.timestamp - lastKnownHrTimestamp;
      if (diff <= 10000) {
        point.heart_rate_bpm = lastKnownHr;
      }
    }
  }
}

function extractHrValue(tp: Element): number | null {
  const hrTagList = ['hr', 'heartrate', 'heart_rate', 'Value', 'gpxtpx:hr', 'ns3:hr', 'gpxdata:hr'];
  for (const tag of hrTagList) {
    const el = tp.getElementsByTagName(tag)[0];
    if (el) {
      const val = parseInt(el.textContent || '', 10);
      if (!isNaN(val) && val > 0) return val;
    }
  }
  return null;
}

export function parseTcx(tcxContent: string): {
  points: Point[];
  summary: CsvSummary;
  notes: string | null;
} {
  if (typeof window === 'undefined') {
    return { points: [], summary: { startTime: null, endTime: null, durationMinutes: null, totalSeconds: 0, totalSteps: null, totalDistance: null, pointsCount: 0 }, notes: null };
  }
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(tcxContent, 'application/xml');
  const trackpoints = Array.from(xmlDoc.getElementsByTagName('Trackpoint'));
  if (trackpoints.length === 0) return { points: [], summary: { startTime: null, endTime: null, durationMinutes: null, totalSeconds: 0, totalSteps: null, totalDistance: null, pointsCount: 0 }, notes: null };

  const parsedPoints: Point[] = trackpoints
    .map((tp) => {
      const timeEl = tp.getElementsByTagName('Time')[0];
      const latEl = tp.getElementsByTagName('LatitudeDegrees')[0];
      const lonEl = tp.getElementsByTagName('LongitudeDegrees')[0];
      const distEl = tp.getElementsByTagName('DistanceMeters')[0];
      const eleEl = tp.getElementsByTagName('AltitudeMeters')[0];
      const hrValue = extractHrValue(tp);
      const cadenceEl = tp.getElementsByTagName('Cadence')[0] || tp.getElementsByTagName('RunCadence')[0];
      const timestamp = timeEl?.textContent ? new Date(timeEl.textContent).getTime() : null;
      if (!timestamp) return null;

      return {
        timestamp,
        lat: latEl?.textContent ? parseFloat(latEl.textContent) : null,
        lon: lonEl?.textContent ? parseFloat(lonEl.textContent) : null,
        ele: eleEl?.textContent ? parseFloat(eleEl.textContent) : null,
        distance: distEl?.textContent ? parseFloat(distEl.textContent) : null,
        cadence: cadenceEl?.textContent ? parseInt(cadenceEl.textContent, 10) : null,
        heart_rate_bpm: hrValue,
        steps: null,
        speed: null,
      } as Point;
    })
    .filter((p): p is Point => p !== null && p.timestamp !== null && !isNaN(p.timestamp));

  parsedPoints.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  normalizeHeartRate(parsedPoints);

  for (let i = 1; i < parsedPoints.length; i++) {
    const prev = parsedPoints[i - 1];
    const curr = parsedPoints[i];
    const timeDeltaSeconds = (curr.timestamp! - prev.timestamp!) / 1000;
    if (timeDeltaSeconds > 0) {
      if (curr.distance !== null && prev.distance !== null && curr.distance > prev.distance) {
        curr.speed = (curr.distance - prev.distance) / timeDeltaSeconds;
      } else if (curr.lat !== null && prev.lat !== null && curr.lon !== null && prev.lon !== null) {
        curr.speed = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon) / timeDeltaSeconds;
      }
    }
  }

  const startTime = parsedPoints[0]?.timestamp;
  const endTime = parsedPoints[parsedPoints.length - 1]?.timestamp;
  const totalSeconds = (startTime && endTime) ? (endTime - startTime) / 1000 : 0;
  const hrPoints = parsedPoints.map((p) => p.heart_rate_bpm).filter((hr): hr is number => hr !== null);

  return {
    points: parsedPoints,
    summary: {
      startTime: startTime ? new Date(startTime).toLocaleString() : null,
      endTime: endTime ? new Date(endTime).toLocaleString() : null,
      durationMinutes: Math.round(totalSeconds / 60),
      totalSeconds,
      totalSteps: null,
      totalDistance: 0,
      pointsCount: parsedPoints.length,
      hasHeartRateData: hrPoints.length > 0,
      hrSampleCount: hrPoints.length,
      hrMin: hrPoints.length > 0 ? Math.min(...hrPoints) : null,
      hrMax: hrPoints.length > 0 ? Math.max(...hrPoints) : null,
      hrAvg: hrPoints.length > 0 ? Math.round(hrPoints.reduce((a, b) => a + b, 0) / hrPoints.length) : null,
    },
    notes: 'Validation based on Human Locomotion state machine.',
  };
}

export function parseGpx(gpxContent: string): {
  points: Point[];
  summary: CsvSummary;
  notes: string | null;
} {
  if (typeof window === 'undefined') {
    return { points: [], summary: { startTime: null, endTime: null, durationMinutes: null, totalSeconds: 0, totalSteps: null, totalDistance: null, pointsCount: 0 }, notes: null };
  }
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(gpxContent, 'application/xml');
  const trackpoints = Array.from(xmlDoc.getElementsByTagName('trkpt'));
  if (trackpoints.length === 0) return { points: [], summary: { startTime: null, endTime: null, durationMinutes: null, totalSeconds: 0, totalSteps: null, totalDistance: null, pointsCount: 0 }, notes: null };

  const parsedPoints: Point[] = trackpoints
    .map((tp) => {
      const timeEl = tp.getElementsByTagName('time')[0];
      const eleEl = tp.getElementsByTagName('ele')[0];
      const lat = tp.getAttribute('lat');
      const lon = tp.getAttribute('lon');
      const timestamp = timeEl?.textContent ? new Date(timeEl.textContent).getTime() : null;
      const hrValue = extractHrValue(tp);
      if (!timestamp || !lat || !lon) return null;
      return {
        timestamp,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        ele: eleEl?.textContent ? parseFloat(eleEl.textContent) : null,
        heart_rate_bpm: hrValue,
        distance: null,
        cadence: null,
        steps: null,
        speed: null,
      } as Point;
    })
    .filter((p): p is Point => p !== null && p.timestamp !== null && !isNaN(p.timestamp));

  parsedPoints.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  normalizeHeartRate(parsedPoints);

  for (let i = 1; i < parsedPoints.length; i++) {
    const prev = parsedPoints[i - 1];
    const curr = parsedPoints[i];
    const segmentDurationSec = (curr.timestamp! - prev.timestamp!) / 1000;
    if (segmentDurationSec > 0 && prev.lat && prev.lon && curr.lat && curr.lon) {
      curr.speed = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon) / segmentDurationSec;
    }
  }

  const startTime = parsedPoints[0]?.timestamp;
  const endTime = parsedPoints[parsedPoints.length - 1]?.timestamp;
  const totalSeconds = (startTime && endTime) ? (endTime - startTime) / 1000 : 0;
  const hrPoints = parsedPoints.map((p) => p.heart_rate_bpm).filter((hr): hr is number => hr !== null);

  return {
    points: parsedPoints,
    summary: {
      startTime: startTime ? new Date(startTime).toLocaleString() : null,
      endTime: endTime ? new Date(endTime).toLocaleString() : null,
      durationMinutes: Math.round(totalSeconds / 60),
      totalSeconds,
      totalSteps: null,
      totalDistance: 0,
      pointsCount: parsedPoints.length,
      hasHeartRateData: hrPoints.length > 0,
      hrSampleCount: hrPoints.length,
      hrMin: hrPoints.length > 0 ? Math.min(...hrPoints) : null,
      hrMax: hrPoints.length > 0 ? Math.max(...hrPoints) : null,
      hrAvg: hrPoints.length > 0 ? Math.round(hrPoints.reduce((a, b) => a + b, 0) / hrPoints.length) : null,
    },
    notes: 'GPS analysis with Human Heart Rate telemetry.',
  };
}

function runValidation(points: Point[], config: ControlSettings): ValidationReport {
  const segmentLedger: LedgerSegment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dt_seconds = (p2.timestamp! - p1.timestamp!) / 1000;
    const dist = p1.lat != null && p1.lon != null && p2.lat != null && p2.lon != null ? haversineDistance(p1.lat, p1.lon, p2.lat, p2.lon) : 0;
    const speed = dt_seconds > 0 ? dist / dt_seconds : 0;
    const v_change = p2.ele !== null && p1.ele !== null ? p2.ele - p1.ele : 0;
    const avgHr = (p1.heart_rate_bpm !== null && p2.heart_rate_bpm !== null) ? (p1.heart_rate_bpm + p2.heart_rate_bpm) / 2 : (p1.heart_rate_bpm ?? p2.heart_rate_bpm);

    segmentLedger.push({
      segment_id: i + 1,
      t_start: p1.timestamp!,
      t_end: p2.timestamp!,
      lat1: p1.lat, lon1: p1.lon, ele1: p1.ele,
      lat2: p2.lat, lon2: p2.lon, ele2: p2.ele,
      dt_seconds, distance_meters: dist, speed_mps: speed,
      vertical_change_meters: v_change, slope: dist > 0 ? v_change / dist : 0,
      flags: [], movementMode: 'UNKNOWN', walkBlockSeconds: 0,
      classification: 'unknown', confidence: 1.0, heart_rate_bpm: avgHr !== undefined ? avgHr : null,
    });
  }

  const stopSpeedThresholdMs = 0.20;
  const stopMinDurationSeconds = 8;
  const walkMin = config.validWalkingSpeedBand.min;
  const walkMax = config.validWalkingSpeedBand.max;
  const vehicleTrigger = config.vehicleSpeedTriggerThreshold;
  const vehicleSustain = config.sustainedHighSpeedDurationThreshold;
  const vehicleDropTol = config.lowSpeedDropToleranceWindow;
  const gpsMax = config.gpsJumpMaxSpeed;

  let currentMode: MovementMode = 'UNKNOWN';
  let highSpeedSeconds = 0;
  let lowSpeedSeconds = 0;
  let stoppedSeconds = 0;
  let walkBlockSeconds = 0;
  let inLocomotionBandSeconds = 0;

  for (let i = 0; i < segmentLedger.length; i++) {
    const seg = segmentLedger[i];
    const speed = seg.speed_mps;
    const dt = seg.dt_seconds;

    if (speed > gpsMax) {
      seg.classification = 'gps_artifact';
      currentMode = 'UNKNOWN';
      continue;
    }

    if (speed >= vehicleTrigger) {
      highSpeedSeconds += dt;
      if (highSpeedSeconds >= vehicleSustain) currentMode = 'CAR';
      lowSpeedSeconds = 0;
    } else {
      lowSpeedSeconds += dt;
      if (currentMode === 'CAR') {
        const isWithinWalkBand = speed >= walkMin && speed <= walkMax;
        if (isWithinWalkBand) inLocomotionBandSeconds += dt;
        else inLocomotionBandSeconds = 0;
        if (lowSpeedSeconds >= vehicleDropTol && inLocomotionBandSeconds >= 10) currentMode = 'WALK';
      } else {
        highSpeedSeconds = 0;
      }
    }

    if (currentMode === 'CAR') {
      seg.classification = 'non_human_transport';
    } else {
      if (speed < stopSpeedThresholdMs) {
        stoppedSeconds += dt;
        seg.classification = stoppedSeconds >= stopMinDurationSeconds ? 'stationary' : 'walking';
      } else if (speed >= walkMin && speed <= walkMax) {
        seg.classification = 'walking';
        stoppedSeconds = 0;
      } else {
        seg.classification = 'unknown';
        stoppedSeconds = 0;
      }
    }
    walkBlockSeconds = seg.classification === 'walking' ? walkBlockSeconds + dt : 0;
    seg.movementMode = currentMode === 'CAR' ? 'CAR' : (currentMode === 'WALK' ? 'WALK' : 'UNKNOWN');
    seg.walkBlockSeconds = walkBlockSeconds;
  }

  let activeWalkingSec = 0, stationarySec = 0, excludedSec = 0, vehicleSec = 0;
  segmentLedger.forEach((seg) => {
    if (seg.classification === 'non_human_transport') vehicleSec += seg.dt_seconds;
    else if (seg.classification === 'gps_artifact') excludedSec += seg.dt_seconds;
    else if (seg.classification === 'stationary') stationarySec += seg.dt_seconds;
    else if (seg.classification === 'walking') activeWalkingSec += seg.dt_seconds;
  });

  return {
    segmentLedger,
    totalSeconds: segmentLedger.reduce((acc, s) => acc + s.dt_seconds, 0),
    totalMinutes: segmentLedger.reduce((acc, s) => acc + s.dt_seconds, 0) / 60,
    activeMinutes: activeWalkingSec / 60,
    inactiveMinutes: stationarySec / 60,
    excludedMinutes: (excludedSec + vehicleSec) / 60,
    activeWalkingSec,
    stationarySec,
    excludedSec,
    vehicleSec,
    excludedBreakdown: { gps_artifact: excludedSec, non_human_transport: vehicleSec, vertical_transport: 0, unknown: 0 },
    decisionStatus: 'Approved',
    decisionReason: 'Human movement validated.',
    debugWarnings: [],
  };
}

export function segmentAndValidate(points: Point[]): ValidationReport {
  if (points.length < 2) {
    return { segmentLedger: [], totalSeconds: 0, totalMinutes: 0, activeMinutes: 0, inactiveMinutes: 0, excludedMinutes: 0, activeWalkingSec: 0, stationarySec: 0, excludedSec: 0, vehicleSec: 0, excludedBreakdown: { gps_artifact: 0, non_human_transport: 0, vertical_transport: 0, unknown: 0 }, decisionStatus: 'Not Assessed', decisionReason: 'Insufficient points.', debugWarnings: [] };
  }
  const config = getControls('human');
  return runValidation(points, config);
}

export function parseCsv(csvContent: string): { points: Point[]; summary: CsvSummary; } {
  const lines = csvContent.trim().split(/\n/);
  const points: Point[] = lines.slice(1).map((line) => {
    const v = line.split(',');
    return { timestamp: new Date(v[0]).getTime(), lat: parseFloat(v[1]), lon: parseFloat(v[2]), ele: null, heart_rate_bpm: null, distance: null, cadence: null, steps: null, speed: null } as Point;
  }).filter((p) => !isNaN(p.timestamp!));
  const startTime = points.length > 0 ? points[0].timestamp : null;
  const endTime = points.length > 0 ? points[points.length - 1].timestamp : null;
  const totalSeconds = (startTime && endTime) ? (endTime - startTime) / 1000 : 0;
  return { points, summary: { startTime: startTime ? new Date(startTime).toLocaleString() : null, endTime: endTime ? new Date(endTime).toLocaleString() : null, durationMinutes: Math.round(totalSeconds / 60), totalSeconds, totalSteps: null, totalDistance: null, pointsCount: points.length, hasHeartRateData: false } };
}