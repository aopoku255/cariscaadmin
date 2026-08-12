'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Callout } from '@/components/ui';
import { scanAction, lookupAction } from './scan-actions';
import type { ScanOutcome, QueuedScan } from './scan-types';
import styles from './attendance.module.css';

/**
 * The door scanner.
 *
 * Built for the conditions the runbook warns about: bad light, a queue, and
 * venue wifi that may not hold. Scans are queued locally and replayed when the
 * connection returns, so the door never stops moving.
 *
 * Uses the browser's built-in BarcodeDetector where available. No library is
 * loaded as a fallback — search by name is the fallback, and it works on every
 * device including one with a broken camera.
 */

const QUEUE_KEY = 'carisca.scanQueue';
const RECENT_LIMIT = 8;

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
  }
}

function loadQueue(): QueuedScan[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}
function saveQueue(q: QueuedScan[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* private mode */ }
}

type Recent = ScanOutcome & { at: number; key: string };

export function Scanner({ eventId, sessionId = null }: { eventId: string; sessionId?: number | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });

  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'on' | 'unsupported' | 'denied'>('idle');
  const [outcome, setOutcome] = useState<ScanOutcome | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [queue, setQueue] = useState<QueuedScan[]>([]);
  const [online, setOnline] = useState(true);
  const [manual, setManual] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof lookupAction>>>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setQueue(loadQueue());
    setOnline(navigator.onLine);
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  const remember = useCallback((o: ScanOutcome) => {
    setOutcome(o);
    setRecent((r) => [{ ...o, at: Date.now(), key: `${Date.now()}-${Math.random()}` }, ...r].slice(0, RECENT_LIMIT));
    // A short buzz confirms the scan without staff having to look at the screen.
    if ('vibrate' in navigator) {
      navigator.vibrate(o.kind === 'admitted' ? 40 : o.kind === 'already' ? [20, 40, 20] : [80, 60, 80]);
    }
  }, []);

  const submit = useCallback(async (input: { qrToken?: string; reference?: string }) => {
    setBusy(true);
    const result = await scanAction({
      ...input,
      sessionId,
      deviceInfo: navigator.userAgent.slice(0, 200),
    });

    if (result.kind === 'offline') {
      const queued: QueuedScan = {
        id: `${Date.now()}-${Math.random()}`,
        ...input,
        sessionId,
        scannedAt: new Date().toISOString(),
      };
      const next = [...loadQueue(), queued];
      saveQueue(next);
      setQueue(next);
    }

    remember(result);
    setBusy(false);
    return result;
  }, [sessionId, remember]);

  /** Replays anything captured while the connection was down. */
  const flushQueue = useCallback(async () => {
    const pending = loadQueue();
    if (!pending.length || !navigator.onLine) return;

    const stillPending: QueuedScan[] = [];
    for (const item of pending) {
      // eslint-disable-next-line no-await-in-loop
      const result = await scanAction({
        qrToken: item.qrToken, reference: item.reference, sessionId: item.sessionId,
      });
      // The server is idempotent, so a replayed scan is safe.
      if (result.kind === 'offline') stillPending.push(item);
    }
    saveQueue(stillPending);
    setQueue(stillPending);
  }, []);

  useEffect(() => { if (online) void flushQueue(); }, [online, flushQueue]);

  // --- camera ---------------------------------------------------------------
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraState('idle');
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = useCallback(async () => {
    if (!window.BarcodeDetector) { setCameraState('unsupported'); return; }
    setCameraState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraState('on');
    } catch {
      setCameraState('denied');
    }
  }, []);

  useEffect(() => {
    if (cameraState !== 'on' || !window.BarcodeDetector) return undefined;

    const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
    let stopped = false;

    const tick = async () => {
      if (stopped || !videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d')?.drawImage(video, 0, 0);

        try {
          const [found] = await detector.detect(canvas);
          if (found?.rawValue) {
            const code = found.rawValue.trim();
            const now = Date.now();
            // The camera sees the same badge many times a second; ignore a
            // repeat within three seconds so one person is scanned once.
            if (code !== lastCodeRef.current.code || now - lastCodeRef.current.at > 3000) {
              lastCodeRef.current = { code, at: now };
              await submit(code.length === 32 ? { qrToken: code } : { reference: code });
            }
          }
        } catch { /* a bad frame is not worth reporting */ }
      }
      if (!stopped) requestAnimationFrame(() => { void tick(); });
    };

    void tick();
    return () => { stopped = true; };
  }, [cameraState, submit]);

  // --- manual lookup --------------------------------------------------------
  const search = useCallback(async (term: string) => {
    setManual(term);
    if (term.trim().length < 2) { setResults([]); return; }
    setResults(await lookupAction(eventId, term.trim()));
  }, [eventId]);

  const tone = outcome?.kind === 'admitted' ? styles.resultOk
    : outcome?.kind === 'already' ? styles.resultWarn
      : outcome?.kind === 'offline' ? styles.resultWarn
        : styles.resultBad;

  return (
    <div className={styles.scanner}>
      {!online && (
        <Callout tone="warning" title="No connection">
          Scans are being saved on this device and will sync automatically.
          {queue.length > 0 && ` ${queue.length} waiting.`}
        </Callout>
      )}
      {online && queue.length > 0 && (
        <Callout tone="info" title={`Syncing ${queue.length} saved scan${queue.length === 1 ? '' : 's'}`}>
          Keep this page open until it finishes.
        </Callout>
      )}

      {/* --- the verdict, large enough to read at arm's length --- */}
      {outcome && (
        <div className={`${styles.result} ${tone}`} role="status" aria-live="assertive">
          {outcome.kind === 'admitted' || outcome.kind === 'already' ? (
            <>
              <p className={styles.resultVerdict}>
                {outcome.kind === 'admitted' ? 'Checked in' : 'Already checked in'}
              </p>
              <p className={styles.resultName}>{outcome.name}</p>
              {outcome.organization && <p className={styles.resultOrg}>{outcome.organization}</p>}
              <p className={styles.resultRef}>{outcome.reference}</p>
              {outcome.warnings.map((w: string) => (
                <p key={w} className={styles.resultWarning}>{w}</p>
              ))}
            </>
          ) : (
            <>
              <p className={styles.resultVerdict}>
                {outcome.kind === 'refused' ? 'Do not admit'
                  : outcome.kind === 'unknown' ? 'Not recognised'
                    : outcome.kind === 'offline' ? 'Saved offline' : 'Something went wrong'}
              </p>
              <p className={styles.resultName}>{outcome.message}</p>
              {'reference' in outcome && outcome.reference && (
                <p className={styles.resultRef}>{outcome.reference}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* --- camera --- */}
      <div className={styles.cameraBox}>
        <video ref={videoRef} className={styles.video} playsInline muted
          style={{ display: cameraState === 'on' ? 'block' : 'none' }} />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {cameraState !== 'on' && (
          <div className={styles.cameraIdle}>
            {cameraState === 'unsupported' && (
              <p className={styles.cameraNote}>
                This browser cannot scan QR codes. Use search below, which works everywhere.
              </p>
            )}
            {cameraState === 'denied' && (
              <p className={styles.cameraNote}>
                Camera access was refused. Allow it in your browser settings, or use search below.
              </p>
            )}
            {(cameraState === 'idle' || cameraState === 'starting') && (
              <Button onClick={startCamera} size="lg" disabled={cameraState === 'starting'}>
                {cameraState === 'starting' ? 'Starting camera…' : 'Start scanning'}
              </Button>
            )}
          </div>
        )}

        {cameraState === 'on' && (
          <>
            <div className={styles.reticle} aria-hidden="true" />
            <Button onClick={stopCamera} variant="secondary" size="sm">Stop camera</Button>
          </>
        )}
      </div>

      {/* --- search fallback --- */}
      <div className={styles.manual}>
        <label className={styles.manualLabel} htmlFor="manual-search">
          Search by name, email or reference
        </label>
        <input
          id="manual-search"
          className={styles.manualInput}
          value={manual}
          onChange={(e) => void search(e.target.value)}
          placeholder="Start typing a name…"
          autoComplete="off"
        />

        {results.length > 0 && (
          <ul className={styles.results}>
            {results.map((r) => (
              <li key={r.registrationId}>
                <div className={styles.resultRow}>
                  <div>
                    <strong>{r.name}</strong>
                    <div className={styles.resultMeta}>
                      {r.organization ? `${r.organization} · ` : ''}{r.reference}
                      {r.attendanceMode === 'VIRTUAL' ? ' · online' : ''}
                    </div>
                  </div>
                  {r.checkedIn ? (
                    <span className={styles.inAlready}>In</span>
                  ) : (
                    <Button size="sm" disabled={busy}
                      onClick={async () => {
                        await submit({ reference: r.reference });
                        await search(manual);
                      }}>
                      Check in
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {recent.length > 0 && (
        <div className={styles.recent}>
          <h3 className={styles.recentTitle}>Just scanned</h3>
          <ul>
            {recent.map((r) => (
              <li key={r.key}>
                <span className={r.kind === 'admitted' ? styles.dotOk
                  : r.kind === 'already' ? styles.dotWarn : styles.dotBad} aria-hidden="true" />
                {r.kind === 'admitted' || r.kind === 'already' ? r.name : r.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
