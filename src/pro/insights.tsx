import { useMemo, useState } from "react";
import { ArrowUpRight, Clock3, Target, Sprout } from "lucide-react";
import { Choice, Empty, downloadJson } from "./ui";
import { Button } from "@/components/ui/button";
import { localDate, shiftDate, type Workspace } from "./models";
import type { State } from "../lib/model";
export type InsightSession = {
  id: string;
  projectId: string | null;
  taskTitle: string;
  completedAt: number;
  durationMinutes: number;
};
export function liveSessions(
  state: State,
  workspace: Workspace,
): InsightSession[] {
  return state.sessions.map((s) => ({
    id: s.id,
    projectId:
      s.projectId ??
      workspace.tasks.find((t) => `pro-${t.id}` === s.taskId)?.projectId ??
      null,
    taskTitle: s.task,
    completedAt: s.completedAt,
    durationMinutes: s.duration / 60000,
  }));
}
export function summarize(
  sessions: InsightSession[],
  from: string,
  to: string,
) {
  return sessions.filter((s) => {
    const date = localDate(new Date(s.completedAt));
    return date >= from && date <= to;
  });
}
export function Insights({
  workspace,
  state,
}: {
  workspace: Workspace;
  state: State;
}) {
  const [source, setSource] = useState("mine"),
    [range, setRange] = useState("7"),
    [project, setProject] = useState("all");
  const today = localDate(),
    from = shiftDate(today, 1 - Number(range));
  const all = useMemo(
    () =>
      source === "sample"
        ? workspace.sampleSessions
        : liveSessions(state, workspace),
    [source, workspace, state.sessions],
  );
  const sessions = summarize(all, from, today).filter(
    (s) => project === "all" || s.projectId === project,
  );
  const total = sessions.reduce((sum, s) => sum + s.durationMinutes, 0),
    days = new Set(sessions.map((s) => localDate(new Date(s.completedAt))))
      .size;
  const buckets = Array.from(
    { length: Math.min(Number(range), 14) },
    (_, i) => {
      const count = Math.min(Number(range), 14),
        start = Math.floor((i * Number(range)) / count),
        end = Math.floor(((i + 1) * Number(range)) / count);
      const date = shiftDate(from, start),
        last = shiftDate(from, end - 1);
      return {
        date,
        minutes: summarize(sessions, date, last).reduce(
          (sum, s) => sum + s.durationMinutes,
          0,
        ),
      };
    },
  );
  const max = Math.max(1, ...buckets.map((b) => b.minutes));
  const breakdown = workspace.projects
    .map((p) => ({
      ...p,
      minutes: sessions
        .filter((s) => s.projectId === p.id)
        .reduce((sum, s) => sum + s.durationMinutes, 0),
    }))
    .filter((p) => p.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
  const unassigned = sessions
    .filter((s) => !s.projectId)
    .reduce((sum, s) => sum + s.durationMinutes, 0);
  const planned = workspace.tasks
    .filter(
      (t) =>
        t.plannedDate >= from &&
        t.plannedDate <= today &&
        (project === "all" || t.projectId === project),
    )
    .reduce((sum, t) => sum + t.estimate * state.settings.focus, 0);
  return (
    <>
      <div className="pro-section-heading">
        <div>
          <p className="pro-eyebrow">NOTICE YOUR PROGRESS</p>
          <h1>Focus insights</h1>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            downloadJson(`pomodoro-${source}-insights.json`, {
              source,
              from,
              to: today,
              totalMinutes: total,
              sessions,
            })
          }
        >
          Export
        </Button>
      </div>
      <div className="pro-filters">
        <Choice
          label="Insights data"
          value={source}
          onChange={setSource}
          options={[
            { value: "mine", label: "My focus" },
            { value: "sample", label: "Sample data" },
          ]}
        />
        <Choice
          label="Date range"
          value={range}
          onChange={setRange}
          options={[
            { value: "7", label: "Last 7 days" },
            { value: "30", label: "Last 30 days" },
            { value: "90", label: "Last 90 days" },
            { value: "365", label: "Last year" },
          ]}
        />
        <Choice
          label="Filter by project"
          value={project}
          onChange={setProject}
          options={[
            { value: "all", label: "All projects" },
            ...workspace.projects.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
      </div>
      {source === "sample" && (
        <p className="pro-notice">
          Illustrative sample sessions. These are separate from your focus
          history.
        </p>
      )}
      <div className="pro-stats">
        <div>
          <Clock3 size={16} />
          <strong>
            {(total / 60).toFixed(1)}
            <small>h</small>
          </strong>
          <span>Focused time</span>
        </div>
        <div>
          <Target size={16} />
          <strong>{sessions.length}</strong>
          <span>Tomatoes</span>
        </div>
        <div>
          <Sprout size={16} />
          <strong>{days}</strong>
          <span>Active days</span>
        </div>
      </div>
      {sessions.length === 0 ? (
        <Empty title="Your next session is a beginning.">
          Complete a focus session to see it here, or select Sample data to
          explore the reports.
        </Empty>
      ) : (
        <section className="pro-panel">
          <div className="pro-section-heading">
            <h2>A little progress, over time</h2>
            <span className="pro-muted">Minutes</span>
          </div>
          <div
            className="pro-chart"
            role="img"
            aria-label={`${total} focus minutes from ${from} to ${today}. ${buckets.map((b) => `${b.date}: ${b.minutes} minutes`).join("; ")}`}
          >
            {buckets.map((b) => (
              <div key={b.date} title={`${b.date}: ${b.minutes} min`}>
                <div className="pro-chart-track">
                  <span
                    style={{
                      height: `${(b.minutes / max) * 100}%`,
                      minHeight: b.minutes ? 3 : 0,
                    }}
                  />
                </div>
                <small>{b.date.slice(8)}</small>
              </div>
            ))}
          </div>
          <p className="pro-fineprint">
            {from} — {today} ·{" "}
            {Number(range) > 14 ? "Grouped into 14 periods" : "Daily totals"} ·
            Your device timezone
          </p>
        </section>
      )}
      <section className="pro-panel">
        <h2>Where your attention went</h2>
        {breakdown.map((p) => (
          <div key={p.id} className="pro-breakdown">
            <span>
              <i className={`pro-dot ${p.color}`} />
              {p.name}
            </span>
            <strong>{p.minutes} min</strong>
            <div className="pro-progress">
              <span
                style={{ width: `${(p.minutes / Math.max(total, 1)) * 100}%` }}
              />
            </div>
          </div>
        ))}
        {unassigned > 0 && (
          <div className="pro-breakdown">
            <span>Open focus / free tasks</span>
            <strong>{unassigned} min</strong>
          </div>
        )}
        {!total && (
          <p className="pro-muted">
            Use “Focus” on a planned task to attribute time to its project.
          </p>
        )}
      </section>
      <section className="pro-review">
        <ArrowUpRight size={18} />
        <div>
          <h2>Your quiet review</h2>
          <p>
            {total
              ? `You made room for ${sessions.length} focus sessions across ${days} days.${breakdown[0] ? ` ${breakdown[0].name} received the most attention.` : ""}`
              : "A small, repeatable routine is a good place to start."}
          </p>
          {source === "mine" && (
            <p>
              Planned: {planned} min · Completed: {total} min. Estimates use
              your current {state.settings.focus}-minute focus length.
            </p>
          )}
          <p>
            {days >= 5
              ? "You showed up regularly. Keep room for rest, too."
              : "Try choosing one important task before your next session."}
          </p>
        </div>
      </section>
    </>
  );
}
