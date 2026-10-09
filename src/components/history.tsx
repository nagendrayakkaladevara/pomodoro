import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowUpRight, Download, Sprout } from "lucide-react";
import { dayKey, type State } from "../lib/model";

export function HistoryDialog({
  sessions,
  now,
}: {
  sessions: State["sessions"];
  now: number;
}) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - 6 + i);
    return {
      date,
      minutes: Math.round(
        sessions
          .filter((s) => dayKey(s.completedAt) === dayKey(date.getTime()))
          .reduce((sum, s) => sum + s.duration, 0) / 60000,
      ),
    };
  });
  const max = Math.max(25, ...days.map((d) => d.minutes));
  function exportCsv() {
    const escape = (text: string) =>
      `"${text.replace(/^[=+@\-\t\r]/, "'$&").replace(/"/g, '""')}"`;
    const csv = [
      "Completed at,Focus minutes,Task",
      ...sessions.map(
        (s) =>
          `${escape(new Date(s.completedAt).toISOString())},${s.duration / 60000},${escape(s.task)}`,
      ),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "pomodoro-sessions.csv";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="quiet-link">
          History <ArrowUpRight size={13} />
        </Button>
      </DialogTrigger>
      <DialogContent className="history-dialog">
        <DialogHeader>
          <DialogTitle>Little by little.</DialogTitle>
          <DialogDescription>
            Every focused minute adds up. Here are your last seven days.
          </DialogDescription>
        </DialogHeader>
        <div className="week-chart" aria-label="Focus minutes by day">
          {days.map(({ date, minutes }) => (
            <div className="day-column" key={dayKey(date.getTime())}>
              <span>{minutes}</span>
              <div className="bar-track">
                <div
                  className={
                    dayKey(date.getTime()) === dayKey(now) ? "bar today" : "bar"
                  }
                  style={{
                    height: `${Math.max(minutes ? 3 : 0, (minutes / max) * 100)}%`,
                  }}
                />
              </div>
              <span>
                {date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            </div>
          ))}
        </div>
        <div className="history-heading">
          <p className="section-label">RECENT SESSIONS</p>
          <Button
            variant="ghost"
            size="sm"
            disabled={!sessions.length}
            onClick={exportCsv}
          >
            <Download size={14} />
            Export
          </Button>
        </div>
        {sessions.length ? (
          <ul className="history-list">
            {sessions
              .slice(-30)
              .reverse()
              .map((session) => (
                <li key={session.id}>
                  <span>
                    <strong>{session.task || "Open focus"}</strong>
                    <time
                      dateTime={new Date(session.completedAt).toISOString()}
                    >
                      {new Date(session.completedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </time>
                  </span>
                  <span>{Math.round(session.duration / 60000)} min</span>
                </li>
              ))}
          </ul>
        ) : (
          <div className="empty-history">
            <Sprout size={26} />
            <p>Your first tomato is waiting.</p>
            <span>Complete a focus session to plant it here.</span>
          </div>
        )}
        <p className="fine-print">
          History is saved on this browser. Export a copy whenever you like.
        </p>
      </DialogContent>
    </Dialog>
  );
}
