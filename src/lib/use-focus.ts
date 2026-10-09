import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  dayKey,
  initialState,
  parseState,
  reducer,
  remainingTime,
  STORAGE_KEY,
  type Settings,
  type Action,
} from "./model";
import { focusAudio } from "./audio";

export function useFocus() {
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    try {
      return parseState(localStorage.getItem(STORAGE_KEY)) ?? initialState();
    } catch {
      return initialState();
    }
  });
  const [now, setNow] = useState(Date.now);
  const [message, setMessage] = useState("");
  const [storageError, setStorageError] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const previous = useRef(state);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
    document.documentElement.classList.toggle(
      "dark",
      state.settings.theme === "dark",
    );
    if (
      previous.current.timer.endAt !== null &&
      state.timer.mode !== previous.current.timer.mode
    ) {
      const finished = state.sessions.length > previous.current.sessions.length;
      if (
        finished ||
        (previous.current.timer.mode !== "focus" &&
          state.timer.mode === "focus" &&
          previous.current.timer.endAt <= Date.now())
      ) {
        if (state.settings.sound) focusAudio.chime(state.settings.volume);
        setMessage(
          finished
            ? "One tomato earned. Time for a well-deserved break."
            : "Break complete. Ready for a fresh start?",
        );
      }
    }
    previous.current = state;
  }, [state]);
  useEffect(() => {
    const tick = () => {
      const time = Date.now();
      setNow(time);
      dispatch({
        type: "tick",
        now: time,
        visible: document.visibilityState === "visible",
      });
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const saved = parseState(event.newValue);
      if (saved) {
        previous.current = saved;
        dispatch({ type: "restore", state: saved });
      }
    };
    window.addEventListener("storage", sync);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("storage", sync);
    };
  }, []);
  useEffect(() => {
    if ((state.timer.endAt !== null || previewing) && state.settings.mix) {
      focusAudio.ambientMix(state.settings.mix.layers, state.settings.volume);
    } else {
      focusAudio.ambient(
        state.timer.endAt !== null || previewing
          ? state.settings.ambient
          : "off",
        state.settings.volume,
      );
    }
    return () => focusAudio.stop();
  }, [
    state.timer.endAt,
    state.settings.ambient,
    state.settings.volume,
    state.settings.mix,
    previewing,
  ]);
  useEffect(() => {
    if (
      state.timer.endAt !== null ||
      (state.settings.ambient === "off" && !state.settings.mix)
    )
      setPreviewing(false);
  }, [state.timer.endAt, state.settings.ambient, state.settings.mix]);
  useEffect(() => {
    if (!previewing) return;
    const timeout = setTimeout(() => setPreviewing(false), 8000);
    return () => clearTimeout(timeout);
  }, [previewing]);
  const previewAmbient = useCallback(async () => {
    await focusAudio.unlock();
    setPreviewing((value) => !value);
  }, []);
  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(""), 6500);
    return () => clearTimeout(id);
  }, [message]);
  const toggle = useCallback(async () => {
    await focusAudio.unlock();
    setNow(Date.now());
    dispatch({ type: "toggle", now: Date.now(), id: crypto.randomUUID() });
  }, []);
  const configure = useCallback(
    (settings: Settings) => dispatch({ type: "settings", settings }),
    [],
  );
  const act = useCallback((action: Action) => {
    setNow(Date.now());
    dispatch(action);
  }, []);
  const today = state.sessions.filter(
    (s) => dayKey(s.completedAt) === dayKey(now),
  );
  const remaining = remainingTime(state.timer, now);
  return {
    state,
    dispatch: act,
    now,
    today,
    remaining,
    running: state.timer.endAt !== null,
    toggle,
    configure,
    message,
    setMessage,
    storageError,
    previewing,
    previewAmbient,
  };
}
