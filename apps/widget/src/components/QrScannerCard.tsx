import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState, type ClipboardEvent } from "react";

export function QrScannerCard({
  onClose,
  onFallback,
  onDecoded,
}: {
  onClose: () => void;
  onFallback: () => void;
  onDecoded: (payload: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setReading(true);

    if (!navigator.mediaDevices?.getUserMedia || !videoRef.current) {
      setError("Este navegador no permite acceder a la cámara.");
      setReading(false);
      return;
    }

    reader
      .decodeFromVideoDevice(undefined, videoRef.current, (result, decodeError) => {
        if (result) {
          stopCamera();
          onDecoded(result.getText());
        } else if (decodeError && !isExpectedDecodeError(decodeError)) {
          setError("No pudimos leer el código QR de la cámara.");
        }
      })
      .then((controls) => {
        controlsRef.current = controls;
      })
      .catch(() => {
        setError("No pudimos acceder a tu cámara.");
        setReading(false);
      });

    return () => stopCamera();
    // The scanner starts once when this card mounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current?.srcObject instanceof MediaStream) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setReading(false);
  }

  async function handleFile(file: File | undefined) {
    if (!file || !readerRef.current) return;
    setError(null);
    setReading(true);
    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await readerRef.current.decodeFromImageUrl(imageUrl);
      stopCamera();
      onDecoded(result.getText());
    } catch {
      setError("No encontramos un código QR legible en esa imagen.");
      setReading(false);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const image = Array.from(event.clipboardData.items)
      .find((item) => item.type.startsWith("image/"))
      ?.getAsFile();
    if (image) {
      event.preventDefault();
      void handleFile(image);
    }
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  return (
    <div
      className="w-full rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
      onPaste={handlePaste}
      tabIndex={0}
    >
      <div className="overflow-hidden rounded-xl bg-slate-900">
        <video ref={videoRef} autoPlay playsInline muted className="aspect-square w-full object-cover" />
      </div>
      <p className="mt-2 text-center text-xs text-faint">
        {reading
          ? "Apunta la cámara al código QR o pega una captura dentro de este recuadro."
          : "Puedes pegar una captura o seleccionar un PNG/JPG con el código QR."}
      </p>
      {error && <p className="mt-2 text-center text-sm text-warn">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-primary py-2 text-sm font-semibold text-white hover:opacity-90"
        >
          Subir imagen
        </button>
        <button
          onClick={onFallback}
          className="rounded-xl border border-slate-200 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
        >
          Usar cédula
        </button>
      </div>
      <button
        onClick={handleClose}
        className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-sm font-semibold text-ink hover:bg-slate-50"
      >
        Cerrar lector
      </button>
    </div>
  );
}

function isExpectedDecodeError(error: unknown): boolean {
  return error instanceof Error && error.name === "NotFoundException";
}
