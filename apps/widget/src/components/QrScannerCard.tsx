import { useEffect, useRef, useState } from "react";

/**
 * HU-02 stub: we don't have real QR-encoded certificates to decode against
 * (the client never sent sample data), so this only proves out the camera
 * permission flow — open the camera, or fail gracefully and point back at
 * the cédula flow, matching the story's acceptance criteria.
 */
export function QrScannerCard({ onClose, onFallback }: { onClose: () => void; onFallback: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => setError("No pudimos acceder a tu cámara."));

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleClose() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onClose();
  }

  return (
    <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      {error ? (
        <div className="text-center">
          <p className="text-sm text-ink">{error}</p>
          <p className="mt-1 text-xs text-faint">Intenta de otra manera o usa tu cédula.</p>
          <button
            onClick={onFallback}
            className="mt-3 w-full rounded-xl bg-primary py-2 text-sm font-semibold text-white"
          >
            Consultar por cédula
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-xl bg-slate-900">
            <video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full object-cover" />
          </div>
          <p className="mt-2 text-center text-xs text-faint">
            Función en desarrollo — por ahora solo mostramos la cámara, sin decodificar el código todavía.
          </p>
          <button
            onClick={handleClose}
            className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
          >
            Cerrar cámara
          </button>
        </>
      )}
    </div>
  );
}
