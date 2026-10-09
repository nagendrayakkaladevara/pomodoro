import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  AudioLines,
  CheckCheck,
  Coffee,
  Leaf,
  ListTodo,
  NotebookPen,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Attribution } from "./attribution";

const features = [
  {
    icon: RotateCcw,
    title: "A tomato you can turn.",
    text: "Touch the top before starting a session to show 00:00. Drag left to add minutes, or right to reduce them. Repeat your swipe for longer sessions, then choose Set time. Cancel restores your previous duration.",
    detail:
      "1–120 minutes for focus · 1–30 for short breaks · 1–60 for long breaks",
  },
  {
    icon: Coffee,
    title: "Find your rhythm.",
    text: "Move between focus, short breaks, and longer rests. Choose your durations, how often to take a long break, and whether breaks start automatically. You always choose when to begin your next focus.",
  },
  {
    icon: ListTodo,
    title: "One task, your full attention.",
    text: "Add tasks, estimate how many tomatoes they need, and select your next priority. Completed focus sessions are credited to that task. Mark tasks done and reopen them when needed.",
  },
  {
    icon: AudioLines,
    title: "A softer soundtrack.",
    text: "Choose soft rain, brown noise, ocean waves, or three original synthesized melodies: Gentle keys, Music box, and Slow drift. Preview a sound before you begin. A separate completion chime quietly marks the end of a session.",
  },
  {
    icon: Leaf,
    title: "Progress you can feel.",
    text: "Set a small daily goal and see your completed tomatoes and focus minutes. Open History for the last seven days and recent sessions. Export your retained history as a CSV whenever you like.",
  },
  {
    icon: NotebookPen,
    title: "Give stray thoughts a place.",
    text: "Park a thought in your notes instead of following it. Everything is saved as you type, ready for your next break.",
  },
  {
    icon: Sparkles,
    title: "A quieter space.",
    text: "Focus view keeps the timer front and center. Switch between light and warm dark themes. Gentle transitions respect your device’s reduced-motion preference.",
  },
  {
    icon: ShieldCheck,
    title: "Pick up where you left off.",
    text: "Tasks, settings, notes, history, and your timer are saved in this browser. Refreshing recovers the current session. A sleeping tab records only its actual session; it never invents a chain of completed sessions.",
  },
];

export function FeaturesPage({ timerLabel }: { timerLabel: string | null }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
  }, []);
  return (
    <motion.main
      className="focus-app features-page"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      <a className="back-to-focus" href="#/">
        <ArrowLeft size={14} /> Back to your focus{" "}
        {timerLabel && <span className="live-timer-label">{timerLabel}</span>}
      </a>
      <header className="features-header">
        <p className="section-label">A LITTLE GUIDE</p>
        <h1 ref={heading} tabIndex={-1}>
          Small details.
          <br /> <span>Better focus.</span>
        </h1>
        <p>
          A thoughtful place to do one thing well, take a breath, and begin
          again.
        </p>
      </header>
      <div className="feature-list">
        {features.map(({ icon: Icon, title, text, detail }, index) => (
          <motion.section
            key={title}
            className="feature-row"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.18) }}
          >
            <div className="feature-icon">
              <Icon size={17} />
            </div>
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
              {detail && <span className="feature-detail">{detail}</span>}
            </div>
          </motion.section>
        ))}
      </div>
      <section className="features-tip">
        <SlidersHorizontal size={16} />
        <div>
          <h2>A couple of useful things.</h2>
          <p>
            The tomato dial is locked during running or paused sessions. Finish
            or reset the session before setting a new duration. Keyboard users
            can focus the tomato and press Enter to begin, use the arrow keys,
            then Enter to apply or Escape to cancel.
          </p>
          <p>
            Sounds need an initial click or tap. Closing or locking your phone
            may delay sound cues. Your data stays in this browser and does not
            sync across devices.
          </p>
        </div>
      </section>
      <Button asChild className="features-return">
        <a href="#/">
          <CheckCheck size={15} /> Ready for a little focus
        </a>
      </Button>
      <Attribution />
    </motion.main>
  );
}
