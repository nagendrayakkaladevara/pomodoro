import { useState } from "react";
import { CloudOff, Download, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { downloadJson, Field } from "./ui";
import {
  errorMessage,
  PRO_STORAGE,
  storeProfile,
  type WorkspaceCommand,
} from "./api";
import type { Profile, Workspace } from "./models";
export function Account({
  profile,
  workspace,
  onProfile,
  onLogout,
  mutate,
  onReset,
}: {
  profile: Profile;
  workspace: Workspace;
  onProfile: (p: Profile) => void;
  onLogout: () => void;
  mutate: (c: WorkspaceCommand) => Promise<void>;
  onReset: () => Promise<void>;
}) {
  const [goal, setGoal] = useState(workspace.preferences.weeklyGoalMinutes),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [confirm, setConfirm] = useState<"reset" | "cancel" | null>(null),
    [busy, setBusy] = useState(false);
  return (
    <>
      <div className="pro-section-heading">
        <div>
          <p className="pro-eyebrow">A SPACE THAT’S YOURS</p>
          <h1>Account & plan</h1>
        </div>
        <ShieldCheck size={21} />
      </div>
      <section className="pro-panel">
        <div className="pro-account-profile">
          <div className="pro-avatar">{profile.name[0].toUpperCase()}</div>
          <div>
            <h2>{profile.name}</h2>
            <p className="pro-muted">{profile.email}</p>
          </div>
        </div>
        <span className="pro-pill">DEMO ACCOUNT</span>
        <p className="pro-muted">
          No real account or password has been saved on a server.
        </p>
        <Button variant="outline" size="sm" onClick={onLogout}>
          <LogOut size={14} /> Log out of preview
        </Button>
      </section>
      <section className="pro-panel">
        <div className="pro-section-heading">
          <h2>Pro · {profile.billing === "annual" ? "Yearly" : "Monthly"}</h2>
          <span className="pro-pill">PREVIEW</span>
        </div>
        <p className="pro-account-price">
          {profile.billing === "annual" ? "₹1,199 / year" : "₹149 / month"}
        </p>
        <p className="pro-muted">
          No payment method, charge, or renewal is active.{" "}
          {profile.cancelled
            ? "Cancellation preview selected. You can keep exploring."
            : "This is a local preview of the subscription experience."}
        </p>
        <div className="pro-action-row">
          <Button variant="outline" size="sm" asChild>
            <a href="#/pro">Compare billing options</a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirm("cancel")}
          >
            {profile.cancelled
              ? "Reset cancellation preview"
              : "Preview cancellation"}
          </Button>
        </div>
      </section>
      <section className="pro-panel">
        <h2>Your weekly intention</h2>
        <form
          className="pro-form"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            setMessage("");
            try {
              await mutate({
                kind: "preferences",
                value: { ...workspace.preferences, weeklyGoalMinutes: goal },
              });
              setMessage("Weekly goal saved.");
            } catch (e) {
              setError(errorMessage(e));
            }
          }}
        >
          <Field label="Weekly focus goal (minutes)">
            <Input
              type="number"
              min={30}
              max={6000}
              required
              value={goal}
              onChange={(e) => setGoal(e.target.valueAsNumber)}
            />
          </Field>
          <Button size="sm">Save goal</Button>
        </form>
      </section>
      <section className="pro-panel">
        <h2>
          <CloudOff size={16} /> Stored on this device
        </h2>
        <p className="pro-muted">
          Your preview projects, plans, and routines are saved locally. Cloud
          sync is not connected. Clearing browser storage removes them.
        </p>
        <div className="pro-action-row">
          <Button
            variant="outline"
            size="sm"
            onClick={() => downloadJson("pomodoro-pro-preview.json", workspace)}
          >
            <Download size={14} /> Export preview data
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirm("reset")}>
            Reset sample workspace
          </Button>
        </div>
        <p className="pro-fineprint">
          Resetting Pro does not delete the free timer’s tasks, notes, or
          history.
        </p>
      </section>
      {error && (
        <p role="alert" className="pro-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="pro-success">
          {message}
        </p>
      )}
      <Dialog
        open={confirm !== null}
        onOpenChange={(v) => {
          if (!v && !busy) setConfirm(null);
        }}
      >
        <DialogContent className="pro-dialog">
          <DialogTitle>
            {confirm === "reset"
              ? "Reset this preview workspace?"
              : "Preview a subscription change?"}
          </DialogTitle>
          <DialogDescription>
            {confirm === "reset"
              ? "This replaces your Pro projects, tasks, routines, mixes, and preferences with sample data. Export first if you want to keep your changes. Your free timer stays unchanged."
              : "This only changes the local preview label. No real subscription or payment is affected."}
          </DialogDescription>
          <div className="pro-dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setConfirm(null)}
            >
              Keep as is
            </Button>
            <Button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  if (confirm === "reset") {
                    localStorage.removeItem(PRO_STORAGE);
                    await onReset();
                    setGoal(600);
                  } else {
                    const p = { ...profile, cancelled: !profile.cancelled };
                    storeProfile(p);
                    onProfile(p);
                  }
                  setConfirm(null);
                } catch (e) {
                  setError(errorMessage(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {confirm === "reset" ? "Reset workspace" : "Confirm preview"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
