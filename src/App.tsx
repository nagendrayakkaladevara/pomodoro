import { lazy, Suspense, useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  Sparkles,
  Check,
  ChevronDown,
  Coffee,
  Headphones,
  Info,
  Minus,
  Square,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SkipForward,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FeaturesPage } from "./components/features";
import { Attribution } from "./components/attribution";
import { durationLimits } from "./lib/dial";
import {
  soundscapes,
  soundscapeGroups,
  type Soundscape,
} from "./lib/soundscapes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { SettingsDialog } from "./components/settings";
import { HistoryDialog } from "./components/history";
import { useFocus } from "./lib/use-focus";
import { focusAudio } from "./lib/audio";
import {
  formatTime,
  modeNames,
  type Action,
  type Mode,
  type Settings,
} from "./lib/model";

const ProApp = lazy(() => import("./pro/pro-app"));
import type { Routine, ProTask, Mix } from "./pro/models";
const currentPage = () => {
  const path = window.location.hash.slice(1);
  return path === "/features"
    ? "features"
    : path.startsWith("/pro") || ["/login", "/signup", "/forgot"].includes(path)
      ? path
      : "timer";
};
const Tomato = lazy(() => import("./components/tomato"));
export default function App() {
  const {
    state,
    dispatch,
    now,
    today,
    remaining,
    running,
    toggle,
    configure,
    message,
    setMessage,
    storageError,
    previewing,
    previewAmbient,
  } = useFocus();
  const [zen, setZen] = useState(false);
  const [page, setPage] = useState(currentPage);
  const [dialMinutes, setDialMinutes] = useState<number | null>(null);
  useEffect(() => {
    const change = () => {
      setPage(currentPage());
      setDialMinutes(null);
      setShortcuts(false);
      setConfirmAction(null);
    };
    window.addEventListener("hashchange", change);
    return () => window.removeEventListener("hashchange", change);
  }, []);
  const [taskForm, setTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [estimate, setEstimate] = useState(1);
  const [showDone, setShowDone] = useState(false);
  const [confirmAction, setConfirmAction] = useState<Action | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const timer = state.timer;
  const displayedRemaining =
    dialMinutes === null ? remaining : dialMinutes * 60000;
  useEffect(() => {
    setDialMinutes(null);
  }, [timer.mode, timer.sessionId, timer.total]);
  function applyDial() {
    if (dialMinutes === null || dialMinutes < 1 || timer.sessionId) return;
    dispatch({ type: "set-duration", minutes: dialMinutes });
    setDialMinutes(null);
  }
  const selected = state.tasks.find(
    (t) => t.id === state.selectedTask && !t.done,
  );
  const sessionTask = timer.sessionId ? timer.taskTitle : selected?.title;
  const focusMinutes = Math.round(
    today.reduce((sum, s) => sum + s.duration, 0) / 60000,
  );
  const activeTasks = state.tasks.filter((t) => !t.done);
  const completedTasks = state.tasks.filter((t) => t.done);
  const cycleIndex = state.cycle % state.settings.interval;
  const progress = 1 - remaining / timer.total;
  const completedInCycle =
    timer.mode === "long" && state.cycle > 0
      ? state.settings.interval
      : cycleIndex;
  const updateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K],
  ) =>
    configure({
      ...state.settings,
      [key]: value,
      ...(key === "ambient" ? { mix: null } : {}),
    });
  const guardAction = (action: Action) => {
    if (timer.sessionId) setConfirmAction(action);
    else dispatch(action);
  };
  async function toggleSound() {
    await focusAudio.unlock();
    if (!state.settings.sound) focusAudio.chime(state.settings.volume);
    updateSetting("sound", !state.settings.sound);
  }
  useEffect(() => {
    document.title = timer.sessionId
      ? `${formatTime(remaining)} · ${modeNames[timer.mode]} — Pomodoro`
      : page === "features"
        ? "Features — Pomodoro"
        : "Pomodoro — A little focus";
  }, [remaining, timer.mode, timer.sessionId, page]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        page !== "timer" ||
        dialMinutes !== null ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.repeat ||
        document.querySelector('[role="dialog"]')
      )
        return;
      const target = event.target as HTMLElement;
      if (
        target.closest(
          'input,textarea,select,button,a,[role="switch"],[role="tab"],[role="slider"],[role="combobox"],[role="option"],[contenteditable="true"]',
        )
      )
        return;
      if (event.code === "Space") {
        event.preventDefault();
        void toggle();
      }
      if (event.key.toLowerCase() === "f") setZen((z) => !z);
      if (event.key === "?") setShortcuts(true);
      if (event.key === "Escape") setZen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [toggle, page, dialMinutes]);
  function addTask(event: FormEvent) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title || estimate < 1 || estimate > 12 || !Number.isInteger(estimate))
      return;
    dispatch({
      type: "add-task",
      task: {
        id: crypto.randomUUID(),
        title,
        estimate,
        earned: 0,
        done: false,
      },
    });
    setTaskTitle("");
    setEstimate(1);
    setTaskForm(false);
  }
  function useRoutine(routine: Routine) {
    if (timer.sessionId) {
      setMessage("Finish or reset your session before using a routine.");
      return;
    }
    const tasks = routine.taskTitles.map((title, index) => ({
      id: `routine-${routine.id}-${index}`,
      title,
      estimate: 1,
      earned: 0,
      done: false,
    }));
    const missing = tasks.filter(
      (t) => !state.tasks.some((existing) => existing.id === t.id),
    );
    if (state.tasks.length + missing.length > 200) {
      setMessage(
        "Your task list is full. Remove a task before adding this routine.",
      );
      return;
    }
    configure({
      ...state.settings,
      focus: routine.focus,
      short: routine.short,
      long: routine.long,
      interval: routine.interval,
      ambient: routine.ambient,
      mix: null,
    });
    dispatch({ type: "mode", mode: "focus" });
    missing.forEach((task) => dispatch({ type: "add-task", task }));
    setMessage(`${routine.name} is ready. Start whenever you like.`);
    window.location.hash = "#/";
  }
  function focusPlannedTask(task: ProTask) {
    if (timer.sessionId) {
      setMessage("Finish or reset your session before choosing another task.");
      return;
    }
    const id = `pro-${task.id}`;
    const existing = state.tasks.find((t) => t.id === id);
    if (!existing && state.tasks.length >= 200) {
      setMessage(
        "Your task list is full. Remove a task before adding another.",
      );
      return;
    }
    dispatch({
      type: "upsert-task",
      task: {
        id,
        title: task.title,
        estimate: task.estimate,
        earned: existing?.earned ?? 0,
        done: false,
        projectId: task.projectId,
      },
    });
    dispatch({ type: "select", id });
    dispatch({ type: "mode", mode: "focus" });
    setMessage(`${task.title} is ready for your next focus.`);
    window.location.hash = "#/";
  }
  return (
    <MotionConfig reducedMotion="user">
      <a href="#timer" className="skip-link">
        Skip to timer
      </a>
      {page !== "timer" && page !== "features" ? (
        <Suspense
          fallback={
            <main className="focus-app">
              <p role="status">Opening your focus space…</p>
            </main>
          }
        >
          <ProApp
            path={page}
            state={state}
            timerLabel={
              timer.sessionId
                ? `${formatTime(remaining)} · ${running ? "Focusing" : "Paused"}`
                : null
            }
            onRoutine={useRoutine}
            onTask={focusPlannedTask}
            onMix={(mix: Mix) => {
              configure({
                ...state.settings,
                ambient: "off",
                mix: { name: mix.name, layers: mix.layers },
              });
              setMessage(`${mix.name} is ready for your next focus.`);
              window.location.hash = "#/";
            }}
            canPreview={!running && !previewing}
          />
        </Suspense>
      ) : page === "features" ? (
        <FeaturesPage
          timerLabel={
            running
              ? `${formatTime(remaining)} · ${modeNames[timer.mode]}`
              : null
          }
        />
      ) : (
        <motion.main
          className={`focus-app ${zen ? "zen" : ""}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <header className="app-header">
            <div className="brand">
              <img src="/tomato.svg" width="34" height="34" alt="" />
              <div>
                <h1>Pomodoro</h1>
                <p>A little focus. A little rest.</p>
              </div>
            </div>
            <div className="header-actions">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="pro-header-link"
              >
                <a href="#/pro">
                  <Sparkles size={13} />
                  Pro
                </a>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <a
                  href="#/features"
                  aria-label="Application features"
                  title="Explore the features"
                >
                  <Info />
                </a>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  updateSetting(
                    "theme",
                    state.settings.theme === "light" ? "dark" : "light",
                  )
                }
                aria-label={`Switch to ${state.settings.theme === "light" ? "dark" : "light"} mode`}
                title="Change theme"
              >
                {state.settings.theme === "light" ? <Moon /> : <Sun />}
              </Button>
              <SettingsDialog settings={state.settings} onSave={configure} />
            </div>
          </header>
          <section
            id="timer"
            className={`timer-section ${timer.mode !== "focus" ? "break-mode" : ""}`}
            aria-label="Pomodoro timer"
          >
            <div className="timer-topline">
              <span className="section-label">
                {timer.mode === "focus"
                  ? "MAKE ROOM FOR ONE THING"
                  : "REST IS PART OF THE WORK"}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={zen ? "Exit focus view" : "Enter focus view"}
                title={zen ? "Exit focus view (F)" : "Focus view (F)"}
                onClick={() => setZen(!zen)}
              >
                {zen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </Button>
            </div>
            <Tabs
              value={timer.mode}
              onValueChange={(value) =>
                guardAction({ type: "mode", mode: value as Mode })
              }
            >
              <TabsList className="mode-tabs" aria-label="Timer mode">
                {(["focus", "short", "long"] as const).map((mode) => (
                  <TabsTrigger key={mode} value={mode}>
                    {modeNames[mode]}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent value={timer.mode} className="outline-none">
                <div className="tomato-stage">
                  <Suspense
                    fallback={
                      <div className="tomato-loading">
                        <img
                          src="/tomato.svg"
                          width="130"
                          height="130"
                          alt="Tomato timer"
                        />
                      </div>
                    }
                  >
                    <Tomato
                      running={running}
                      progress={progress}
                      disabled={!!timer.sessionId}
                      minutes={timer.total / 60000}
                      previewMinutes={dialMinutes}
                      maxMinutes={durationLimits[timer.mode]}
                      onEngage={() => {
                        void focusAudio.unlock();
                      }}
                      onStep={() => focusAudio.tick(state.settings.volume)}
                      onPreview={setDialMinutes}
                      onApply={applyDial}
                      onCancel={() => setDialMinutes(null)}
                    />
                  </Suspense>
                </div>
                <div className="clock-area">
                  <div
                    className={`clock ${dialMinutes !== null ? "dial-preview" : ""}`}
                    role="timer"
                    aria-label={`${modeNames[timer.mode]}, ${Math.ceil(displayedRemaining / 60000)} minutes${dialMinutes !== null ? " preview" : " remaining"}`}
                  >
                    {formatTime(displayedRemaining)}
                  </div>
                  <p className="timer-caption">
                    {dialMinutes !== null
                      ? "Turn left to add minutes. Right to take some back."
                      : running
                        ? timer.mode === "focus"
                          ? "One thing at a time. You’ve got this."
                          : "Step away. Stretch. Take a breath."
                        : timer.sessionId
                          ? "Take your time. Your focus is right here."
                          : timer.mode === "focus"
                            ? "A fresh start, whenever you’re ready."
                            : "You earned a little breathing room."}
                  </p>
                </div>
                <AnimatePresence initial={false}>
                  {dialMinutes !== null && (
                    <motion.div
                      className="dial-controls"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="dial-stepper">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Decrease duration"
                          disabled={dialMinutes === 0}
                          onClick={() =>
                            setDialMinutes(Math.max(0, dialMinutes - 1))
                          }
                        >
                          <Minus size={14} />
                        </Button>
                        <span>
                          {dialMinutes} / {durationLimits[timer.mode]} min
                        </span>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Increase duration"
                          disabled={dialMinutes === durationLimits[timer.mode]}
                          onClick={() =>
                            setDialMinutes(
                              Math.min(
                                durationLimits[timer.mode],
                                dialMinutes + 1,
                              ),
                            )
                          }
                        >
                          <Plus size={14} />
                        </Button>
                      </div>
                      <div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDialMinutes(null)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          disabled={dialMinutes < 1}
                          onClick={applyDial}
                        >
                          Set time <Check size={13} />
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                <p className="dial-hint" id="dial-hint">
                  {timer.sessionId
                    ? "Finish or reset this session to turn the dial."
                    : dialMinutes !== null
                      ? "Swipe again to keep adding · Set time when ready"
                      : "Drag the tomato’s top ← to set your time"}
                </p>
                <div className="timer-controls">
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => guardAction({ type: "reset" })}
                    disabled={
                      dialMinutes !== null ||
                      (!timer.sessionId &&
                        timer.total === state.settings[timer.mode] * 60000)
                    }
                    aria-label="Reset current session"
                    title="Reset session"
                  >
                    <RotateCcw size={17} />
                  </Button>
                  <Button
                    className="start-button"
                    size="lg"
                    disabled={dialMinutes !== null}
                    onClick={() => void toggle()}
                  >
                    {running ? (
                      <Pause fill="currentColor" size={14} />
                    ) : (
                      <Play fill="currentColor" size={14} />
                    )}{" "}
                    {running
                      ? "Pause"
                      : timer.sessionId
                        ? "Resume"
                        : timer.mode === "focus"
                          ? "Start focus"
                          : "Start break"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-lg"
                    onClick={() => guardAction({ type: "skip" })}
                    disabled={dialMinutes !== null}
                    aria-label="Skip current session"
                    title="Skip session (doesn’t count as completed)"
                  >
                    <SkipForward size={17} />
                  </Button>
                </div>
                <div
                  className="cycle-indicator"
                  aria-label={`${completedInCycle} of ${state.settings.interval} focus sessions completed in this cycle`}
                >
                  <div className="cycle-dots">
                    {Array.from({ length: state.settings.interval }, (_, i) => (
                      <span
                        key={i}
                        className={
                          i < completedInCycle
                            ? "filled"
                            : i === cycleIndex && timer.mode === "focus"
                              ? "current"
                              : ""
                        }
                      />
                    ))}
                  </div>
                  <span>
                    {timer.mode === "focus"
                      ? `Session ${cycleIndex + 1} of ${state.settings.interval}`
                      : timer.mode === "long"
                        ? "A longer pause. Well earned."
                        : `Next up: session ${cycleIndex + 1}`}
                  </span>
                </div>
                <div className="current-task">
                  <span className={`status-dot ${running ? "active" : ""}`} />
                  <span>
                    {timer.mode !== "focus" ? (
                      <>
                        <Coffee size={13} /> A moment to recharge
                      </>
                    ) : sessionTask ? (
                      <>
                        Focusing on <strong>{sessionTask}</strong>
                      </>
                    ) : (
                      "An open space for your next idea"
                    )}
                  </span>
                </div>
                <div className="sound-strip">
                  <div className="ambient-select">
                    <Headphones size={14} />
                    <Select
                      value={
                        state.settings.mix
                          ? "saved-mix"
                          : state.settings.ambient
                      }
                      onValueChange={async (value) => {
                        if (value === "saved-mix") return;
                        await focusAudio.unlock();
                        updateSetting("ambient", value as Soundscape);
                      }}
                    >
                      <SelectTrigger
                        className="sound-select"
                        aria-label="Ambient sound"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="sound-options">
                        {state.settings.mix && (
                          <SelectItem value="saved-mix">
                            {state.settings.mix.name} · Mix
                          </SelectItem>
                        )}
                        {soundscapeGroups.map((group) => (
                          <SelectGroup key={group}>
                            <SelectLabel>{group}</SelectLabel>
                            {soundscapes
                              .filter((sound) => sound.group === group)
                              .map((sound) => (
                                <SelectItem
                                  key={sound.value}
                                  value={sound.value}
                                >
                                  {sound.label}
                                </SelectItem>
                              ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    {!running &&
                      (state.settings.ambient !== "off" ||
                        !!state.settings.mix) && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="sound-preview-button"
                          aria-label={
                            previewing
                              ? "Stop sound preview"
                              : "Preview sound for 8 seconds"
                          }
                          title={
                            previewing
                              ? "Stop preview"
                              : "Preview for 8 seconds"
                          }
                          onClick={() => void previewAmbient()}
                        >
                          {previewing ? (
                            <Square size={11} fill="currentColor" />
                          ) : (
                            <Play size={11} />
                          )}
                        </Button>
                      )}
                  </div>
                  <span className="strip-divider" />
                  <button
                    className="sound-toggle"
                    onClick={() => void toggleSound()}
                    aria-pressed={state.settings.sound}
                  >
                    {state.settings.sound ? (
                      <Volume2 size={14} />
                    ) : (
                      <VolumeX size={14} />
                    )}{" "}
                    Chime {state.settings.sound ? "on" : "off"}
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          </section>
          <div className="support-sections">
            <section className="today-section" aria-labelledby="today-heading">
              <div className="section-heading">
                <h2 id="today-heading" className="section-label">
                  A LITTLE PROGRESS
                </h2>
                <HistoryDialog sessions={state.sessions} now={now} />
              </div>
              <div className="stats">
                <div>
                  <strong>{today.length.toString().padStart(2, "0")}</strong>
                  <span>tomatoes today</span>
                </div>
                <div>
                  <strong>
                    {focusMinutes}
                    <small> min</small>
                  </strong>
                  <span>time well spent</span>
                </div>
                <div>
                  <strong>
                    {today.length}
                    <small> / {state.settings.goal}</small>
                  </strong>
                  <span>daily goal</span>
                </div>
              </div>
              <div
                className="goal-track"
                role="progressbar"
                aria-label="Daily focus goal"
                aria-valuemin={0}
                aria-valuemax={state.settings.goal}
                aria-valuenow={Math.min(today.length, state.settings.goal)}
              >
                <motion.span
                  initial={false}
                  animate={{
                    width: `${Math.min(100, (today.length / state.settings.goal) * 100)}%`,
                  }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="progress-note">
                {today.length >= state.settings.goal
                  ? "Your daily goal is complete. Make some room for rest."
                  : today.length
                    ? `${state.settings.goal - today.length} more ${state.settings.goal - today.length === 1 ? "tomato" : "tomatoes"} to your daily goal. Small steps count.`
                    : "Good things grow with a little attention."}
              </p>
            </section>
            <section className="tasks-section" aria-labelledby="tasks-heading">
              <div className="section-heading">
                <h2 id="tasks-heading" className="section-label">
                  ONE THING AT A TIME{" "}
                  <span className="count">{activeTasks.length}</span>
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="quiet-link"
                  disabled={state.tasks.length >= 200}
                  onClick={() => setTaskForm(!taskForm)}
                >
                  {taskForm ? <X size={14} /> : <Plus size={14} />}{" "}
                  {taskForm ? "Close" : "Add task"}
                </Button>
              </div>
              {taskForm && (
                <form className="task-form" onSubmit={addTask}>
                  <label htmlFor="task-title" className="sr-only">
                    What would you like to focus on?
                  </label>
                  <Input
                    id="task-title"
                    autoFocus
                    maxLength={160}
                    required
                    placeholder="What would you like to focus on?"
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                  />
                  <div className="task-form-bottom">
                    <label htmlFor="estimate">Estimated tomatoes</label>
                    <Input
                      id="estimate"
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={Number.isNaN(estimate) ? "" : estimate}
                      onChange={(e) =>
                        setEstimate(
                          e.target.value === "" ? NaN : Number(e.target.value),
                        )
                      }
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!taskTitle.trim()}
                    >
                      Add task <ArrowRight size={14} />
                    </Button>
                  </div>
                </form>
              )}
              {!activeTasks.length && !taskForm && (
                <button
                  className="empty-tasks"
                  onClick={() => setTaskForm(true)}
                >
                  <span className="empty-icon">
                    <Plus size={18} />
                  </span>
                  <span>
                    <strong>What’s your one thing?</strong>
                    <span>Add a task, or simply start an open focus.</span>
                  </span>
                  <ArrowUpRightSmall />
                </button>
              )}
              <ul className="task-list">
                {activeTasks.map((task) => (
                  <li
                    key={task.id}
                    className={state.selectedTask === task.id ? "selected" : ""}
                  >
                    <button
                      className="task-checkbox"
                      aria-label={`Mark ${task.title} complete`}
                      onClick={() =>
                        dispatch({ type: "toggle-task", id: task.id })
                      }
                    >
                      <Check size={12} />
                    </button>
                    <button
                      className="task-select"
                      aria-label={`Focus on ${task.title}`}
                      disabled={!!timer.sessionId}
                      aria-pressed={state.selectedTask === task.id}
                      title={
                        timer.sessionId
                          ? "Choose the next task after this session"
                          : "Focus on this task"
                      }
                      onClick={() => dispatch({ type: "select", id: task.id })}
                    >
                      <span>{task.title}</span>
                      {state.selectedTask === task.id && (
                        <span className="task-active-label">
                          {running && timer.mode === "focus"
                            ? "in focus"
                            : "up next"}
                        </span>
                      )}
                    </button>
                    <span
                      className="task-estimate"
                      title={`${task.earned} completed of ${task.estimate} planned tomatoes`}
                    >
                      <img src="/tomato.svg" alt="" />
                      {task.earned}
                      <span>/{task.estimate}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="delete-task"
                      aria-label={`Delete ${task.title}`}
                      onClick={() =>
                        dispatch({ type: "delete-task", id: task.id })
                      }
                    >
                      <Trash2 size={13} />
                    </Button>
                  </li>
                ))}
              </ul>
              {timer.sessionId && activeTasks.length > 0 && (
                <p className="fine-print">
                  Your current task stays with this session. Pick another after
                  your break.
                </p>
              )}
              {completedTasks.length > 0 && (
                <>
                  <button
                    className="completed-toggle"
                    onClick={() => setShowDone(!showDone)}
                    aria-expanded={showDone}
                  >
                    <ChevronDown
                      size={13}
                      className={showDone ? "rotate-180" : ""}
                    />
                    {completedTasks.length} completed
                  </button>
                  {showDone && (
                    <ul className="task-list done-list">
                      {completedTasks.map((task) => (
                        <li key={task.id}>
                          <button
                            className="task-checkbox checked"
                            aria-label={`Reopen ${task.title}`}
                            onClick={() =>
                              dispatch({ type: "toggle-task", id: task.id })
                            }
                          >
                            <Check size={12} />
                          </button>
                          <span className="done-title">{task.title}</span>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Delete ${task.title}`}
                            onClick={() =>
                              dispatch({ type: "delete-task", id: task.id })
                            }
                          >
                            <Trash2 size={13} />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>
            <section className="notes-section">
              <details>
                <summary>
                  <span>
                    <span className="section-label">PARK A THOUGHT</span>
                    <span className="notes-hint">
                      Let it go. Come back to it later.
                    </span>
                  </span>
                  <ChevronDown size={14} />
                </summary>
                <label className="sr-only" htmlFor="notes">
                  Distraction notes
                </label>
                <textarea
                  id="notes"
                  maxLength={2000}
                  placeholder="A thought, a to-do, something to look up later…"
                  value={state.note}
                  onChange={(e) =>
                    dispatch({ type: "note", note: e.target.value })
                  }
                />
                <span className="note-count">
                  {state.note.length}/2000 · saved as you type
                </span>
              </details>
            </section>
          </div>
          <footer>
            <p>
              <span className={`save-dot ${storageError ? "error" : ""}`} />
              {storageError
                ? "Storage unavailable. Keep this tab open."
                : "Your rhythm, saved on this device."}
            </p>
            <button onClick={() => setShortcuts(true)}>
              Shortcuts <kbd>?</kbd>
            </button>
          </footer>
          <Attribution />
        </motion.main>
      )}
      <AnimatePresence>
        {message && (
          <motion.div
            className="toast"
            role="status"
            style={{ x: "-50%" }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <img src="/tomato.svg" width="20" height="20" alt="" />
            <span>{message}</span>
            <button onClick={() => setMessage("")} aria-label="Dismiss message">
              <X size={15} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogTitle>Leave this session?</DialogTitle>
          <DialogDescription>
            This session won’t count as a completed tomato. Your finished
            sessions and tasks are saved.
          </DialogDescription>
          <div className="confirm-buttons">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              Keep going
            </Button>
            <Button
              onClick={() => {
                if (confirmAction) dispatch(confirmAction);
                setConfirmAction(null);
              }}
            >
              Leave session
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={shortcuts} onOpenChange={setShortcuts}>
        <DialogContent>
          <DialogTitle>A few quiet shortcuts.</DialogTitle>
          <DialogDescription>
            Available when you’re not typing or using a control.
          </DialogDescription>
          <dl className="shortcut-list">
            <div>
              <dt>Start or pause</dt>
              <dd>
                <kbd>Space</kbd>
              </dd>
            </div>
            <div>
              <dt>Focus view</dt>
              <dd>
                <kbd>F</kbd>
              </dd>
            </div>
            <div>
              <dt>Leave focus view</dt>
              <dd>
                <kbd>Esc</kbd>
              </dd>
            </div>
            <div>
              <dt>Show shortcuts</dt>
              <dd>
                <kbd>?</kbd>
              </dd>
            </div>
          </dl>
        </DialogContent>
      </Dialog>
    </MotionConfig>
  );
}
function ArrowUpRightSmall() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}
