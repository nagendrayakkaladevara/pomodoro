import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SlidersHorizontal, Volume2 } from "lucide-react";
import { useState } from "react";
import { focusAudio } from "../lib/audio";
import { settingsSchema, type Settings } from "../lib/model";

export function SettingsDialog({
  settings,
  onSave,
}: {
  settings: Settings;
  onSave: (value: Settings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [error, setError] = useState("");
  const numeric = (
    key: "focus" | "short" | "long" | "interval" | "goal",
    value: string,
  ) => setDraft({ ...draft, [key]: value === "" ? NaN : Number(value) });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) {
          setDraft(settings);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Timer settings"
          title="Timer settings"
        >
          <SlidersHorizontal />
        </Button>
      </DialogTrigger>
      <DialogContent className="settings-dialog">
        <DialogHeader>
          <DialogTitle>Make it your rhythm.</DialogTitle>
          <DialogDescription>
            A little structure, with room to breathe.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const parsed = settingsSchema.safeParse(draft);
            if (!parsed.success) {
              setError("Please use the indicated ranges for each setting.");
              return;
            }
            onSave(parsed.data);
            setOpen(false);
          }}
        >
          <p className="section-label">YOUR TIMER · MINUTES</p>
          <div className="duration-fields">
            {(
              [
                ["focus", "Focus", 120],
                ["short", "Short break", 30],
                ["long", "Long break", 60],
              ] as const
            ).map(([key, label, max]) => (
              <label key={key}>
                {label}
                <Input
                  required
                  type="number"
                  min={1}
                  max={max}
                  step={1}
                  value={Number.isNaN(draft[key]) ? "" : draft[key]}
                  onChange={(e) => numeric(key, e.target.value)}
                />
                <span>1–{max} min</span>
              </label>
            ))}
          </div>
          <div className="setting-row">
            <label htmlFor="interval">
              Long break after<span>Completed focus sessions</span>
            </label>
            <Input
              id="interval"
              required
              type="number"
              min={2}
              max={8}
              value={Number.isNaN(draft.interval) ? "" : draft.interval}
              onChange={(e) => numeric("interval", e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label htmlFor="goal">
              Daily goal<span>A small, achievable target</span>
            </label>
            <Input
              id="goal"
              required
              type="number"
              min={1}
              max={16}
              value={Number.isNaN(draft.goal) ? "" : draft.goal}
              onChange={(e) => numeric("goal", e.target.value)}
            />
          </div>
          <div className="setting-row">
            <label htmlFor="auto-break">
              Start breaks automatically
              <span>Focus sessions always start with you</span>
            </label>
            <Switch
              id="auto-break"
              checked={draft.autoBreak}
              onCheckedChange={(v) => setDraft({ ...draft, autoBreak: v })}
            />
          </div>
          <div className="setting-row">
            <label htmlFor="chime">
              Gentle completion chime<span>A soft cue when a session ends</span>
            </label>
            <Switch
              id="chime"
              checked={draft.sound}
              onCheckedChange={(v) => {
                void focusAudio.unlock();
                setDraft({ ...draft, sound: v });
              }}
            />
          </div>
          <div className="volume-row">
            <label htmlFor="volume">Sound volume</label>
            <input
              id="volume"
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={draft.volume}
              onChange={(e) =>
                setDraft({ ...draft, volume: Number(e.target.value) })
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Preview chime"
              onClick={async () => {
                await focusAudio.unlock();
                focusAudio.chime(draft.volume);
              }}
            >
              <Volume2 />
            </Button>
          </div>
          <p className="fine-print">
            Changes to duration apply to the next session. Sounds play while the
            app is open; a sleeping or locked phone may delay them.
          </p>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
          <Button className="save-settings" type="submit">
            Save preferences
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
