import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Field, Choice } from "./ui";
import {
  accents,
  localDate,
  type Project,
  type ProTask,
  type Routine,
  type Workspace,
} from "./models";
import { errorMessage, type WorkspaceCommand } from "./api";
import { soundscapes } from "../lib/soundscapes";
export type Editor =
  | { kind: "project"; value?: Project }
  | { kind: "task"; value?: ProTask; date?: string }
  | { kind: "routine"; value?: Routine };
export function EditorDialog({
  editor,
  workspace,
  onSave,
  onClose,
}: {
  editor: Editor;
  workspace: Workspace;
  onSave: (command: WorkspaceCommand) => Promise<void>;
  onClose: () => void;
}) {
  const v = editor.value;
  const [name, setName] = useState(v ? ("name" in v ? v.name : v.title) : ""),
    [description, setDescription] = useState(
      editor.kind === "project" ? (editor.value?.description ?? "") : "",
    ),
    [color, setColor] = useState(
      editor.kind === "project" ? (editor.value?.color ?? "tomato") : "tomato",
    ),
    [goal, setGoal] = useState(
      editor.kind === "project"
        ? (editor.value?.weeklyGoalMinutes ?? 300)
        : 300,
    );
  const [projectId, setProjectId] = useState(
      editor.kind === "task" ? (editor.value?.projectId ?? "none") : "none",
    ),
    [estimate, setEstimate] = useState(
      editor.kind === "task" ? (editor.value?.estimate ?? 1) : 1,
    ),
    [date, setDate] = useState(
      editor.kind === "task"
        ? (editor.value?.plannedDate ?? editor.date ?? localDate())
        : localDate(),
    ),
    [tags, setTags] = useState(
      editor.kind === "task" ? (editor.value?.tags.join(", ") ?? "") : "",
    ),
    [recurrence, setRecurrence] = useState(
      editor.kind === "task" ? (editor.value?.recurrence ?? "none") : "none",
    );
  const [focus, setFocus] = useState(
      editor.kind === "routine" ? (editor.value?.focus ?? 25) : 25,
    ),
    [short, setShort] = useState(
      editor.kind === "routine" ? (editor.value?.short ?? 5) : 5,
    ),
    [long, setLong] = useState(
      editor.kind === "routine" ? (editor.value?.long ?? 15) : 15,
    ),
    [interval, setInterval] = useState(
      editor.kind === "routine" ? (editor.value?.interval ?? 4) : 4,
    ),
    [ambient, setAmbient] = useState(
      editor.kind === "routine" ? (editor.value?.ambient ?? "off") : "off",
    ),
    [titles, setTitles] = useState(
      editor.kind === "routine"
        ? (editor.value?.taskTitles.join("\n") ?? "")
        : "",
    );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const id = v?.id ?? crypto.randomUUID();
      if (editor.kind === "project")
        await onSave({
          kind: "project",
          value: {
            id,
            name,
            description,
            color,
            weeklyGoalMinutes: goal,
            archived: editor.value?.archived ?? false,
          },
        });
      else if (editor.kind === "task")
        await onSave({
          kind: "task",
          value: {
            id,
            title: name,
            projectId: projectId === "none" ? null : projectId,
            estimate,
            plannedDate: date,
            tags: [
              ...new Set(
                tags
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean),
              ),
            ],
            recurrence,
            done: editor.value?.done ?? false,
            templateId: editor.value?.templateId ?? null,
          },
        });
      else
        await onSave({
          kind: "routine",
          value: {
            id,
            name,
            focus,
            short,
            long,
            interval,
            ambient,
            taskTitles: titles
              .split("\n")
              .map((t) => t.trim())
              .filter(Boolean),
          },
        });
      onClose();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="pro-dialog">
        <DialogTitle>
          {v ? "Edit" : "New"}{" "}
          {editor.kind === "routine" ? "focus routine" : editor.kind}
        </DialogTitle>
        <DialogDescription>
          {editor.kind === "project"
            ? "Give your work a little direction."
            : editor.kind === "task"
              ? "One clear next step. Estimate it in tomatoes."
              : "Save a rhythm you can come back to."}
        </DialogDescription>
        <form onSubmit={save} className="pro-form">
          <fieldset disabled={busy}>
            <Field label={editor.kind === "task" ? "Task title" : "Name"}>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={editor.kind === "task" ? 160 : 80}
                required
              />
            </Field>
            {editor.kind === "project" && (
              <>
                <Field label="Description">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                  />
                </Field>
                <div className="pro-form-grid">
                  <Field label="Project color">
                    <Choice
                      label="Project color"
                      value={color}
                      onChange={(v) => setColor(v as typeof color)}
                      options={Object.entries(accents).map(
                        ([value, label]) => ({ value, label }),
                      )}
                    />
                  </Field>
                  <Field label="Weekly goal (minutes)">
                    <Input
                      type="number"
                      min={30}
                      max={6000}
                      value={goal}
                      onChange={(e) => setGoal(e.target.valueAsNumber)}
                      required
                    />
                  </Field>
                </div>
              </>
            )}
            {editor.kind === "task" && (
              <>
                <Field label="Project">
                  <Choice
                    label="Project"
                    value={projectId}
                    onChange={setProjectId}
                    options={[
                      { value: "none", label: "No project" },
                      ...workspace.projects
                        .filter((p) => !p.archived)
                        .map((p) => ({ value: p.id, label: p.name })),
                    ]}
                  />
                </Field>
                <div className="pro-form-grid">
                  <Field label="Planned date">
                    <Input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Tomatoes">
                    <Input
                      type="number"
                      min={1}
                      max={12}
                      value={estimate}
                      onChange={(e) => setEstimate(e.target.valueAsNumber)}
                      required
                    />
                  </Field>
                </div>
                <Field label="Tags" hint="Comma separated · up to 5 tags">
                  <Input
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    maxLength={124}
                    placeholder="design, reading"
                  />
                </Field>
                <Field label="Repeat">
                  <Choice
                    label="Repeat"
                    value={recurrence}
                    onChange={(v) => setRecurrence(v as typeof recurrence)}
                    options={[
                      { value: "none", label: "Does not repeat" },
                      { value: "daily", label: "Every day" },
                      { value: "weekdays", label: "Weekdays" },
                    ]}
                  />
                </Field>
              </>
            )}
            {editor.kind === "routine" && (
              <>
                <div className="pro-form-grid">
                  {[
                    {
                      label: "Focus (minutes)",
                      value: focus,
                      set: setFocus,
                      min: 1,
                      max: 120,
                    },
                    {
                      label: "Short break",
                      value: short,
                      set: setShort,
                      min: 1,
                      max: 30,
                    },
                    {
                      label: "Long break",
                      value: long,
                      set: setLong,
                      min: 1,
                      max: 60,
                    },
                    {
                      label: "Long break every",
                      value: interval,
                      set: setInterval,
                      min: 2,
                      max: 8,
                    },
                  ].map((f) => (
                    <Field key={f.label} label={f.label}>
                      <Input
                        type="number"
                        required
                        min={f.min}
                        max={f.max}
                        value={f.value}
                        onChange={(e) => f.set(e.target.valueAsNumber)}
                      />
                    </Field>
                  ))}
                </div>
                <Field label="Background sound">
                  <Choice
                    label="Background sound"
                    value={ambient}
                    onChange={(v) => setAmbient(v as typeof ambient)}
                    options={soundscapes.map((s) => ({
                      value: s.value,
                      label: s.label,
                    }))}
                  />
                </Field>
                <Field
                  label="Task template"
                  hint="Optional · one task per line, up to 12"
                >
                  <textarea
                    value={titles}
                    onChange={(e) => setTitles(e.target.value)}
                    maxLength={1932}
                    placeholder="Read one chapter&#10;Write down one idea"
                  />
                </Field>
              </>
            )}
            {error && (
              <p role="alert" className="pro-error">
                {error}
              </p>
            )}
            <div className="pro-dialog-actions">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {busy ? "Saving…" : `Save ${editor.kind}`}
              </Button>
            </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
