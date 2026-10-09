import { useState } from "react";
import {
  ArrowRight,
  Archive,
  RotateCcw,
  Pencil,
  Plus,
  Play,
  Trash2,
  Check,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Choice, Empty } from "./ui";
import {
  localDate,
  shiftDate,
  type Workspace,
  type ProTask,
  type Routine,
} from "./models";
import type { Editor } from "./editors";
import type { WorkspaceCommand } from "./api";
import type { State } from "../lib/model";
import { liveSessions } from "./insights";
export function Overview({
  workspace,
  state,
  name,
}: {
  workspace: Workspace;
  state: State;
  name: string;
}) {
  const today = localDate(),
    tasks = workspace.tasks.filter((t) => t.plannedDate === today && !t.done),
    sessions = liveSessions(state, workspace),
    week = new Date();
  week.setHours(0, 0, 0, 0);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  const total = sessions
    .filter((s) => s.completedAt >= week.getTime())
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const goal = workspace.preferences.weeklyGoalMinutes;
  return (
    <>
      <p className="pro-eyebrow">YOUR LITTLE FOCUS SPACE</p>
      <h1 className="pro-hero-title">
        Welcome, {name.split(" ")[0]}.<br />
        <span>Make room for what matters.</span>
      </h1>
      <p className="pro-lead">
        A clear next step. A rhythm you enjoy. Progress at your own pace.
      </p>
      <section className="pro-overview-goal">
        <div className="pro-section-heading">
          <h2>This week, gently.</h2>
          <span>
            {Math.round(total)} / {goal} min
          </span>
        </div>
        <div className="pro-progress">
          <span style={{ width: `${Math.min(100, (total / goal) * 100)}%` }} />
        </div>
        <p>
          {total
            ? "Every completed session adds up."
            : "Your first completed session will appear here."}
        </p>
      </section>
      <div className="pro-shortcuts">
        {[
          {
            url: "planner",
            title: "Plan your day",
            text: `${tasks.length} tasks waiting for a little attention`,
          },
          {
            url: "projects",
            title: "Your projects",
            text: `${workspace.projects.filter((p) => !p.archived).length} spaces for meaningful work`,
          },
          {
            url: "routines",
            title: "Find your rhythm",
            text: `${workspace.routines.length} routines ready to use`,
          },
          {
            url: "insights",
            title: "Look back, move forward",
            text: "Explore your focus and project time",
          },
        ].map((item) => (
          <a key={item.url} href={`#/pro/${item.url}`}>
            <h2>
              {item.title}
              <ArrowRight size={15} />
            </h2>
            <p>{item.text}</p>
          </a>
        ))}
      </div>
      <div className="pro-note">
        <strong>A preview you can make your own.</strong>
        <p>
          Projects and routines start with sample content. Your edits stay in
          this browser. Cloud backup, billing, and device sync will arrive with
          the backend.
        </p>
      </div>
    </>
  );
}
export function Projects({
  workspace,
  state,
  edit,
  mutate,
}: {
  workspace: Workspace;
  state: State;
  edit: (e: Editor) => void;
  mutate: (c: WorkspaceCommand) => Promise<void>;
}) {
  const [filter, setFilter] = useState("active");
  const projects = workspace.projects.filter(
    (p) => p.archived === (filter === "archived"),
  );
  const sessions = liveSessions(state, workspace);
  return (
    <>
      <div className="pro-section-heading">
        <div>
          <p className="pro-eyebrow">GIVE YOUR WORK A HOME</p>
          <h1>Projects</h1>
        </div>
        <Button size="sm" onClick={() => edit({ kind: "project" })}>
          <Plus size={14} /> New project
        </Button>
      </div>
      <Choice
        label="Project status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: "active", label: "Active projects" },
          { value: "archived", label: "Archived projects" },
        ]}
      />
      <div className="pro-projects">
        {projects.map((p) => {
          const minutes = sessions
            .filter((s) => s.projectId === p.id)
            .reduce((sum, s) => sum + s.durationMinutes, 0);
          return (
            <article key={p.id} className="pro-project-card">
              <div className="pro-section-heading">
                <h2>
                  <i className={`pro-dot ${p.color}`} />
                  {p.name}
                </h2>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${p.name}`}
                  onClick={() => edit({ kind: "project", value: p })}
                >
                  <Pencil size={14} />
                </Button>
              </div>
              <p>{p.description || "Room for your next good idea."}</p>
              <div className="pro-project-meta">
                <span>
                  {
                    workspace.tasks.filter(
                      (t) => t.projectId === p.id && !t.done,
                    ).length
                  }{" "}
                  open tasks
                </span>
                <span>{minutes} min focused</span>
              </div>
              <p className="pro-fineprint">
                Weekly target · {p.weeklyGoalMinutes} minutes
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void mutate({
                    kind: "project",
                    value: { ...p, archived: !p.archived },
                  }).catch(() => {})
                }
              >
                {p.archived ? <RotateCcw size={14} /> : <Archive size={14} />}{" "}
                {p.archived ? "Restore project" : "Archive project"}
              </Button>
            </article>
          );
        })}
      </div>
      {!projects.length && (
        <Empty
          title={
            filter === "active"
              ? "Room for a new project."
              : "Nothing archived."
          }
        >
          {filter === "active"
            ? "Create a project to organize your planned tasks."
            : "Archived projects keep their tasks and history."}
        </Empty>
      )}
    </>
  );
}
export function Planner({
  workspace,
  state,
  edit,
  mutate,
  onFocus,
  onDelete,
}: {
  workspace: Workspace;
  state: State;
  edit: (e: Editor) => void;
  mutate: (c: WorkspaceCommand) => Promise<void>;
  onFocus: (t: ProTask) => void;
  onDelete: (id: string) => void;
}) {
  const [date, setDate] = useState(localDate),
    [project, setProject] = useState("all");
  const tasks = workspace.tasks.filter(
    (t) =>
      t.plannedDate === date && (project === "all" || t.projectId === project),
  );
  const remainingTomatoes = tasks
    .filter((t) => !t.done)
    .reduce(
      (sum, t) =>
        sum +
        Math.max(
          0,
          t.estimate -
            (state.tasks.find((f) => f.id === `pro-${t.id}`)?.earned ?? 0),
        ),
      0,
    );
  const focus = remainingTomatoes * state.settings.focus;
  let breakMinutes = 0;
  for (let i = 1; i < remainingTomatoes; i++)
    breakMinutes +=
      (state.cycle + i) % state.settings.interval === 0
        ? state.settings.long
        : state.settings.short;
  const duration = focus + breakMinutes;
  const finish = new Date(Date.now() + duration * 60000).toLocaleTimeString(
    [],
    { hour: "numeric", minute: "2-digit" },
  );
  return (
    <>
      <div className="pro-section-heading">
        <div>
          <p className="pro-eyebrow">ONE THING, THEN THE NEXT</p>
          <h1>Daily planner</h1>
        </div>
        <Button size="sm" onClick={() => edit({ kind: "task", date })}>
          <Plus size={14} /> Add task
        </Button>
      </div>
      <div className="pro-planner-toolbar">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Previous day"
          onClick={() => setDate(shiftDate(date, -1))}
        >
          <ChevronLeft size={15} />
        </Button>
        <Input
          type="date"
          aria-label="Planning date"
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
        <Button
          variant="outline"
          size="icon-sm"
          aria-label="Next day"
          onClick={() => setDate(shiftDate(date, 1))}
        >
          <ChevronRight size={15} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDate(localDate())}>
          Today
        </Button>
      </div>
      <Choice
        label="Planner project"
        value={project}
        onChange={setProject}
        options={[
          { value: "all", label: "All projects" },
          ...workspace.projects.map((p) => ({ value: p.id, label: p.name })),
        ]}
      />
      <div className="pro-planner-summary">
        <strong>{remainingTomatoes} tomatoes</strong>
        <span>
          {focus} min focus + {breakMinutes} min breaks
        </span>
        <small>
          {date === localDate() && duration > 0
            ? `Finish around ${finish} if you start now.`
            : "An estimate using your current timer settings."}
        </small>
      </div>
      <div className="pro-planner-list">
        {tasks.map((t) => {
          const p = workspace.projects.find((p) => p.id === t.projectId);
          return (
            <article
              key={t.id}
              className={`pro-plan-task ${t.done ? "done" : ""}`}
            >
              <Button
                variant="outline"
                size="icon-sm"
                aria-label={`${t.done ? "Reopen" : "Complete"} ${t.title}`}
                aria-pressed={t.done}
                onClick={() =>
                  void mutate({
                    kind: "task",
                    value: { ...t, done: !t.done },
                  }).catch(() => {})
                }
              >
                {t.done && <Check size={14} />}
              </Button>
              <div className="pro-task-body">
                <h2>{t.title}</h2>
                <p>
                  {p && (
                    <span>
                      <i className={`pro-dot ${p.color}`} />
                      {p.name} ·{" "}
                    </span>
                  )}
                  {t.estimate} {t.estimate === 1 ? "tomato" : "tomatoes"}
                  {t.recurrence !== "none" && ` · ${t.recurrence}`}
                </p>
                {t.tags.length > 0 && (
                  <div className="pro-tags">
                    {t.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                )}
                <div className="pro-task-actions">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={
                      t.done || !!state.timer.sessionId || !!p?.archived
                    }
                    onClick={() => onFocus(t)}
                  >
                    <Play size={12} /> Focus
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Edit ${t.title}`}
                    onClick={() => edit({ kind: "task", value: t })}
                  >
                    <Pencil size={13} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Delete ${t.title}`}
                    onClick={() => onDelete(t.id)}
                  >
                    <Trash2 size={13} />
                  </Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!tasks.length && (
        <Empty title="A little room in your day.">
          Add one meaningful task to get started.
        </Empty>
      )}
      {!!state.timer.sessionId && (
        <p className="pro-notice">
          Your timer is in progress. Finish or reset it before choosing another
          task.
        </p>
      )}
      <p className="pro-fineprint">
        Recurring tasks appear once on eligible days when you open the app.
        Missed days are not filled in.
      </p>
    </>
  );
}
export function Routines({
  workspace,
  state,
  edit,
  onApply,
  onDelete,
}: {
  workspace: Workspace;
  state: State;
  edit: (e: Editor) => void;
  onApply: (r: Routine) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <>
      <div className="pro-section-heading">
        <div>
          <p className="pro-eyebrow">SAVE YOUR FAVORITE RHYTHM</p>
          <h1>Focus routines</h1>
        </div>
        <Button size="sm" onClick={() => edit({ kind: "routine" })}>
          <Plus size={14} /> New routine
        </Button>
      </div>
      <p className="pro-lead">
        A familiar setup, one click away. Apply a routine, then start when
        you’re ready.
      </p>
      <div className="pro-routines">
        {workspace.routines.map((r) => (
          <article key={r.id} className="pro-panel">
            <div className="pro-section-heading">
              <h2>{r.name}</h2>
              <div className="pro-action-row">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Edit ${r.name}`}
                  onClick={() => edit({ kind: "routine", value: r })}
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Delete ${r.name}`}
                  onClick={() => onDelete(r.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
            <div className="pro-routine-duration">
              <strong>
                {r.focus}
                <small>focus</small>
              </strong>
              <span>/</span>
              <strong>
                {r.short}
                <small>short break</small>
              </strong>
              <span>/</span>
              <strong>
                {r.long}
                <small>long break</small>
              </strong>
            </div>
            <p className="pro-muted">
              Minutes · Long break every {r.interval} sessions
            </p>
            {r.taskTitles.length > 0 && (
              <p className="pro-muted">
                {r.taskTitles.length} template tasks included
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={!!state.timer.sessionId}
              onClick={() => onApply(r)}
            >
              Use routine
              <ArrowRight size={14} />
            </Button>
          </article>
        ))}
      </div>
      {!workspace.routines.length && (
        <Empty title="Find a rhythm that feels like you.">
          Save a routine for coding, reading, or a quick reset.
        </Empty>
      )}
      {!!state.timer.sessionId && (
        <p className="pro-notice">
          Finish or reset your current session before applying a routine.
        </p>
      )}
    </>
  );
}
