import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { keyboardMinutes, moveDial, pixelsPerMinute } from "./dial";

export interface TomatoDialProps {
  disabled: boolean;
  minutes: number;
  previewMinutes: number | null;
  maxMinutes: number;
  onPreview: (minutes: number) => void;
  onApply: () => void;
  onCancel: () => void;
  onEngage?: () => void;
  onStep?: () => void;
}

/** Pointer capture allows a swipe to finish even when the pointer leaves the fruit. */
export function useTomatoDial(
  props: TomatoDialProps,
  hitTop: (x: number, y: number) => boolean,
) {
  const gesture = useRef<{ id: number; pixels: number; lastX: number } | null>(
    null,
  );
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      props.disabled ||
      event.button !== 0 ||
      event.isPrimary === false ||
      gesture.current ||
      !hitTop(event.clientX, event.clientY)
    )
      return;
    props.onEngage?.();
    const minutes = props.previewMinutes ?? 0;
    gesture.current = {
      id: event.pointerId,
      pixels: minutes * pixelsPerMinute,
      lastX: event.clientX,
    };
    event.currentTarget.focus({ preventScroll: true });
    event.currentTarget.setPointerCapture?.(event.pointerId);
    props.onPreview(minutes);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    if (props.disabled) {
      gesture.current = null;
      props.onCancel();
      return;
    }
    const result = moveDial(
      current.pixels,
      current.lastX,
      event.clientX,
      props.maxMinutes,
    );
    if (result.minutes !== Math.round(current.pixels / pixelsPerMinute))
      props.onStep?.();
    gesture.current = {
      ...current,
      pixels: result.pixels,
      lastX: event.clientX,
    };
    props.onPreview(result.minutes);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onPointerCancel = (event: PointerEvent<HTMLDivElement>) => {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = null;
    props.onCancel();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (props.disabled) return;
    props.onEngage?.();
    if (event.key === "Escape") {
      event.preventDefault();
      props.onCancel();
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (props.previewMinutes === null) props.onPreview(0);
      else if (props.previewMinutes > 0) props.onApply();
      return;
    }
    const minutes = keyboardMinutes(
      event.key,
      props.previewMinutes ?? 0,
      props.maxMinutes,
    );
    if (minutes !== null) {
      event.preventDefault();
      if (minutes !== (props.previewMinutes ?? 0)) props.onStep?.();
      props.onPreview(minutes);
    }
  };
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onKeyDown,
    onLostPointerCapture: () => {
      gesture.current = null;
    },
  };
}
