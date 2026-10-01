'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { Camera, CheckCircle2, AlertCircle, RefreshCw, Clock, ArrowRight, UserCheck, ShieldAlert } from 'lucide-react';

interface BranchInfo {
  id: number;
  name: string;
  code: string;
}

interface EmployeeItem {
  id: number;
  full_name: string;
  weekly_off: string;
  shift_name: string;
  shift_start: string;
  shift_end: string;
}

interface StatusResult {
  hasCheckedIn: boolean;
  checkInTime: string | null;
  hasCheckedOut: boolean;
  checkOutTime: string | null;
  status: string | null;
}

export default function AttendancePage({ params }: { params: Promise<{ code: string }> }) {
  const resolvedParams = use(params);
  const branchCode = resolvedParams.code;

  const [loading, setLoading] = useState(true);
  const [branch, setBranch] = useState<BranchInfo | null>(null);
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [employeeStatus, setEmployeeStatus] = useState<StatusResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera & Capture state
  const [cameraActive, setCameraActive] = useState(false);
  const [actionType, setActionType] = useState<'check-in' | 'check-out' | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successResult, setSuccessResult] = useState<{ message: string; time: string; type: string } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Play shutter audio click using Web Audio API
  const playShutterSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.13);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  // Load branch and active employees
  useEffect(() => {
    async function loadBranch() {
      try {
        setLoading(true);
        setErrorMsg(null);
        const res = await fetch(`/api/attendance/branch/${branchCode}`);
        const data = await res.json();

        if (!res.ok) {
          setErrorMsg(data.error || 'Failed to load branch details');
          return;
        }

        setBranch(data.branch);
        setEmployees(data.employees || []);
      } catch (err) {
        setErrorMsg('Network error. Unable to load branch information.');
      } finally {
        setLoading(false);
      }
    }
    loadBranch();
  }, [branchCode]);

  // Load employee status when name is selected
  useEffect(() => {
    if (!selectedEmpId) {
      setEmployeeStatus(null);
      return;
    }

    async function checkStatus() {
      try {
        const res = await fetch(`/api/attendance/employee-status?employeeId=${selectedEmpId}`);
        const data = await res.json();
        if (res.ok) {
          setEmployeeStatus(data);
        }
      } catch (err) {
        console.error('Status check error:', err);
      }
    }
    checkStatus();
  }, [selectedEmpId]);

  // Stop camera tracks cleanly
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCountdown(null);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Initiate Check-In or Check-Out Camera Flow
  const startCameraFlow = async (type: 'check-in' | 'check-out') => {
    if (!selectedEmpId) {
      alert('Please select your name first.');
      return;
    }

    setErrorMsg(null);
    setActionType(type);
    setCapturedPhoto(null);
    setSuccessResult(null);

    try {
      setCameraActive(true);
      // Request front camera
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Start automatic 3-second countdown to capture
      startCountdown();
    } catch (err: any) {
      console.error('Camera access error:', err);
      stopCamera();
      setErrorMsg(
        'Unable to access your camera. Please allow camera permissions in your browser to verify your attendance.'
      );
    }
  };

  const startCountdown = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) {
          clearInterval(interval);
          return null;
        }
        if (prev <= 1) {
          clearInterval(interval);
          captureStillPhoto();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Capture single still photo from camera video stream
  const captureStillPhoto = () => {
    if (!videoRef.current) return;

    playShutterSound();

    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw frame onto canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Compress to JPEG format with 0.8 quality
    const photoBase64 = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedPhoto(photoBase64);

    // Stop camera video stream hardware immediately
    stopCamera();

    // Auto submit photo
    submitAttendance(photoBase64);
  };

  // Submit attendance to API
  const submitAttendance = async (photoData: string) => {
    if (!branch || !selectedEmpId || !actionType) return;

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const endpoint = actionType === 'check-in' ? '/api/attendance/check-in' : '/api/attendance/check-out';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          branchId: branch.id,
          photoBase64: photoData,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to submit attendance');
        setCapturedPhoto(null);
        return;
      }

      setSuccessResult({
        message: data.message,
        time: data.time,
        type: actionType === 'check-in' ? 'Check In' : 'Check Out',
      });

      // Refresh employee status
      const statusRes = await fetch(`/api/attendance/employee-status?employeeId=${selectedEmpId}`);
      if (statusRes.ok) {
        const sData = await statusRes.json();
        setEmployeeStatus(sData);
      }
    } catch (err) {
      setErrorMsg('Network error while submitting attendance. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSuccessResult(null);
    setCapturedPhoto(null);
    setErrorMsg(null);
    setSelectedEmpId('');
    setEmployeeStatus(null);
  };

  const selectedEmployeeObj = employees.find((e) => e.id.toString() === selectedEmpId);

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner}></div>
        <p style={{ marginTop: '1rem', color: '#64748b', fontWeight: 500 }}>Connecting to branch terminal...</p>
      </div>
    );
  }

  if (errorMsg && !branch) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.errorCard}>
          <ShieldAlert size={48} color="#dc2626" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>Branch Terminal Unavailable</h2>
          <p style={{ marginTop: '0.5rem', color: '#64748b' }}>{errorMsg}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Hidden canvas for snapshot rasterization */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Main Employee Terminal Card */}
      <div style={styles.card}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logoBadge}>
            <span style={styles.foxEmoji}>🦊</span>
            <span style={styles.hotelBrand}>REDFOX & REDSTONE HOTELS</span>
          </div>
          <h1 style={styles.title}>REDFOX ATTENDANCE</h1>
          <div style={styles.branchPill}>
            <span style={styles.branchDot}></span>
            <span style={styles.branchName}>{branch?.name}</span>
          </div>
        </header>

        {/* Success Modal / Banner */}
        {successResult && (
          <div style={styles.successBox}>
            <CheckCircle2 size={54} color="#10b981" style={{ margin: '0 auto 0.5rem' }} />
            <h2 style={styles.successTitle}>{successResult.message}</h2>
            <div style={styles.timeBadge}>
              <Clock size={16} />
              <span>{successResult.type}: {successResult.time}</span>
            </div>
            <p style={styles.verifyNote}>
              Verification status: <strong>Pending Management Approval</strong>
            </p>
            <button onClick={handleReset} style={styles.doneButton}>
              Done / Next Employee
            </button>
          </div>
        )}

        {/* Error notification */}
        {errorMsg && (
          <div style={styles.errorBanner}>
            <AlertCircle size={20} color="#b91c1c" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: '0.9rem', color: '#991b1b', fontWeight: 500 }}>{errorMsg}</span>
          </div>
        )}

        {/* Camera Live View Overlay */}
        {cameraActive && (
          <div style={styles.cameraContainer}>
            <div style={styles.cameraOverlay}>
              <div style={styles.faceGuideRing}></div>
              <div style={styles.cameraTip}>
                <Camera size={18} style={{ marginRight: '6px' }} />
                <span>Position your face inside the circle</span>
              </div>
              {countdown !== null && (
                <div style={styles.countdownPill}>
                  {countdown}
                </div>
              )}
            </div>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              style={styles.videoStream}
            />
            <div style={styles.cameraActions}>
              <button
                type="button"
                onClick={captureStillPhoto}
                style={styles.shutterButton}
              >
                Snap Photo Now
              </button>
              <button
                type="button"
                onClick={stopCamera}
                style={styles.cancelCameraButton}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Submitting state */}
        {isSubmitting && (
          <div style={styles.submittingOverlay}>
            <div style={styles.spinner}></div>
            <p style={{ marginTop: '1rem', fontWeight: 600, color: '#0f172a' }}>
              Submitting verified attendance...
            </p>
          </div>
        )}

        {/* Normal Form View (When not in camera/success mode) */}
        {!cameraActive && !successResult && (
          <div style={styles.formBody}>
            {/* Employee Selection */}
            <div style={styles.fieldGroup}>
              <label htmlFor="employee-select" style={styles.fieldLabel}>
                Select Your Name:
              </label>
              <div style={styles.selectWrapper}>
                <select
                  id="employee-select"
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={styles.selectDropdown}
                >
                  <option value="">-- Choose Your Name --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.full_name} ({emp.shift_name})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Selected Employee Info / Status Card */}
            {selectedEmployeeObj && (
              <div style={styles.employeeCard}>
                <div style={styles.empHeader}>
                  <div style={styles.avatarIcon}>
                    {selectedEmployeeObj.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 style={styles.empName}>{selectedEmployeeObj.full_name}</h3>
                    <p style={styles.empShift}>
                      Shift: {selectedEmployeeObj.shift_name} ({selectedEmployeeObj.shift_start} - {selectedEmployeeObj.shift_end})
                    </p>
                  </div>
                </div>

                {employeeStatus && (
                  <div style={styles.statusRow}>
                    <div style={styles.statusItem}>
                      <span style={styles.statusLabel}>Today Check In:</span>
                      <strong style={styles.statusVal}>
                        {employeeStatus.checkInTime || 'Not yet'}
                      </strong>
                    </div>
                    <div style={styles.statusItem}>
                      <span style={styles.statusLabel}>Today Check Out:</span>
                      <strong style={styles.statusVal}>
                        {employeeStatus.checkOutTime || 'Not yet'}
                      </strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actionButtonGroup}>
              <button
                type="button"
                onClick={() => startCameraFlow('check-in')}
                disabled={!selectedEmpId || employeeStatus?.hasCheckedIn}
                style={{
                  ...styles.actionButton,
                  ...styles.checkInButton,
                  opacity: !selectedEmpId || employeeStatus?.hasCheckedIn ? 0.6 : 1,
                  cursor: !selectedEmpId || employeeStatus?.hasCheckedIn ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={styles.btnIcon}>✓</span>
                <span style={styles.btnText}>CHECK IN</span>
              </button>

              <button
                type="button"
                onClick={() => startCameraFlow('check-out')}
                disabled={!selectedEmpId || employeeStatus?.hasCheckedOut}
                style={{
                  ...styles.actionButton,
                  ...styles.checkOutButton,
                  opacity: !selectedEmpId || employeeStatus?.hasCheckedOut ? 0.6 : 1,
                  cursor: !selectedEmpId || employeeStatus?.hasCheckedOut ? 'not-allowed' : 'pointer',
                }}
              >
                <span style={styles.btnIcon}>➜</span>
                <span style={styles.btnText}>CHECK OUT</span>
              </button>
            </div>

            <p style={styles.privacyNote}>
              🔒 Photo is captured solely for manager identity verification and is permanently deleted immediately after review.
            </p>
          </div>
        )}
      </div>

      <footer style={styles.footer}>
        <p>© 2026 Redfox & Redstone Hotels. Official Attendance Portal.</p>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1.25rem 1rem',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    backgroundColor: '#ffffff',
    borderRadius: '24px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
    overflow: 'hidden',
    marginTop: '1rem',
    animation: 'fadeIn 0.3s ease-out',
  },
  header: {
    padding: '2rem 1.5rem 1.25rem',
    textAlign: 'center',
    background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
    borderBottom: '1px solid #f1f5f9',
  },
  logoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    backgroundColor: '#fee2e2',
    borderRadius: '9999px',
    marginBottom: '0.75rem',
  },
  foxEmoji: {
    fontSize: '1rem',
  },
  hotelBrand: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#991b1b',
    letterSpacing: '0.05em',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0,
    letterSpacing: '-0.02em',
  },
  branchPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '0.5rem',
    padding: '6px 14px',
    backgroundColor: '#f1f5f9',
    borderRadius: '9999px',
  },
  branchDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  branchName: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
  },
  formBody: {
    padding: '1.5rem',
  },
  fieldGroup: {
    marginBottom: '1.25rem',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#1e293b',
    marginBottom: '0.5rem',
  },
  selectWrapper: {
    position: 'relative',
  },
  selectDropdown: {
    width: '100%',
    padding: '0.95rem 1rem',
    fontSize: '1.05rem',
    fontWeight: 500,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
    border: '2px solid #e2e8f0',
    borderRadius: '14px',
    outline: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23475569' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 1rem center',
    backgroundSize: '1.2em',
    cursor: 'pointer',
  },
  employeeCard: {
    backgroundColor: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '16px',
    padding: '1rem',
    marginBottom: '1.5rem',
  },
  empHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  avatarIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.2rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  empName: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  empShift: {
    fontSize: '0.8rem',
    color: '#64748b',
    margin: '2px 0 0',
  },
  statusRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '0.75rem',
    paddingTop: '0.75rem',
    borderTop: '1px dashed #cbd5e1',
  },
  statusItem: {
    fontSize: '0.8rem',
    display: 'flex',
    flexDirection: 'column',
  },
  statusLabel: {
    color: '#64748b',
  },
  statusVal: {
    color: '#0f172a',
    fontWeight: 600,
    fontSize: '0.85rem',
  },
  actionButtonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  actionButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '1.1rem',
    borderRadius: '16px',
    fontSize: '1.15rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: '#ffffff',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
  },
  checkInButton: {
    backgroundColor: '#16a34a',
  },
  checkOutButton: {
    backgroundColor: '#dc2626',
  },
  btnIcon: {
    fontSize: '1.3rem',
  },
  btnText: {
    letterSpacing: '0.05em',
  },
  privacyNote: {
    marginTop: '1.25rem',
    fontSize: '0.75rem',
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 1.4,
  },
  /* Camera overlay styles */
  cameraContainer: {
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  videoStream: {
    width: '100%',
    height: '380px',
    objectFit: 'cover',
    transform: 'scaleX(-1)', // Mirror front camera preview
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: '70px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 10,
  },
  faceGuideRing: {
    width: '210px',
    height: '270px',
    borderRadius: '50%',
    border: '3px dashed rgba(255, 255, 255, 0.85)',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.35)',
  },
  cameraTip: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: '1rem',
    padding: '6px 14px',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    color: '#ffffff',
    borderRadius: '9999px',
    fontSize: '0.85rem',
    fontWeight: 500,
  },
  countdownPill: {
    position: 'absolute',
    fontSize: '4.5rem',
    fontWeight: 900,
    color: '#ffffff',
    textShadow: '0 4px 20px rgba(0, 0, 0, 0.8)',
    animation: 'pulseGlow 1s infinite',
  },
  cameraActions: {
    display: 'flex',
    gap: '10px',
    padding: '1rem',
    backgroundColor: '#0f172a',
  },
  shutterButton: {
    flex: 2,
    padding: '0.9rem',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    fontWeight: 700,
    fontSize: '1rem',
  },
  cancelCameraButton: {
    flex: 1,
    padding: '0.9rem',
    backgroundColor: '#334155',
    color: '#ffffff',
    borderRadius: '12px',
    fontWeight: 600,
    fontSize: '0.95rem',
  },
  submittingOverlay: {
    padding: '3rem 2rem',
    textAlign: 'center',
  },
  spinner: {
    width: '40px',
    height: '40px',
    margin: '0 auto',
    border: '4px solid #f1f5f9',
    borderTop: '4px solid #dc2626',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  successBox: {
    padding: '2.5rem 1.5rem',
    textAlign: 'center',
    animation: 'fadeIn 0.3s ease-out',
  },
  successTitle: {
    fontSize: '1.4rem',
    fontWeight: 800,
    color: '#0f172a',
    margin: '0.5rem 0',
  },
  timeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    backgroundColor: '#ecfdf5',
    color: '#065f46',
    borderRadius: '9999px',
    fontWeight: 600,
    fontSize: '0.9rem',
    marginBottom: '1rem',
  },
  verifyNote: {
    fontSize: '0.85rem',
    color: '#64748b',
    marginBottom: '1.5rem',
  },
  doneButton: {
    width: '100%',
    padding: '0.95rem',
    backgroundColor: '#0f172a',
    color: '#ffffff',
    borderRadius: '14px',
    fontWeight: 700,
    fontSize: '1rem',
  },
  errorBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: '1rem 1.5rem 0',
    padding: '0.8rem 1rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
  },
  footer: {
    padding: '1rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  centerContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    padding: '1rem',
  },
  errorCard: {
    backgroundColor: '#ffffff',
    padding: '2rem',
    borderRadius: '20px',
    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.05)',
    textAlign: 'center',
    maxWidth: '400px',
  },
};
