"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Type } from "lucide-react";
import { Label, inputClasses } from "@/components/ui/Common";
import { SignatureKind } from "@/generated/prisma/enums";

/**
 * Signing a CV, two ways.
 *
 * Drawing with a mouse is no use to a student who cannot see the pad, and
 * a trackpad is no use to somebody whose hand is not steady — so typing
 * initials is a real choice here, not a consolation. Both produce a
 * signature the PDF prints; neither is described as the lesser one.
 *
 * The drawn one is kept as a PNG of what was drawn. It never leaves this
 * page as strokes, so there is nothing to replay or lift.
 */

const PAD_WIDTH = 600;
const PAD_HEIGHT = 200;

export function SignaturePad({
  kind,
  data,
  onChange,
}: {
  kind: SignatureKind;
  data: string;
  onChange: (next: { kind: SignatureKind; data: string }) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(kind === SignatureKind.DRAWN && Boolean(data));

  // The saved signature is painted back in, so coming back to the page
  // shows what was signed rather than an empty box.
  useEffect(() => {
    if (kind !== SignatureKind.DRAWN) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    if (!data) return;

    const image = new Image();
    image.onload = () => context.drawImage(image, 0, 0, canvas.width, canvas.height);
    image.src = data;
  }, [kind, data]);

  function positionOf(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    // The pad is drawn at a fixed size and displayed at whatever width
    // fits, so pointer coordinates have to be scaled back onto it.
    return {
      x: ((event.clientX - box.left) / box.width) * canvas.width,
      y: ((event.clientY - box.top) / box.height) * canvas.height,
    };
  }

  function start(event: React.PointerEvent<HTMLCanvasElement>) {
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    drawing.current = true;
    canvasRef.current?.setPointerCapture(event.pointerId);
    const { x, y } = positionOf(event);
    context.beginPath();
    context.moveTo(x, y);
    context.lineWidth = 3;
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#161c28";
  }

  function move(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const context = canvasRef.current?.getContext("2d");
    if (!context) return;
    const { x, y } = positionOf(event);
    context.lineTo(x, y);
    context.stroke();
    setHasInk(true);
  }

  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange({ kind: SignatureKind.DRAWN, data: canvas.toDataURL("image/png") });
  }

  function clearPad() {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange({ kind: SignatureKind.DRAWN, data: "" });
  }

  return (
    <section className="bg-white rounded-xl border border-line shadow-card p-5 sm:p-6">
      <h2 className="font-display font-bold text-lg text-primary-950">Signature</h2>
      <p className="text-sm text-slate mt-0.5 mb-4">
        Sign your CV whichever way suits you. Typed initials count as a signature here — they print on the document
        exactly as a drawn one does.
      </p>

      <fieldset className="mb-4">
        <legend className="text-sm font-medium text-primary-950 mb-1.5">How would you like to sign?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { value: SignatureKind.TYPED, label: "Type my initials", icon: <Type size={16} aria-hidden="true" /> },
            { value: SignatureKind.DRAWN, label: "Draw it", icon: <PenLine size={16} aria-hidden="true" /> },
            { value: SignatureKind.NONE, label: "Leave it unsigned", icon: null },
          ].map((option) => (
            <label
              key={option.value}
              // Explicit id and htmlFor, not a wrapped input: a reader that
              // doesn't follow the implicit association falls back to the
              // input's value and announces "radio, TYPED" — or nothing at
              // all, which is what a member reported.
              htmlFor={`signature-${option.value}`}
              className="flex items-center gap-2.5 rounded-lg border border-line p-3 text-sm font-semibold text-primary-950 cursor-pointer hover:border-primary-400 has-[:checked]:border-primary-800 has-[:checked]:bg-primary-50"
            >
              <input
                id={`signature-${option.value}`}
                type="radio"
                name="signatureKind"
                value={option.value}
                aria-label={option.label}
                checked={kind === option.value}
                onChange={() => onChange({ kind: option.value, data: "" })}
                className="h-4 w-4 text-primary-800"
              />
              {option.icon}
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      {kind === SignatureKind.TYPED && (
        <div className="max-w-xs">
          <Label htmlFor="signature-typed">Your initials</Label>
          <input
            id="signature-typed"
            value={data}
            maxLength={40}
            placeholder="E.N"
            onChange={(e) => onChange({ kind: SignatureKind.TYPED, data: e.target.value })}
            className={`${inputClasses} font-display text-xl`}
          />
          <p className="text-xs text-slate mt-1">Printed in a script face above your full name.</p>
        </div>
      )}

      {kind === SignatureKind.DRAWN && (
        <div>
          <p id="pad-help" className="text-sm text-slate mb-2">
            Draw inside the box with a mouse, a finger or a stylus.
          </p>
          <canvas
            ref={canvasRef}
            width={PAD_WIDTH}
            height={PAD_HEIGHT}
            aria-label="Signature pad"
            aria-describedby="pad-help"
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="w-full max-w-lg h-40 rounded-lg border-2 border-dashed border-line bg-white touch-none cursor-crosshair"
          />
          <div className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={clearPad}
              className="inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-1.5 text-sm font-semibold text-primary-800 hover:border-primary-400"
            >
              <Eraser size={14} aria-hidden="true" /> Start again
            </button>
            <span className="text-xs text-slate">
              {hasInk ? "Signed." : "Nothing drawn yet — or type your initials instead."}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
