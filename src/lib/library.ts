
/**
 * @fileOverview Library management for wearable locomotion datasets.
 */

'use client';

import { parseCsv, parseTcx, parseGpx, segmentAndValidate } from './csv-parser';
import { getEconomics } from './economics';
import { getControls } from './controls';
import { type LedgerEntry, LEDGER_STORAGE_KEY, saveLedgerEntries } from './ledger';
import { doc, setDoc, deleteDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';

export const LIBRARY_STORAGE_KEY = 'wearonomicsLibrary';

export interface Upload {
  id: string;
  fileName: string; 
  datasetName: string; 
  fileType: string;
  fileSizeBytes: number;
  uploadedAt: string;
  fileContent: string;
  status: 'Analysed' | 'Pending' | 'Error';
  validationProfile?: string;
  location?: string;
  researcherNotes?: string;
  activityDate?: string;
  uploadTimestamp?: string;
}

export function getLibrary(): Upload[] {
  if (typeof window === 'undefined') {
    return [];
  }
  const storedLibrary = localStorage.getItem(LIBRARY_STORAGE_KEY);
  try {
    const uploads = storedLibrary ? JSON.parse(storedLibrary) : [];
    if (Array.isArray(uploads)) {
      return uploads.sort(
        (a, b) =>
          new Date(b.uploadedAt || (b as any).uploadTimestamp || 0).getTime() -
          new Date(a.uploadedAt || (a as any).uploadTimestamp || 0).getTime()
      );
    }
  } catch (e) {
    console.error('Failed to parse library from local storage', e);
  }
  return [];
}

export function saveLibrary(library: Upload[]): void {
  try {
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(library));
  } catch (e) {
    if (
      e instanceof DOMException &&
      (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
    ) {
      throw new Error(
        'Storage quota exceeded. Please go to the Data Library to delete some datasets.'
      );
    } else {
      throw e;
    }
  }
}

export async function addUpload(file: File): Promise<Upload> {
  const fileContent = await file.text();
  
  let baseName = file.name || "";
  const lastDotIndex = baseName.lastIndexOf('.');
  if (lastDotIndex > 0) {
    baseName = baseName.substring(0, lastDotIndex);
  }
  
  if (!baseName.trim()) {
    const ts = new Date().toISOString().replace('T', ' ').replace(/\..+/, '');
    baseName = `Dataset ${ts}`;
  }

  const newUpload: Upload = {
    id: new Date().toISOString() + '-' + Math.random().toString(36).substr(2, 9),
    fileName: file.name,
    datasetName: baseName,
    fileType: file.type || 'text/plain',
    fileSizeBytes: file.size,
    uploadedAt: new Date().toISOString(),
    fileContent: fileContent,
    status: 'Analysed',
    validationProfile: 'human',
  };

  const library = getLibrary();
  const updatedLibrary = [newUpload, ...library];
  saveLibrary(updatedLibrary);
  
  await rebuildLedgerFromLibrary();
  
  return newUpload;
}

export function getUpload(id: string): Upload | undefined {
  return getLibrary().find((upload) => upload.id === id);
}

export async function deleteUpload(id: string): Promise<void> {
  const { firestore } = initializeFirebase();
  
  let library = getLibrary();
  library = library.filter((upload) => upload.id !== id);
  saveLibrary(library);
  
  const ledgerDocRef = doc(firestore, 'ledger', id);
  await deleteDoc(ledgerDocRef);
  
  await rebuildLedgerFromLibrary();
}

export async function clearLibrary(): Promise<void> {
  const { firestore } = initializeFirebase();
  
  try {
    const ledgerCollection = collection(firestore, 'ledger');
    const ledgerSnap = await getDocs(ledgerCollection);
    const batch = writeBatch(firestore);
    ledgerSnap.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
  } catch (e) {
    console.error('Failed to clear Firestore ledger', e);
  }

  localStorage.removeItem(LIBRARY_STORAGE_KEY);
  localStorage.removeItem(LEDGER_STORAGE_KEY);
}

export async function rebuildLedgerFromLibrary(): Promise<void> {
  const { firestore } = initializeFirebase();
  const allLibrary = getLibrary();
  
  const uniqueLibraryMap = new Map<string, Upload>();
  allLibrary.forEach(u => uniqueLibraryMap.set(u.id, u));
  
  const library = Array.from(uniqueLibraryMap.values())
    .sort((a, b) => {
      const dateA = a.uploadedAt || (a as any).uploadTimestamp || 0;
      const dateB = b.uploadedAt || (b as any).uploadTimestamp || 0;
      const timeA = new Date(dateA).getTime();
      const timeB = new Date(dateB).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.id.localeCompare(b.id);
    });
  
  const economics = getEconomics();
  const newLedgerEntries: LedgerEntry[] = [];
  let runningBalance = 0;
  let totalCreditsSum = 0;

  for (const upload of library) {
    let points = [];
    let summary: any = null;
    const fileName = upload.fileName.toLowerCase();
    const isCsv = fileName.endsWith('.csv');
    const isTcx = fileName.endsWith('.tcx');
    const isGpx = fileName.endsWith('.gpx');

    if (isCsv) {
      const res = parseCsv(upload.fileContent);
      points = res.points;
      summary = res.summary;
    } else if (isTcx) {
      const res = parseTcx(upload.fileContent);
      points = res.points;
      summary = res.summary;
    } else if (isGpx) {
      const res = parseGpx(upload.fileContent);
      points = res.points;
      summary = res.summary;
    }

    if (points.length > 0) {
      const validationResult = segmentAndValidate(points);
      
      const activityStartTimeUtc = points[0].timestamp!;
      const activityEndTimeUtc = points[points.length - 1].timestamp!;
      const totalMinutesCount = Math.floor((activityEndTimeUtc - activityStartTimeUtc) / 60000) + 1;
      const rawTotalSeconds = (activityEndTimeUtc - activityStartTimeUtc) / 1000;
      
      let eligibleMinutesCount = 0;
      for (let i = 0; i < totalMinutesCount; i++) {
          const mStart = activityStartTimeUtc + i * 60000;
          const mEnd = mStart + 60000;
          
          let validatedSecondsInMinute = 0;
          validationResult.segmentLedger.forEach(seg => {
              if (seg.classification === 'walking') {
                  const overlapStart = Math.max(seg.t_start, mStart);
                  const overlapEnd = Math.min(seg.t_end, mEnd);
                  if (overlapEnd > overlapStart) {
                      validatedSecondsInMinute += (overlapEnd - overlapStart) / 1000;
                  }
              }
          });

          if (validatedSecondsInMinute >= 30) {
              eligibleMinutesCount++;
          }
      }
      
      const walkingDistance = validationResult.segmentLedger
        .filter(s => s.classification === 'walking')
        .reduce((acc, s) => acc + s.distance_meters, 0);

      const stationarySegments = validationResult.segmentLedger.filter(s => s.classification === 'stationary');

      const creditEarned = parseFloat((eligibleMinutesCount * economics.creditRatePerMinute).toFixed(4));
      totalCreditsSum += creditEarned;
      runningBalance = parseFloat((runningBalance + creditEarned).toFixed(4));
      
      const entry: LedgerEntry = {
        id: upload.id,
        activityDate: new Date(upload.uploadedAt || upload.uploadTimestamp || 0).toISOString().split('T')[0],
        activityLabel: upload.datasetName || upload.fileName,
        datasetName: upload.datasetName || upload.fileName,
        totalSeconds: rawTotalSeconds,
        validatedSeconds: validationResult.activeWalkingSec,
        validatedMinutes: parseFloat((validationResult.activeWalkingSec / 60).toFixed(1)),
        validatedDistanceKm: walkingDistance / 1000,
        avgValidatedSpeedMs: validationResult.activeWalkingSec > 0 ? walkingDistance / validationResult.activeWalkingSec : 0,
        transportSeconds: validationResult.vehicleSec || 0,
        artifactSeconds: validationResult.excludedSec || 0,
        pauseCount: stationarySegments.length,
        longestPauseSeconds: stationarySegments.length > 0 ? Math.max(...stationarySegments.map(s => s.dt_seconds)) : 0,
        hrMin: summary?.hrMin || null,
        hrMax: summary?.hrMax || null,
        credits: creditEarned,
        baseCredits: creditEarned,
        finalCredits: creditEarned,
        createdAt: upload.uploadedAt || upload.uploadTimestamp || new Date().toISOString(),
        validationProfile: 'human',
        cumulativeCredits: runningBalance
      };

      newLedgerEntries.push(entry);

      const ledgerDocRef = doc(firestore, 'ledger', entry.id);
      setDoc(ledgerDocRef, entry, { merge: true });
    }
  }

  saveLedgerEntries(newLedgerEntries);
}
