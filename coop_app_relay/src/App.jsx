import React, { useState, useEffect, useCallback } from 'react';

// Node.js modules
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ipcRenderer } = require('electron');

console.log('[App.jsx Top Level] import.meta.env:', import.meta.env);

const PAIRING_CODE_KEY = 'coop_pairing_code';
const RELAY_ID_KEY = 'coop_relay_id';
// Removed DEFAULT_PAIRING_CODE: now pairing code is fetched from backend

// API_BASE_URL will be set from fetched env vars
const SNAPSHOT_DIR = 'tmp';
const SNAPSHOT_FILENAME = 'snapshot.jpg';
const SNAPSHOT_FULL_PATH = path.join(SNAPSHOT_DIR, SNAPSHOT_FILENAME);
const UPLOADER_COMMAND = `./coop_relay_uploader`;

const parseIntervalToMs = (intervalStr) => {
  if (!intervalStr || typeof intervalStr !== 'string') return 0;
  const match = intervalStr.match(/^(\d+)([msh])$/);
  if (!match) return 0;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  if (unit === 'm') return value * 60 * 1000;
  if (unit === 's') return value * 1000;
  if (unit === 'h') return value * 60 * 60 * 1000;
  return 0;
};

const formatCountdown = (totalSeconds) => {
  if (totalSeconds <= 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

function App() {
  // Initialize apiBaseUrl directly from Vite's import.meta.env
  const [apiBaseUrl, setApiBaseUrl] = useState(import.meta.env.VITE_COOP_BACKEND_URL || ''); 
  const [appState, setAppState] = useState('INITIALIZING'); // INITIALIZING, UNPAIRED, PAIRING_IN_PROGRESS, PAIRED
  const [pairingCode, setPairingCode] = useState('');
  const [relayId, setRelayId] = useState('');
  const [pairingStatusMessage, setPairingStatusMessage] = useState('');

  const [config, setConfig] = useState({ interval: "-", rtsp_url: null });
  const [pollingError, setPollingError] = useState(null);
  const [rtspOverride, setRtspOverride] = useState('');
  const [manualCaptureStatus, setManualCaptureStatus] = useState('');
  const [autoCaptureStatus, setAutoCaptureStatus] = useState('');
  // Live relay status from backend
  const [relayStatus, setRelayStatus] = useState({ last_seen_at: null, latest_snapshot: null, error: null });
  // Supabase public URL (hardcoded for Electron link correctness)
  const SUPABASE_PUBLIC_URL = "https://lhycuglgaripgtqcqyhb.supabase.co";
  
  const [snapshotTimerId, setSnapshotTimerId] = useState(null);
  const [countdown, setCountdown] = useState(0); // in seconds
  const [countdownTimerId, setCountdownTimerId] = useState(null);

    // Effect 1: Log VITE_COOP_BACKEND_URL and ensure IPC still fetches other env vars for uploader
  useEffect(() => {
    if (!apiBaseUrl) {
      console.error('VITE_COOP_BACKEND_URL is not defined or is empty. Check .env file and Vite setup. Falling back for UI.');
      // Set a fallback if import.meta.env.VITE_COOP_BACKEND_URL was empty, though useState already initializes it.
      // This explicit setApiBaseUrl might be redundant if useState already handles the fallback.
      setApiBaseUrl('https://coop-app-backend.fly.dev'); 
    } else {
      console.log('Using VITE_COOP_BACKEND_URL for API calls:', apiBaseUrl);
    }

    // This IPC call is still important to ensure SUPABASE_URL and SUPABASE_SERVICE_KEY 
    // are loaded in the main process and available for the uploader child process.
    // We don't need to use its return value here for apiBaseUrl anymore.
    const verifyMainProcessEnv = async () => {
      try {
        await ipcRenderer.invoke('get-env-vars'); // Call to ensure main process loads .env
        console.log('IPC get-env-vars invoked to ensure main process loads .env for uploader.');
      } catch (error) {
        console.error('IPC call to get-env-vars failed (this might affect uploader):', error);
      }
    };
    verifyMainProcessEnv();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // apiBaseUrl is a dependency if we want to react to its change, but it's set sync from import.meta.env 

  // Effect 2: Initialize app state (check for existing relay_id or pairing_code)
  useEffect(() => {
    const requestPairingCode = async (existingRelayId = null) => {
      setAppState('UNPAIRED');
      setPairingStatusMessage('Requesting pairing code from server...');
      try {
        const body = existingRelayId ? { relay_id: existingRelayId } : {};
        const response = await fetch('https://coop-app-backend.fly.dev/api/relay/request_pairing_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`Pairing code request failed: ${response.status}`);
        const data = await response.json();
        if (data && data.pairing_code && data.relay_id) {
          localStorage.setItem(PAIRING_CODE_KEY, data.pairing_code);
          localStorage.setItem(RELAY_ID_KEY, data.relay_id);
          setPairingCode(data.pairing_code);
          setRelayId(data.relay_id);
          setPairingStatusMessage('Ready to pair. Enter this code in your Coop App.');
        } else {
          throw new Error('Invalid response from server.');
        }
      } catch (error) {
        console.error('Pairing code fetch failed:', error);
        setPairingStatusMessage('Pairing failed. Please check your connection or try again.');
      }
    };

    console.log('[Effect 2 Triggered] Initializing app state.');
    const storedRelayId = localStorage.getItem(RELAY_ID_KEY);
    const storedPairingCode = localStorage.getItem(PAIRING_CODE_KEY);

    if (storedRelayId) {
      setRelayId(storedRelayId);
      if (storedPairingCode) {
        // Both exist, verify status
        (async () => {
          try {
            const response = await fetch(`https://coop-app-backend.fly.dev/api/relay/config?pairing_code=${storedPairingCode}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            if (data.status === 'claimed') {
              localStorage.removeItem(PAIRING_CODE_KEY);
              setPairingCode('');
              setAppState('PAIRED');
              setPairingStatusMessage('Relay ready ✅ Claimed by your Coop.');
            } else {
              setAppState('UNPAIRED');
              setPairingStatusMessage('Ready to pair. Waiting for server...');
            }
          } catch (err) {
            setAppState('PAIRED');
            setPairingStatusMessage('Relay ready ✅ Claimed by your Coop.');
          }
        })();
      } else {
        // Only relay_id exists, we are paired
        setAppState('PAIRED');
        setPairingStatusMessage('Relay ready ✅ Claimed by your Coop.');
      }
    } else {
      // First launch: no relay_id
      requestPairingCode(null);
    }
  }, []);

    // Effect 3: Pairing Polling (if UNPAIRED and apiBaseUrl is set)
  useEffect(() => {
    console.log('[Effect 3 Triggered] Checking conditions for pairing poll:', { appState, pairingCode, apiBaseUrl });
    if (!['UNPAIRED', 'PAIRING_IN_PROGRESS'].includes(appState) || !pairingCode) {
      return;
    }

    setAppState('PAIRING_IN_PROGRESS');
    setPairingStatusMessage(`Attempting to pair with code: ${pairingCode}...`);

    const pairingInterval = setInterval(async () => {
      try {
        console.log(`[Relay] Polling for pairing status. Code: ${pairingCode}`);
        const response = await fetch(`https://coop-app-backend.fly.dev/api/relay/config?pairing_code=${pairingCode}`, { cache: "no-store" });
        if (response.status === 404) {
          setPairingStatusMessage('Pairing error: Code not found. Retrying...');
          console.error(`[Relay] Pairing code not found (404): ${pairingCode}`);
          return;
        }
        if (!response.ok) {
          throw new Error(`Pairing config error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log("[Relay] Polled relay config:", data);
        if (data.status === 'claimed' && data.relay_id) {
          localStorage.setItem(RELAY_ID_KEY, data.relay_id);
          if (data.coop_id) localStorage.setItem('coop_coop_id', data.coop_id);
          setRelayId(data.relay_id);
          setAppState('PAIRED');
          setPairingStatusMessage(`Successfully paired! Relay ID: ${data.relay_id}`);
          localStorage.removeItem(PAIRING_CODE_KEY); // Clean up pairing code
          clearInterval(pairingInterval);
          console.log(`[Relay] Transitioned to PAIRING COMPLETE. relay_id=${data.relay_id}, coop_id=${data.coop_id}`);
        } else if (data.status === 'pending') {
          setPairingStatusMessage(`Status: Pending. Waiting for code ${pairingCode} to be claimed...`);
          console.log('[Relay] Still waiting to be claimed...');
        } else {
          setPairingStatusMessage(`Unknown pairing status: ${data.status || 'No status returned'}`);
          console.warn(`[Relay] Unknown status from backend:`, data);
        }
      } catch (error) {
        console.error("[Relay] Failed to poll relay config:", error);
        setPairingStatusMessage(`Pairing error: ${error.message}. Retrying...`);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(pairingInterval); // Cleanup on unmount or if deps change
  }, [appState, pairingCode]);

  // Effect 4: Config Polling (if PAIRED and apiBaseUrl is set)
  useEffect(() => {
    if (appState !== 'PAIRED' || !relayId || !apiBaseUrl) return; // Only poll if paired and relayId is known


    const fetchConfig = async () => {
      setPollingError(null);
      try {
        const response = await fetch(`${apiBaseUrl}/api/relay/config?relay_id=${relayId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        setConfig({ interval: data.interval || "-", rtsp_url: data.rtsp_url || null });
      } catch (e) {
        console.error("Failed to fetch relay config:", e);
        setPollingError(e.message);
        setConfig({ interval: "-", rtsp_url: null });
      }
    };
    fetchConfig();
    const intervalId = setInterval(fetchConfig, 30000 + Math.random() * 30000);
    return () => clearInterval(intervalId);
  }, [appState, relayId, apiBaseUrl]); // Dependencies for config polling

  // Load RTSP override from localStorage
  useEffect(() => {
    const storedRtsp = localStorage.getItem("coop_rtsp_override");
    if (storedRtsp) setRtspOverride(storedRtsp);
  }, []);

  const handleRtspOverrideChange = (event) => {
    const newUrl = event.target.value;
    setRtspOverride(newUrl);
    localStorage.setItem("coop_rtsp_override", newUrl);
  };

  const performSnapshotAndUpload = useCallback(async (rtspUrlToUse, statusCallback) => {
    const currentRelayId = localStorage.getItem(RELAY_ID_KEY);
    if (!currentRelayId) {
      console.error("Cannot start snapshot: relayId not found in localStorage.");
      statusCallback("Error: Relay ID not found. Please ensure pairing is complete.");
      return;
    }

    let envVars = {};
    try {
      envVars = await ipcRenderer.invoke('get-env-vars');
      if (!envVars || !envVars.SUPABASE_URL || !envVars.SUPABASE_SERVICE_KEY || !envVars.COOP_BACKEND_URL) {
        throw new Error('Required environment variables not received from main process.');
      }
    } catch (error) {
      console.error('Failed to get env vars for uploader:', error);
      statusCallback(`Error: Could not load critical config for uploader. ${error.message}`);
      return;
    }

    if (!rtspUrlToUse) {
      statusCallback("Error: RTSP URL is not available for capture.");
      return;
    }
    statusCallback(`Preparing to capture from ${rtspUrlToUse}...`);
    try {
      if (!fs.existsSync(SNAPSHOT_DIR)) fs.mkdirSync(SNAPSHOT_DIR, { recursive: true });
    } catch (err) {
      statusCallback(`Error creating snapshot directory: ${err.message}`);
      return;
    }

    const ffmpegCmd = `ffmpeg -y -rtsp_transport tcp -i "${rtspUrlToUse}" -frames:v 1 ${SNAPSHOT_FULL_PATH}`;
    statusCallback(`Executing: ${ffmpegCmd.split(' ')[0]}...`);
    
    try {
      await new Promise((resolve, reject) => {
        exec(ffmpegCmd, (err, stdout, stderr) => {
          if (err) {
            console.error(`ffmpeg error: ${err.message}`, `Stderr: ${stderr}`, `Stdout: ${stdout}`);
            reject(new Error(`ffmpeg: ${err.message}. ${stderr ? 'Stderr: ' + stderr : ''}`)); return;
          }
          console.log(`Snapshot captured: ${SNAPSHOT_FULL_PATH}`, `Stdout: ${stdout}`);
          resolve(stdout);
        });
      });
      statusCallback(`Snapshot captured. Uploading...`);

      const command = `${UPLOADER_COMMAND} --relay-id="${currentRelayId}" --image-path="${SNAPSHOT_FULL_PATH}"`;
    console.log('[Uploader Command]', command);
      statusCallback(`Executing: ${UPLOADER_COMMAND.split('/').pop()}...`);
      
      const uploadOutput = await new Promise((resolve, reject) => {
        exec(command, { 
          env: {
            // Explicitly pass only necessary vars, ensure they are defined
            SUPABASE_URL: envVars.SUPABASE_URL || '',
            SUPABASE_SERVICE_KEY: envVars.SUPABASE_SERVICE_KEY || '',
            COOP_BACKEND_URL: envVars.COOP_BACKEND_URL || '',
            PATH: process.env.PATH // Important for ffmpeg and uploader to be found
          }
        }, (err, stdout, stderr) => {
          if (err) {
            console.error(`Uploader error: ${err.message}`, `Stderr: ${stderr}`, `Stdout: ${stdout}`);
            reject(new Error(`Uploader: ${err.message}. ${stderr ? 'Stderr: ' + stderr : ''}`)); return;
          }
          console.log(`Upload successful! Output: ${stdout}`, `Stderr: ${stderr}`);
          resolve(stdout);
        });
      });
      statusCallback(`Snapshot uploaded successfully at ${new Date().toLocaleTimeString()}`);
      
      // Send snapshot-created notification to backend
      try {
        // Extract image path from uploader output
        let imagePath = null;
        const pathMatch = uploadOutput.match(/UPLOADED_IMAGE_PATH:(.+)/);
        if (pathMatch) {
          imagePath = pathMatch[1].trim();
        } else {
          // Fallback to generating timestamp (should not happen with updated uploader)
          const timestamp = new Date().toISOString()
            .slice(0, 19)             // "2025-06-12T00:07:16"
            .replace(/[:T]/g, '-');   // "2025-06-12-00-07-16"
          imagePath = `${currentRelayId}/${timestamp}.jpg`;
          console.warn('[Snapshot Created] Could not parse image path from uploader, using fallback:', imagePath);
        }
        
        console.log('[Snapshot Created] Final image_path:', imagePath);
        const notificationResponse = await fetch('https://coop-app-backend.fly.dev/api/internal/snapshot-created', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image_path: imagePath }),
        });
        
        if (notificationResponse.ok) {
          console.log('[Snapshot Created] Notification sent successfully');
        } else {
          console.log('[Snapshot Created] Notification failed:', notificationResponse.status, notificationResponse.statusText);
        }
      } catch (error) {
        console.log('[Snapshot Created] Notification error (non-blocking):', error.message);
      }
      
      // Immediately refresh relay status in UI
      const freshRelayId = localStorage.getItem(RELAY_ID_KEY) || relayId;
      const freshApiBaseUrl = apiBaseUrl;
      if (freshRelayId && freshApiBaseUrl) {
        console.log('[Status Refresh] Fetching relay status after upload:', { relayId: freshRelayId, apiBaseUrl: freshApiBaseUrl });
        fetch(`${freshApiBaseUrl}/api/relay/status/read?relay_id=${freshRelayId}`, { cache: 'no-store' })
          .then(res => res.ok ? res.json() : Promise.reject(res))
          .then(data => {
            console.log('[Status Refresh] Relay status updated after upload:', data);
            setRelayStatus(data);
          })
          .catch(err => {
            console.error('[Status Refresh] Failed to refresh relay status after upload:', err);
            setRelayStatus({ last_seen_at: null, latest_snapshot: null, error: 'Unavailable' });
          });
      } else {
        console.error('[Status Refresh] Skipped: relayId or apiBaseUrl missing', { relayId: freshRelayId, apiBaseUrl: freshApiBaseUrl });
      }
    } catch (error) {
      statusCallback(`Error: ${error.message}`);
    }
  }, []); // HARDCODED_RELAY_ID is stable

  const handleManualCapture = () => {
    const url = rtspOverride || config.rtsp_url;
    performSnapshotAndUpload(url, setManualCaptureStatus);
  };

  // Listen for tray snapshot events
  useEffect(() => {
    if (window && window.require) {
      const { ipcRenderer } = window.require('electron');
      const handler = (_event, payload) => {
        // Prefer payload values if provided
        const url = (payload && payload.rtspUrl) || rtspOverride || config.rtsp_url;
        performSnapshotAndUpload(url, setManualCaptureStatus);
      };
      ipcRenderer.on('tray-capture-snapshot', handler);
      return () => ipcRenderer.removeListener('tray-capture-snapshot', handler);
    }
  }, [rtspOverride, config.rtsp_url, performSnapshotAndUpload]);

  // Effect: Health ping every 2 minutes if paired
  useEffect(() => {
    if (appState !== 'PAIRED' || !relayId || !apiBaseUrl) return;
    const interval = setInterval(() => {
      fetch(`${apiBaseUrl}/api/relay/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ relay_id: relayId }),
        cache: 'no-store',
      })
        .then(() => {
          console.log(`[Health Ping] Relay ${relayId} pinged at ${new Date().toISOString()}`);
        })
        .catch((err) => {
          console.warn('[Health Ping] Failed:', err);
        });
    }, 2 * 60 * 1000); // 2 minutes
    // Initial ping immediately
    fetch(`${apiBaseUrl}/api/relay/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ relay_id: relayId }),
      cache: 'no-store',
    })
      .then(() => {
        console.log(`[Health Ping] Relay ${relayId} pinged at ${new Date().toISOString()}`);
      })
      .catch((err) => {
        console.warn('[Health Ping] Failed:', err);
      });
    return () => clearInterval(interval);
  }, [appState, relayId, apiBaseUrl]);

  // Effect: Notify main process of relayId/rtspUrl on relevant changes
  useEffect(() => {
    const relayIdToSend = relayId || null;
    const rtspUrlToSend = rtspOverride || config.rtsp_url || null;
    console.log('[IPC] Sending relay-ready:', { relayId: relayIdToSend, rtspUrl: rtspUrlToSend });
    if (window && window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('relay-ready', { relayId: relayIdToSend, rtspUrl: rtspUrlToSend });
    } else if (window.electron && window.electron.ipcRenderer) {
      window.electron.ipcRenderer.send('relay-ready', { relayId: relayIdToSend, rtspUrl: rtspUrlToSend });
    }
  }, [relayId, rtspOverride, config.rtsp_url]);

  // Fetch relay status once after pairing
  useEffect(() => {
    if (appState === 'PAIRED' && relayId && apiBaseUrl) {
      setRelayStatus({ last_seen_at: null, latest_snapshot: null, error: null });
      fetch(`${apiBaseUrl}/api/relay/status/read?relay_id=${relayId}`, { cache: 'no-store' })
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => {
          setRelayStatus({
            last_seen_at: data.last_seen_at || null,
            latest_snapshot: data.latest_snapshot || null,
            error: null
          });
        })
        .catch(err => {
          console.error('Failed to fetch relay status:', err);
          setRelayStatus({ last_seen_at: null, latest_snapshot: null, error: 'Unavailable' });
        });
    }
  }, [appState, relayId, apiBaseUrl]);

  // Effect for automatic snapshot timer
  useEffect(() => {
    if (snapshotTimerId) clearInterval(snapshotTimerId);
    if (countdownTimerId) clearInterval(countdownTimerId);

    const intervalMs = parseIntervalToMs(config.interval);
    const urlToUse = rtspOverride || config.rtsp_url;

    if (intervalMs > 0 && urlToUse) {
      setAutoCaptureStatus(`Timer active. Next capture in ${formatCountdown(intervalMs / 1000)} using ${urlToUse.substring(0,30)}...`);
      setCountdown(intervalMs / 1000);
      
      const newSnapshotTimer = setInterval(() => {
        performSnapshotAndUpload(urlToUse, setAutoCaptureStatus);
        setCountdown(intervalMs / 1000); // Reset countdown after capture
      }, intervalMs);
      setSnapshotTimerId(newSnapshotTimer);

      const newCountdownTimer = setInterval(() => {
        setCountdown(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      setCountdownTimerId(newCountdownTimer);
      
    } else {
      setAutoCaptureStatus(intervalMs <= 0 ? "Automatic snapshots paused: Interval not set or invalid." : "Automatic snapshots paused: RTSP URL not available.");
      setCountdown(0);
    }

    return () => {
      if (snapshotTimerId) clearInterval(snapshotTimerId);
      if (countdownTimerId) clearInterval(countdownTimerId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appState, config.interval, config.rtsp_url, rtspOverride, performSnapshotAndUpload, relayId]);

  // Log state on every render, just before returning JSX
  console.log('[App Render] Current states:', { appState, pairingCode, apiBaseUrl, relayId, configInterval: config.interval });

  // Toast state for bonus UX
  const [toast, setToast] = useState("");
  const [rtspCopied, setRtspCopied] = useState(false);

  // Effect to auto-clear toast messages
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast("");
      }, 2500); // Clear after 2.5 seconds
      return () => clearTimeout(timer); // Cleanup timer if toast changes before timeout
    }
  }, [toast]); // Re-run when toast message changes

  // Reset Pairing handler
  const handleResetPairing = useCallback(() => {
    const requestNewPairingCode = async () => {
      const storedRelayId = localStorage.getItem(RELAY_ID_KEY);
      if (!storedRelayId) {
        console.error("Cannot reset pairing: relay_id not found in storage.");
        setToast("Error: Relay ID not found. Cannot reset.");
        return;
      }
      setToast("Requesting new pairing code...");
      try {
        const response = await fetch('https://coop-app-backend.fly.dev/api/relay/request_pairing_code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ relay_id: storedRelayId }),
        });
        if (!response.ok) throw new Error(`Request failed: ${response.status}`);
        const data = await response.json();
        if (data.pairing_code) {
          localStorage.setItem(PAIRING_CODE_KEY, data.pairing_code);
          setPairingCode(data.pairing_code);
          setAppState('UNPAIRED'); // Go back to pairing screen
          setPairingStatusMessage('Ready to pair. Enter this code in your Coop App.');
          setToast("Pairing has been reset. Use the new code.");
        } else {
          throw new Error("Invalid response from server.");
        }
      } catch (error) {
        console.error("Failed to get new pairing code:", error);
        setToast(`Error: ${error.message}`);
      }
    };

    localStorage.removeItem('coop_rtsp_override');
    setRtspOverride("");
    requestNewPairingCode();

    if (window && window.require) {
      const { ipcRenderer } = window.require('electron');
      ipcRenderer.send('show-notification', 'Coop Relay', 'Pairing has been reset.');
    }
  }, []);

  // Debug: log relayStatus on every render
  console.log("[App Render] relayStatus:", relayStatus);
  // Compute snapshot URL
  const snapshotUrl = relayStatus.image_url
    ? `${relayStatus.image_url}?t=${Date.now()}`
    : (relayStatus.latest_snapshot
      ? `${SUPABASE_PUBLIC_URL}/storage/v1/object/public/snapshots/${relayStatus.latest_snapshot}?t=${Date.now()}`
      : null);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center pt-9 pb-6 px-4 space-y-5">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center p-4 bg-white shadow-md rounded-lg">
  <div className="text-2xl font-bold text-center">🐔 Coop Relay</div>
  {appState === 'PAIRED' && relayId ? (
    <div className="text-xs text-gray-400 font-mono mt-1">ID: {relayId}</div>
  ) : (
    <div className="text-xs text-gray-400 font-mono mt-1">(Waiting for Pairing)</div>
  )}
</div>
      </div>

      {/* Pairing UI - Shown when not paired */}
      {(appState === 'INITIALIZING' || appState === 'UNPAIRED' || appState === 'PAIRING_IN_PROGRESS') && (
        <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-lg space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">Pairing Status</h2>
          {pairingCode && (
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-600">Pairing Code:</span>
              <span className="text-lg font-mono bg-blue-100 text-blue-700 px-3 py-1 rounded">{pairingCode}</span>
            </div>
          )}
          {pairingStatusMessage && (
            <div className="p-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded text-xs whitespace-pre-wrap break-all">
              {pairingStatusMessage}
            </div>
          )}
        </div>
      )}

      {/* Operational UI - Shown only when paired */}
      {appState === 'PAIRED' && (
        <>
          {/* Relay Configuration Display */}
      <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-lg space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Relay Configuration</h2>
        {pollingError && (
          <div className="p-2 bg-red-100 text-red-600 border border-red-200 rounded text-xs">
            <p className="font-medium">Polling Error:</p> <p>{pollingError}</p>
          </div>
        )}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Snapshot Interval:</span>
          <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded">{config.interval}</span>
        </div>
        {/* Backend RTSP URL - Styled with Copy Button to the right */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Backend RTSP URL:</span>
          <div className="flex items-center gap-x-2"> {/* Parent for URL box and Copy button */}
            <div className="bg-gray-100 text-sm px-2 py-1 rounded font-mono"> {/* Gray box for URL only */}
              <code className="break-all">
                {(relayStatus && relayStatus.rtsp_url) || config.rtsp_url || "(none)"}
              </code>
            </div>
            {((relayStatus && relayStatus.rtsp_url) || config.rtsp_url) && (
              <button
                onClick={() => {
                  const urlToCopy = (relayStatus && relayStatus.rtsp_url) || config.rtsp_url;
                  if (urlToCopy) {
                    navigator.clipboard.writeText(urlToCopy);
                    setToast('RTSP URL copied!'); // Existing toast notification
                    setRtspCopied(true);
                    setTimeout(() => setRtspCopied(false), 2000); // Reset after 2 seconds
                  }
                }}
                className="text-xs px-2 py-0.5 rounded bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
                title="Copy to clipboard"
              >
                {rtspCopied ? '✅ Copied' : '📋 Copy'}
              </button>
            )}
          </div>
        </div>
        {/* Live Relay Status */}
        <div className="flex flex-col gap-1 mt-3 p-3 bg-gray-50 rounded border border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm">🔄 Last Seen:</span>
            <span className="text-xs font-mono text-gray-700">
              {relayStatus.error ? <span className="text-gray-400">Unavailable</span> : relayStatus.last_seen_at ? new Date(relayStatus.last_seen_at).toLocaleString() : <span className="text-gray-400">(none)</span>}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">🖼 Last Snapshot:</span>
            {relayStatus.error ? (
              <span className="text-gray-400 text-xs">Unavailable</span>
            ) : snapshotUrl ? (
              <a
                href={snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline text-xs truncate max-w-[180px]"
                title={snapshotUrl}
              >
                View Image
              </a>
            ) : (
              <span className="text-gray-400 text-xs">(none)</span>
            )}
          </div>
        </div>
      </div>

      {/* Automatic Snapshot Status */}
      <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-lg space-y-3">
          <h2 className="text-lg font-semibold text-gray-700">Automatic Snapshots</h2>
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Next Capture In:</span>
            <span className="text-sm font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded">{formatCountdown(countdown)}</span>
          </div>
          {autoCaptureStatus && (
            <div className="p-2 bg-blue-50 text-blue-600 border border-blue-200 rounded text-xs whitespace-pre-wrap break-all">
              {autoCaptureStatus}
            </div>
          )}
      </div>

      {/* Manual Snapshot Control */}
      <div className="w-full max-w-md p-5 bg-white shadow-lg rounded-lg space-y-3">
        <h2 className="text-lg font-semibold text-gray-700">Manual Snapshot Control</h2>
        <div>
          <label htmlFor="rtspOverride" className="block text-xs font-medium text-gray-500 mb-0.5">
            RTSP Stream URL (Override):
          </label>
          <input
            type="text" id="rtspOverride" value={rtspOverride} onChange={handleRtspOverrideChange}
            placeholder="rtsp://your.stream.url/path"
            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <button
          onClick={handleManualCapture}
          className="w-full px-3 py-1.5 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm"
        >
          Capture & Upload Snapshot Now
        </button>
        {manualCaptureStatus && (
          <div className="mt-2 p-2 bg-gray-50 text-xs text-gray-600 border border-gray-200 rounded whitespace-pre-wrap break-all">
            {manualCaptureStatus}
          </div>
        )}
      </div>
        </>
      )}
      {/* Footer/Settings: Reset Pairing Button (always visible) */}
      <div className="w-full max-w-md flex flex-col items-center mt-2">
        <button
          className="text-xs text-red-500 underline"
          onClick={handleResetPairing}
        >
          Reset Pairing
        </button>
        {toast && (
          <div className="mt-2 text-xs bg-black bg-opacity-70 text-white px-3 py-1 rounded shadow">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Helper for new pairing code (fallback to default, but could randomize in future)
// No longer needed: pairing code is fetched from backend
// function generateNewCode() {
//   return DEFAULT_PAIRING_CODE;
// }

export default App;
