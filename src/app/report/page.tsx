'use client';

import { useEffect, useState, Suspense, useMemo, useCallback, memo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  Heart,
  Map as MapIcon,
} from 'lucide-react';
import {
  parseCsv,
  parseTcx,
  parseGpx,
  type Point,
  segmentAndValidate,
} from '@/lib/csv-parser';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer,
  ChartTooltip,
} from '@/components/ui/chart';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  Bar,
} from 'recharts';
import { getControls, type ControlSettings } from '@/lib/controls';
import { getEconomics, type EconomicsSettings } from '@/lib/economics';
import { GoogleMap, useJsApiLoader, Polyline, Marker } from '@react-google-maps/api';
import { getUpload, type Upload } from '@/lib/library';

const CustomMovementTooltip = memo(({ active, payload, label, segmentLedger }: any) => {
  if (active && payload && payload.length && segmentLedger) {
    const data = payload[0].payload;
    const speed = data.speed;
    const hr = data.heart_rate_bpm;
    const minuteStart = data.minuteStartUtc;
    const minuteEnd = data.minuteEndUtc;
    
    const representativeSeg = segmentLedger.find((s: any) => s.t_start >= minuteStart && s.t_end <= minuteEnd) || 
                             segmentLedger.find((s: any) => s.t_start < minuteEnd && s.t_end > minuteStart);
    const mode = representativeSeg?.movementMode || 'UNKNOWN';

    return (
      <div className="rounded-md border border-border bg-background p-2 text-popover-foreground shadow-none">
        <div className="grid grid-cols-1 gap-1 text-[10px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Minute:</span>
            <span className="font-semibold">{label}</span>
          </div>
          <Separator className="my-0.5 opacity-30"/>
          {speed !== undefined && speed !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-foreground uppercase tracking-tight">Speed:</span>
              <span className="font-semibold">{speed.toFixed(2)} m/s</span>
            </div>
          )}
          {hr !== undefined && hr !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-foreground uppercase tracking-tight">HR:</span>
              <span className="font-semibold text-destructive">{hr} BPM</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Mode:</span>
            <span className="font-semibold text-primary">{mode}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
});
CustomMovementTooltip.displayName = 'CustomMovementTooltip';

const HeartbeatTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const bpm = payload[0].value;
    return (
      <div className="rounded-md border border-border bg-background p-2 text-popover-foreground shadow-none">
        <div className="grid grid-cols-1 gap-1 text-[10px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Minute:</span>
            <span className="font-semibold">{label}</span>
          </div>
          <Separator className="my-0.5 opacity-30"/>
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Intensity:</span>
            <span className="font-semibold text-destructive">{bpm ? `${bpm} BPM` : '—'}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
});
HeartbeatTooltip.displayName = 'HeartbeatTooltip';

const CreditTimelineTooltip = memo(({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const minuteCredits = data.minuteCredits ?? 0;
    const cumulative = data.cumulative ?? 0;
    const hr = data.heart_rate_bpm;
    const isEligible = minuteCredits > 0;
    return (
      <div className="rounded-md border border-border bg-background p-2 text-popover-foreground shadow-none">
        <div className="grid grid-cols-1 gap-1 text-[10px]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Minute:</span>
            <span className="font-semibold">{label}</span>
          </div>
          <Separator className="my-0.5 opacity-30"/>
          {hr !== undefined && hr !== null && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-foreground uppercase tracking-tight">Avg HR:</span>
              <span className="font-semibold text-destructive">{hr} BPM</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Eligible:</span>
            <span className={`font-semibold ${isEligible ? 'text-ledger-green' : 'text-foreground'}`}>
              {isEligible ? 'YES' : 'NO'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-foreground uppercase tracking-tight">Cumulative:</span>
            <span className="font-semibold text-ledger-green">{cumulative.toFixed(4)}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
});
CreditTimelineTooltip.displayName = 'CreditTimelineTooltip';

function RouteExplorer({ points }: { points: Point[] }) {
  const apiKey = 'AIzaSyBon80gKClZExXNGH4-nXnNx0jMEIXB9OA';
  const mapRef = useRef<google.maps.Map | null>(null);
  const [zoom, setZoom] = useState(12);
  const { isLoaded, loadError } = useJsApiLoader({ id: 'google-map-script', googleMapsApiKey: apiKey });

  const fullPath = useMemo(() => points.filter(p => p.lat !== null && p.lon !== null).map(p => ({ lat: p.lat!, lng: p.lon! })), [points]);
  const fiveMinuteMarkers = useMemo(() => {
    if (!points || points.length === 0) return [];
    const markers: { lat: number; lng: number; minuteValue: number }[] = [];
    const seenMinutes = new Set<number>();
    const startTs = points[0].timestamp || 0;
    for (const p of points) {
      if (p.lat === null || p.lon === null || p.timestamp === null) continue;
      const elapsedMinutes = Math.floor((p.timestamp - startTs) / 60000);
      if (elapsedMinutes >= 5 && elapsedMinutes % 5 === 0 && !seenMinutes.has(elapsedMinutes)) {
        markers.push({ lat: p.lat, lng: p.lon, minuteValue: elapsedMinutes });
        seenMinutes.add(elapsedMinutes);
      }
    }
    return markers;
  }, [points]);

  const visibleMarkers = useMemo(() => {
    if (fiveMinuteMarkers.length === 0) return [];
    const minDistanceMeters = Math.pow(2, 22 - zoom); 
    const filtered: typeof fiveMinuteMarkers = [];
    fiveMinuteMarkers.forEach(m => {
      const isTooClose = filtered.some(f => {
        const dx = m.lat - f.lat;
        const dy = m.lng - f.lng;
        return (Math.sqrt(dx*dx + dy*dy) * 111139) < minDistanceMeters;
      });
      if (!isTooClose) filtered.push(m);
    });
    return filtered;
  }, [fiveMinuteMarkers, zoom]);

  const onLoad = useCallback(function callback(map: google.maps.Map) {
    mapRef.current = map;
    window.google.maps.event.addListenerOnce(map, 'tilesloaded', () => {
      map.setMapTypeId(window.google.maps.MapTypeId.SATELLITE);
    });
    if (fullPath.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      fullPath.forEach(p => bounds.extend(p));
      map.fitBounds(bounds);
    }
    setZoom(map.getZoom() || 12);
  }, [fullPath]);

  const markerScale = useMemo(() => Math.max(8, Math.min(14, zoom * 0.7)), [zoom]);

  return (
    <div className="space-y-6 print:break-inside-avoid">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-foreground flex items-center gap-2">
            <MapIcon className="h-3 w-3" />
            Route Explorer
          </h2>
          <p className="text-xs text-foreground">Satellite view of validated path telemetry.</p>
        </div>
      </div>
      <Card className="overflow-hidden border border-border shadow-none bg-background">
        {loadError ? (
          <div className="flex h-[400px] w-full flex-col items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-8 text-center text-destructive">
            <AlertTriangle className="mb-4 h-12 w-12" />
            <h3 className="text-base font-semibold">Map Loading Error</h3>
          </div>
        ) : isLoaded ? (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '400px', borderRadius: '0.5rem' }}
            zoom={12}
            onLoad={onLoad}
            onZoomChanged={() => { if (mapRef.current) setZoom(mapRef.current.getZoom() || 12); }}
            options={{ 
              mapTypeId: "satellite",
              disableDefaultUI: true, 
              mapTypeControl: false, 
              streetViewControl: false, 
              fullscreenControl: false, 
              zoomControl: false, 
              styles: [{ "featureType": "poi", "stylers": [{ "visibility": "off" }] }, { "featureType": "all", "elementType": "labels", "stylers": [{ "visibility": "off" }] }] 
            }}
          >
            {fullPath.length > 1 && <Polyline path={fullPath} options={{ strokeColor: '#f97316', strokeOpacity: 1.0, strokeWeight: 4 }} />}
            {visibleMarkers.map((m) => (
              <Marker key={`min-marker-${m.minuteValue}`} position={{ lat: m.lat, lng: m.lng }} clickable={false}
                icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#FFFFFF', fillOpacity: 1.0, strokeColor: '#000000', strokeWeight: 1.5, scale: markerScale, labelOrigin: new window.google.maps.Point(0, 0) }}
                label={{ text: m.minuteValue.toString(), color: '#000000', fontSize: `${markerScale * 0.9}px`, fontWeight: 'bold', fontFamily: 'Inter, sans-serif' }}
              />
            ))}
            {fullPath.length > 0 && (
                <>
                    <Marker position={fullPath[0]} clickable={false} icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#FFFFFF', fillOpacity: 1, strokeColor: '#000000', strokeWeight: 1.5, scale: 5 }} />
                    <Marker position={fullPath[fullPath.length - 1]} clickable={false} icon={{ path: window.google.maps.SymbolPath.CIRCLE, fillColor: '#FFFFFF', fillOpacity: 1, strokeColor: '#000000', strokeWeight: 1.5, scale: 5 }} />
                </>
            )}
          </GoogleMap>
        ) : <Skeleton className="h-[400px] w-full" />}
      </Card>
    </div>
  );
}

const HeartbeatChart = memo(({ data, totalMinutes, hoverMinuteIndex, onMouseMove, onMouseLeave }: any) => {
  return (
    <div className="flex flex-col bg-background p-0 shadow-none">
      <div className="h-[250px] w-full">
        <ChartContainer config={{ heart_rate_bpm: { label: `Heart Rate (bpm)`, color: '#FF0000' }}} className="h-full w-full">
          <ComposedChart syncId="wearonomics-timeline" data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={[0, totalMinutes]} 
              tickFormatter={(v) => Math.round(v).toString()} 
              axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#000000' }} 
              tickMargin={12} 
              minTickGap={40} 
            />
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tickMargin={8} 
              width={35} 
              domain={['dataMin - 10', 'dataMax + 10']} 
              tick={{ fontSize: 9, fill: '#000000' }} 
            />
            <ChartTooltip cursor={false} content={<HeartbeatTooltip />} isAnimationActive={false} />
            {hoverMinuteIndex !== null && <ReferenceLine x={hoverMinuteIndex} stroke="#000000" strokeWidth={1} opacity={0.5} />}
            <Line 
              dataKey="heart_rate_bpm" 
              name="Heart Rate" 
              type="monotone" 
              stroke="#FF0000" 
              strokeWidth={1.5} 
              dot={false} 
              connectNulls={false}
              isAnimationActive={false} 
            />
          </ComposedChart>
        </ChartContainer>
      </div>
      <p className="mt-4 text-[9px] text-[#000000] uppercase tracking-[0.2em] font-medium">Cardiovascular Intensity Index</p>
    </div>
  );
});
HeartbeatChart.displayName = 'HeartbeatChart';

const CreditTimelineChart = memo(({ data, totalMinutes, hoverMinuteIndex, onMouseMove, onMouseLeave }: any) => {
  return (
     <div className="flex flex-col bg-background p-0 shadow-none">
      <div className="h-[250px] w-full">
        <ChartContainer config={{ cumulative: { label: `Cumulative Credits`, color: '#008000' }, minuteCredits: { label: `Minute Credits`, color: '#000000' }}} className="h-full w-full">
          <ComposedChart syncId="wearonomics-timeline" data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}>
            <CartesianGrid vertical={false} strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis 
              dataKey="time" 
              type="number" 
              domain={[0, totalMinutes]} 
              tickFormatter={(value) => Math.round(value).toString()} 
              axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#000000' }} 
              tickMargin={12} 
              minTickGap={40} 
            />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} width={35} domain={[0, 'dataMax + 0.1']} tick={{ fontSize: 9, fill: '#000000' }} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} width={35} tick={{ fontSize: 9, fill: '#000000' }} />
            <ChartTooltip cursor={false} content={<CreditTimelineTooltip />} isAnimationActive={false} />
            {hoverMinuteIndex !== null && <ReferenceLine x={hoverMinuteIndex} stroke="#000000" strokeWidth={1} yAxisId="left" opacity={0.5} />}
            <Bar yAxisId="left" dataKey="minuteCredits" fill="#000000" opacity={0.4} radius={[1, 1, 0, 0]} isAnimationActive={false} />
            <Line yAxisId="right" dataKey="cumulative" type="monotone" stroke="#008000" strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ChartContainer>
      </div>
      <p className="mt-4 text-[9px] text-[#000000] uppercase tracking-[0.2em] font-medium">Block-Enforced Credit Accumulation</p>
    </div>
  );
});
CreditTimelineChart.displayName = 'CreditTimelineChart';

function WearonomicsEngineNarrative({ processedData, creditTimelineSummary }: { processedData: any; creditTimelineSummary: any }) {
  const { summary, validationReport } = processedData;
  const { segmentLedger } = validationReport;

  const totalDuration = summary.durationMinutes || 0;
  const validatedMinutes = (validationReport.activeWalkingSec / 60) || 0;
  const totalDistanceMeters = segmentLedger.reduce((acc: number, s: any) => acc + s.distance_meters, 0);
  const totalDistanceKm = (totalDistanceMeters / 1000).toFixed(2);
  const locomotionSegments = segmentLedger.filter((s: any) => s.classification === 'walking');
  const locomotionDistance = locomotionSegments.reduce((acc: number, s: any) => acc + s.distance_meters, 0);
  const avgLocomotionSpeed = (validationReport.activeWalkingSec > 0 
    ? (locomotionDistance / validationReport.activeWalkingSec)
    : 0).toFixed(2);

  const vehicleSec = validationReport.vehicleSec || 0;
  const vehicleMinutes = (vehicleSec / 60).toFixed(1);
  const vehiclePercent = totalDuration > 0 ? ((vehicleSec / (totalDuration * 60)) * 100).toFixed(1) : "0";

  const stationarySegments = segmentLedger.filter((s: any) => s.classification === 'stationary');
  const numPauses = stationarySegments.length;
  const maxPauseSec = stationarySegments.length > 0 
    ? Math.max(...stationarySegments.map((s: any) => s.dt_seconds)) 
    : 0;
  const excludedSec = validationReport.excludedSec || 0;

  const hasHr = summary.hasHeartRateData;
  const totalCredits = creditTimelineSummary.total.toFixed(4);
  const eligibilityPercent = totalDuration > 0 ? ((validatedMinutes / totalDuration) * 100).toFixed(1) : "0";

  const paragraphs = [
    `The Wearonomics Engine analyzed a session lasting ${totalDuration} minutes, identifying ${validatedMinutes.toFixed(1)} minutes of validated human walking over ${totalDistanceKm} kilometers. The average walking velocity of ${avgLocomotionSpeed} m/s remained within physiologically plausible human thresholds.`,
    vehicleSec > 0 
      ? `Sustained high-velocity segments exceeding walking thresholds were classified as vehicle transport. These segments accounted for ${vehiclePercent}% of total time (${vehicleMinutes} minutes) and were excluded from credit attribution.`
      : `The session exhibited no sustained vehicle-level acceleration patterns.`,
    `The Engine identified ${numPauses} pause intervals${numPauses > 0 ? `, the longest lasting ${maxPauseSec.toFixed(0)} seconds` : ''}. ${excludedSec > 0 ? `An audit of kinetic consistency identified ${excludedSec.toFixed(0)} seconds of sensor artifacts. These irregularities were isolated to maintain the integrity of the movement evidence.` : `No major movement inconsistencies were detected, indicating high-fidelity sensor telemetry throughout the session window.`}`,
    hasHr ? `Heart rate dynamics ranged between ${summary.hrMin || 0} and ${summary.hrMax || 0} bpm, reflecting cardiovascular engagement consistent with sustained outdoor locomotion.` : '',
    `Following anomaly filtering and vehicle exclusion, the session generated ${totalCredits} Wearonomics Credits, reflecting ${eligibilityPercent}% session eligibility for validated human walking.`
  ].filter(p => p !== '');

  return (
    <section className="space-y-6 print:break-inside-avoid">
      <div className="space-y-1">
        <h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000]">Wearonomics Engine Narrative</h2>
        <p className="text-[10px] text-[#000000]">Analytical narrative generated by the Wearonomics Engine.</p>
        <Separator className="opacity-10 mt-2" />
      </div>
      <div className="w-full space-y-4">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed font-light text-justify text-[#000000]">{p}</p>
        ))}
      </div>
    </section>
  );
}

function ReportPageContent() {
  const searchParams = useSearchParams();
  const [uploadData, setUploadData] = useState<Upload | null>(null);
  const [controls, setControls] = useState<ControlSettings | null>(null);
  const [economics, setEconomics] = useState<EconomicsSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverMinuteIndex, setHoverMinuteIndex] = useState<number | null>(null);

  useEffect(() => {
    const uploadId = searchParams.get('id');
    if (uploadId) { 
      const data = getUpload(uploadId); 
      if (data) {
        setUploadData(data);
        setControls(getControls('human'));
      }
    }
    setEconomics(getEconomics());
    setIsLoading(false);
  }, [searchParams]);

  const processedData = useMemo(() => {
    if (!uploadData) return null;
    try {
      const fileName = uploadData.fileName.toLowerCase();
      let localPoints: Point[] = [];
      let fileSummary: any = null;
      if (fileName.endsWith('.csv')) { const parsed = parseCsv(uploadData.fileContent); localPoints = parsed.points; fileSummary = parsed.summary; }
      else if (fileName.endsWith('.tcx')) { const parsed = parseTcx(uploadData.fileContent); localPoints = parsed.points; fileSummary = parsed.summary; }
      else if (fileName.endsWith('.gpx')) { const parsed = parseGpx(uploadData.fileContent); localPoints = parsed.points; fileSummary = parsed.summary; }
      if (localPoints.length > 0 && fileSummary) return { points: localPoints, summary: fileSummary, validationReport: segmentAndValidate(localPoints) };
    } catch (e) { console.error('Processing failed', e); }
    return null;
  }, [uploadData?.id, uploadData?.fileContent, uploadData?.fileName]);

  const timelineData = useMemo(() => {
    if (!processedData || !economics || !controls) return [];
    const { points, validationReport } = processedData;
    const startTs = points[0].timestamp || 0;
    const endTs = points[points.length - 1].timestamp || 0;
    const totalMinutesCount = Math.floor((endTs - startTs) / 60000) + 1;
    let cumulative = 0;

    return Array.from({ length: totalMinutesCount }, (_, i) => {
      const mStart = startTs + i * 60000;
      const mEnd = mStart + 60000;
      const windowPoints = points.filter(p => p.timestamp !== null && p.timestamp >= mStart && p.timestamp < mEnd);
      let avgSpeed = null, avgHr = null;
      if (windowPoints.length > 0) {
        const vs = windowPoints.map(p => p.speed).filter((s): s is number => s !== null);
        if (vs.length > 0) avgSpeed = vs.reduce((a, b) => a + b, 0) / vs.length;
        const vh = windowPoints.map(p => p.heart_rate_bpm).filter((h): h is number => h !== null);
        if (vh.length > 0) avgHr = Math.round(vh.reduce((a, b) => a + b, 0) / vh.length);
      }
      let vSecInMinute = 0;
      validationReport.segmentLedger.forEach(seg => {
        if (seg.classification === 'walking') {
          const oStart = Math.max(seg.t_start, mStart);
          const oEnd = Math.min(seg.t_end, mEnd);
          if (oEnd > oStart) vSecInMinute += (oEnd - oStart) / 1000;
        }
      });
      const mCredits = vSecInMinute >= 30 ? economics.creditRatePerMinute : 0;
      cumulative += mCredits;
      return { time: i, speed: avgSpeed, heart_rate_bpm: avgHr, minuteCredits: mCredits, cumulative, minuteStartUtc: mStart, minuteEndUtc: mEnd };
    });
  }, [processedData, economics, controls]);

  const creditSummary = useMemo(() => ({ total: timelineData.length > 0 ? timelineData[timelineData.length - 1].cumulative : 0, active: timelineData.filter(m => m.minuteCredits > 0).length }), [timelineData]);
  const handleMouseMove = useCallback((e: any) => { if (e && e.activeTooltipIndex !== undefined) setHoverMinuteIndex(e.activeTooltipIndex); }, []);
  const handleMouseLeave = useCallback(() => setHoverMinuteIndex(null), []);

  if (isLoading) return <div className="space-y-12"><Skeleton className="h-10 w-1/3" /><Card className="border-border shadow-none"><CardContent className="space-y-6">{[...Array(5)].map((_, i) => <div key={i} className="space-y-2"><Skeleton className="h-6 w-1/4" /><Skeleton className="h-4 w-full" /></div>)}</CardContent></Card></div>;
  if (!uploadData || !processedData) return null;
  const { points, validationReport } = processedData;

  return (
    <div className="space-y-16 py-4 bg-background min-h-screen print:py-0">
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center print:hidden">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-[#000000]">Analysis Report</h1>
          <p className="text-[10px] uppercase tracking-widest text-[#000000]">Validation Profile: Human</p>
          <p className="text-[9px] uppercase tracking-[0.2em] font-light text-[#000000]">Locomotion {(validationReport.activeWalkingSec/60).toFixed(1)}m, Vehicle {(validationReport.vehicleSec/60).toFixed(1)}m, Stopped {(validationReport.stationarySec/60).toFixed(1)}m</p>
        </div>
      </div>
      <div className="space-y-20 print:space-y-12">
        <WearonomicsEngineNarrative processedData={processedData} creditTimelineSummary={creditSummary} />
        <RouteExplorer points={points} />
        <section className="space-y-6 print:break-inside-avoid">
          <div className="space-y-1"><h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000]">Movement Validation Timeline</h2><p className="text-xs text-[#000000]">Speed tracking and state machine classification.</p></div>
          <div className="flex flex-col bg-background p-0 shadow-none"><div className="h-[250px] w-full"><ChartContainer config={{ speed: { label: `Speed (m/s)`, color: '#000000' }}} className="h-full w-full"><ComposedChart syncId="wearonomics-timeline" data={timelineData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}><CartesianGrid vertical={false} strokeDasharray="2 4" stroke="hsl(var(--border))" opacity={0.3} /><XAxis dataKey="time" type="number" domain={[0, 'dataMax']} tickFormatter={(v) => Math.round(v).toString()} axisLine={{ stroke: 'hsl(var(--border))', strokeWidth: 1 }} tickLine={false} tick={{ fontSize: 10, fill: '#000000' }} tickMargin={12} minTickGap={40} /><YAxis tickLine={false} axisLine={false} tickMargin={8} width={35} tick={{ fontSize: 9, fill: '#000000' }} /><ChartTooltip cursor={false} content={<CustomMovementTooltip segmentLedger={validationReport.segmentLedger} />} isAnimationActive={false} />{hoverMinuteIndex !== null && <ReferenceLine x={hoverMinuteIndex} stroke="#000000" strokeWidth={1} opacity={0.5} />}<Line dataKey="speed" name="Speed" type="monotone" stroke="#000000" strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} /></ComposedChart></ChartContainer></div><p className="mt-4 text-[9px] text-[#000000] uppercase tracking-[0.2em] font-medium">Kinetic Velocity Index</p></div>
        </section>
        <section className="space-y-6 print:break-inside-avoid">
          <div className="space-y-1"><h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000] flex items-center gap-2"><Heart className="h-3 w-3" />Heartbeat Timeline</h2><p className="text-xs text-[#000000]">Heart rate dynamics synchronized with movement.</p></div>
          {timelineData.some(d => d.heart_rate_bpm !== null) ? <HeartbeatChart data={timelineData} totalMinutes={timelineData.length-1} hoverMinuteIndex={hoverMinuteIndex} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} /> : <div className="flex h-[250px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/5"><p className="text-[10px] uppercase tracking-widest text-[#000000]">No heart rate telemetry available.</p></div>}
        </section>
        <section className="space-y-6 print:break-inside-avoid">
          <div className="space-y-1"><h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000]">Credit Timeline</h2><p className="text-xs text-[#000000]">Sustained locomotion credit accumulation.</p></div>
          <CreditTimelineChart data={timelineData} totalMinutes={timelineData.length-1} hoverMinuteIndex={hoverMinuteIndex} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} />
        </section>
        <WearonomicsNarrativeReport uploadData={uploadData} validationReport={validationReport} totalCredits={creditSummary.total} eligibleMinutes={creditSummary.active} rate={economics?.creditRatePerMinute || 0.10} />
      </div>
    </div>
  );
}

function WearonomicsNarrativeReport({ uploadData, validationReport, totalCredits, eligibleMinutes, rate }: { uploadData: Upload; validationReport: any; totalCredits: number; eligibleMinutes: number; rate: number }) {
  const analysisDate = new Date(uploadData.uploadedAt || 0).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="space-y-12 py-4 border-t border-border pt-16 print:pt-8 print:break-inside-avoid">
      <div className="space-y-2"><h2 className="text-[10px] uppercase tracking-[0.2em] font-semibold text-[#000000]">Dataset Interpretation</h2><p className="text-xs text-[#000000]">Analyzed on {analysisDate}</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-xs leading-relaxed text-[#000000] print:gap-8"><div className="space-y-4"><p>The Wearonomics Engine analyzed this activity using high-precision human locomotion modeling. Vehicle segments were detected and excluded based on sustained velocity thresholds.</p><div className="pt-4 border-t border-border space-y-2"><p className="flex justify-between"><span>Vehicle detection:</span> <span className="font-medium">{(validationReport.vehicleSec / 60).toFixed(1)}m</span></p><p className="flex justify-between text-[10px] uppercase tracking-widest"><span>Profile:</span><span className="font-medium">Human</span></p></div></div><div className="space-y-6 border-l border-border pl-8 print:pl-4"><div className="space-y-2"><p className="text-[9px] uppercase tracking-widest font-semibold">Ledger Summary</p><div className="space-y-3"><p className="flex justify-between items-center"><span>Sustained Blocks:</span><span className="tabular-nums">{eligibleMinutes} units</span></p><p className="flex justify-between items-center"><span>Credit Rate:</span><span className="tabular-nums">{rate.toFixed(3)} / unit</span></p><Separator className="my-2 opacity-50" /><p className="flex justify-between items-center"><span className="font-bold">Total Yield:</span><span className="font-bold text-ledger-green tabular-nums">{totalCredits.toFixed(4)} credits</span></p></div></div></div></div>
    </div>
  );
}

export default function ReportPage() { return <Suspense><ReportPageContent /></Suspense>; }
