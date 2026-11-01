import type { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { es } from "../i18n/es";

const t = es.qr.scanner;

/**
 * Reads a certificate QR from the camera, a pasted screenshot (Ctrl + V
 * anywhere in the widget) or an uploaded image.
 */
export function QrScannerCard({
  onClose,
  onFallback,
  onDecoded,
}: {
  onClose: () => void;
  /** Absent when the bot can't look certificates up by cédula. */
  onFallback?: () => void;
  onDecoded: (payload: string) => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const decodedRef = useRef(onDecoded);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    decodedRef.current = onDecoded;
  }, [onDecoded]);

  // Start the camera once when the card mounts; stop it on unmount. The QR
  // decoder is loaded here, on first use, so pages that never scan a QR (and
  // the dashboard's preview) don't pay for it up front.
  useEffect(() => {
    const video = videoRef.current;
    let cancelled = false;

    void import("@zxing/browser").then(({ BrowserMultiFormatReader }) => {
      if (cancelled) return;
      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;

      if (!navigator.mediaDevices?.getUserMedia || !video) {
        setError(t.noCamera);
        return;
      }

      setReading(true);
      reader
        .decodeFromVideoDevice(undefined, video, (result, decodeError) => {
          if (result) {
            stopCamera(video, controlsRef);
            decodedRef.current(result.getText());
          } else if (decodeError && !isExpectedDecodeError(decodeError)) {
            setError(t.cameraError);
          }
        })
        .then((controls) => {
          if (cancelled) controls.stop();
          else controlsRef.current = controls;
        })
        .catch(() => {
          setError(t.cameraDenied);
          setReading(false);
        });
    });

    return () => {
      cancelled = true;
      stopCamera(video, controlsRef);
    };
  }, []);

  // Paste is listened for on the whole widget, so the visitor can press
  // Ctrl + V wherever focus is (the text box, a button) inside the chat.
  useEffect(() => {
    const root = cardRef.current?.getRootNode();
    if (!root) return;
    const onPaste = (event: Event) => {
      const items = (event as ClipboardEvent).clipboardData?.items;
      const image = Array.from(items ?? [])
        .find((item) => item.type.startsWith("image/"))
        ?.getAsFile();
      if (image) {
        event.preventDefault();
        void readFile(image);
      }
    };
    root.addEventListener("paste", onPaste);
    return () => root.removeEventListener("paste", onPaste);
  });

  async function readFile(file: File | undefined) {
    if (!file || !readerRef.current) return;
    setError(null);
    const imageUrl = URL.createObjectURL(file);
    try {
      const result = await readerRef.current.decodeFromImageUrl(imageUrl);
      stopCamera(videoRef.current, controlsRef);
      onDecoded(result.getText());
    } catch {
      setError(t.unreadable);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  function close() {
    stopCamera(videoRef.current, controlsRef);
    onClose();
  }

  const secondary =
    "rounded-xl border border-line py-2 text-sm font-semibold text-ink hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary";

  return (
    <section
      ref={cardRef}
      aria-label={t.region}
      className="w-full rounded-2xl border border-line-soft bg-surface p-4 shadow-sm"
    >
      <div className="overflow-hidden rounded-xl bg-video">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="aspect-square w-full object-cover"
        />
      </div>
      <p className="mt-2 text-center text-xs text-faint">
        {reading ? t.aiming : t.idle}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-warn">
          {error}
        </p>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void readFile(event.target.files?.[0])}
      />
      <div className={`mt-3 grid gap-2 ${onFallback ? "grid-cols-2" : ""}`}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="rounded-xl bg-primary py-2 text-sm font-semibold text-primary-fg hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {t.upload}
        </button>
        {onFallback && (
          <button type="button" onClick={onFallback} className={secondary}>
            {t.useId}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={close}
        className={`mt-2 w-full ${secondary}`}
      >
        {t.close}
      </button>
    </section>
  );
}

function stopCamera(
  video: HTMLVideoElement | null,
  controls: { current: { stop: () => void } | null },
) {
  controls.current?.stop();
  controls.current = null;
  if (video?.srcObject instanceof MediaStream) {
    video.srcObject.getTracks().forEach((track) => track.stop());
    video.srcObject = null;
  }
}

function isExpectedDecodeError(error: unknown): boolean {
  return error instanceof Error && error.name === "NotFoundException";
}
