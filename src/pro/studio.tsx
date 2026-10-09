import { useEffect, useRef, useState } from "react";
import { AudioLines, Play, Square, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FocusAudio } from "../lib/audio";
import { soundscapes } from "../lib/soundscapes";
import { Choice, Field } from "./ui";
import { accents, type Mix, type Workspace } from "./models";
import { errorMessage, type WorkspaceCommand } from "./api";
export function Studio({
  workspace,
  mutate,
  onDelete,
  onUse,
  canPreview,
}: {
  workspace: Workspace;
  mutate: (c: WorkspaceCommand) => Promise<void>;
  onDelete: (id: string) => void;
  onUse: (mix: Mix) => void;
  canPreview: boolean;
}) {
  const [name, setName] = useState("My quiet mix"),
    [layers, setLayers] = useState<Mix["layers"]>([
      { sound: "rain", volume: 0.3 },
      { sound: "piano", volume: 0.2 },
    ]),
    [playing, setPlaying] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(""),
    [busy, setBusy] = useState(false);
  const players = useRef<FocusAudio[]>([]),
    timeout = useRef<ReturnType<typeof setTimeout> | null>(null),
    generation = useRef(0);
  function stop() {
    generation.current++;
    players.current.forEach((p) => p.dispose());
    players.current = [];
    if (timeout.current) clearTimeout(timeout.current);
    setPlaying(false);
  }
  useEffect(
    () => () => {
      generation.current++;
      players.current.forEach((p) => p.dispose());
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  useEffect(() => {
    if (!canPreview) stop();
  }, [canPreview]);
  async function preview() {
    if (playing) {
      stop();
      return;
    }
    if (!canPreview) return;
    stop();
    const token = generation.current;
    setError("");
    try {
      const active = layers.filter((l) => l.volume > 0);
      if (!active.length) throw new Error("Turn up at least one sound.");
      players.current = active.map(() => new FocusAudio());
      const unlocked = await Promise.all(
        players.current.map((p) => p.unlock()),
      );
      if (token !== generation.current) return;
      if (unlocked.some((v) => !v))
        throw new Error(
          "Audio is unavailable. Try again after checking your browser sound settings.",
        );
      players.current.forEach((p, i) =>
        p.ambient(active[i].sound, active[i].volume),
      );
      setPlaying(true);
      timeout.current = setTimeout(stop, 30000);
    } catch (e) {
      stop();
      setError(errorMessage(e));
    }
  }
  function update(index: number, patch: Partial<Mix["layers"][number]>) {
    stop();
    setSaved("");
    setLayers(layers.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  return (
    <>
      <div className="pro-section-heading">
        <div>
          <p className="pro-eyebrow">MAKE YOURSELF COMFORTABLE</p>
          <h1>Your quiet studio</h1>
        </div>
        <AudioLines size={22} />
      </div>
      <p className="pro-lead">
        A little rain. A soft melody. Just the right amount of both.
      </p>
      <section className="pro-panel">
        <h2>Build a sound mix</h2>
        <p className="pro-muted">
          Preview up to three layers for 30 seconds. Playback stops when you
          leave this page.
        </p>
        <Field label="Mix name">
          <Input
            value={name}
            maxLength={80}
            onChange={(e) => {
              setName(e.target.value);
              setSaved("");
            }}
          />
        </Field>
        <div className="pro-mix-layers">
          {layers.map((layer, i) => (
            <div key={i} className="pro-mix-layer">
              <Choice
                label={`Sound ${i + 1}`}
                value={layer.sound}
                onChange={(v) => update(i, { sound: v as typeof layer.sound })}
                options={soundscapes
                  .filter(
                    (s) =>
                      s.value !== "off" &&
                      !layers.some((l, j) => j !== i && l.sound === s.value),
                  )
                  .map((s) => ({ value: s.value, label: s.label }))}
              />
              <label>
                <span>Volume {Math.round(layer.volume * 100)}%</span>
                <input
                  aria-label={`Volume ${i + 1}`}
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={layer.volume}
                  onChange={(e) =>
                    update(i, { volume: Number(e.target.value) })
                  }
                />
              </label>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Remove sound ${i + 1}`}
                disabled={layers.length === 1}
                onClick={() => {
                  stop();
                  setLayers(layers.filter((_, j) => i !== j));
                }}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
        </div>
        <div className="pro-action-row">
          <Button
            variant="outline"
            size="sm"
            disabled={layers.length >= 3}
            onClick={() => {
              stop();
              const sound = soundscapes.find(
                (s) =>
                  s.value !== "off" && !layers.some((l) => l.sound === s.value),
              )!;
              setLayers([
                ...layers,
                {
                  sound: sound.value as Mix["layers"][number]["sound"],
                  volume: 0.15,
                },
              ]);
            }}
          >
            Add sound
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canPreview}
            onClick={preview}
          >
            {playing ? <Square size={14} /> : <Play size={14} />}{" "}
            {playing ? "Stop preview" : "Preview mix"}
          </Button>
          <Button
            size="sm"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await mutate({
                  kind: "mix",
                  value: { id: crypto.randomUUID(), name, layers },
                });
                setSaved("Mix saved.");
              } catch (e) {
                setError(errorMessage(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Save mix
          </Button>
        </div>
        {!canPreview && (
          <p className="pro-fineprint">
            Stop the timer or its sound preview before trying a mix.
          </p>
        )}
        {error && (
          <p role="alert" className="pro-error">
            {error}
          </p>
        )}
        {saved && (
          <p role="status" className="pro-success">
            {saved}
          </p>
        )}
      </section>
      <section className="pro-panel">
        <h2>Saved for another day</h2>
        {workspace.mixes.length ? (
          workspace.mixes.map((m) => (
            <div className="pro-saved-mix" key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <p>
                  {m.layers
                    .map(
                      (l) =>
                        soundscapes.find((s) => s.value === l.sound)?.label,
                    )
                    .join(" + ")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  stop();
                  setName(m.name);
                  setLayers(m.layers);
                  setSaved("Loaded. Choose Preview mix to listen.");
                }}
              >
                Load
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  stop();
                  onUse(m);
                }}
              >
                Use for focus
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label={`Delete ${m.name}`}
                onClick={() => onDelete(m.id)}
              >
                <Trash2 size={14} />
              </Button>
            </div>
          ))
        ) : (
          <p className="pro-muted">Your saved sound mixes will live here.</p>
        )}
      </section>
      <section className="pro-panel">
        <h2>A small change of color</h2>
        <p className="pro-muted">
          An accent for your workspace. Light and dark mode still follow your
          timer settings.
        </p>
        <div className="pro-swatches">
          {Object.entries(accents).map(([key, label]) => (
            <Button
              key={key}
              variant="outline"
              aria-pressed={workspace.preferences.accent === key}
              onClick={async () => {
                try {
                  await mutate({
                    kind: "preferences",
                    value: {
                      ...workspace.preferences,
                      accent: key as Workspace["preferences"]["accent"],
                    },
                  });
                } catch (e) {
                  setError(errorMessage(e));
                }
              }}
            >
              <i className={`pro-dot ${key}`} />
              {label}
              {workspace.preferences.accent === key && <Check size={13} />}
            </Button>
          ))}
        </div>
      </section>
    </>
  );
}
