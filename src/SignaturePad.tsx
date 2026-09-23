import { useEffect, useRef, useState } from 'react';
import { Check, Eraser, X } from 'lucide-react';

type SignaturePadProps = {
  label: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
};

export default function SignaturePad({ label, onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const [hasStrokes, setHasStrokes] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#1a332f';
  }, []);

  const getPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    lastPoint.current = getPoint(e);
    canvasRef.current?.setPointerCapture(e.pointerId);
  };

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const point = getPoint(e);
    if (lastPoint.current) {
      ctx.beginPath();
      ctx.moveTo(lastPoint.current.x, lastPoint.current.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
    lastPoint.current = point;
    if (!hasStrokes) setHasStrokes(true);
  };

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drawing.current = false;
    lastPoint.current = null;
    canvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  };

  const save = () => {
    if (!hasStrokes) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="signature-overlay">
      <div className="signature-modal">
        <div className="signature-header">
          <strong>{label}</strong>
          <button className="icon-button" onClick={onCancel} aria-label="Cancel"><X size={18} /></button>
        </div>
        <p className="signature-hint">Draw your signature in the box below using your finger or mouse.</p>
        <div className="signature-canvas-wrap">
          <canvas
            ref={canvasRef}
            width={460}
            height={180}
            className="signature-canvas"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
          />
          {!hasStrokes && <span className="signature-placeholder">Sign here</span>}
        </div>
        <div className="signature-actions">
          <button className="secondary-button" onClick={clear} disabled={!hasStrokes}><Eraser size={15} /> Clear</button>
          <button className="primary-button" onClick={save} disabled={!hasStrokes}><Check size={16} /> Confirm signature</button>
        </div>
      </div>
    </div>
  );
}
