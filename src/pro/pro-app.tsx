import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Pricing, AuthPage, Activation } from "./auth-pages";
import { Overview, Projects, Planner, Routines } from "./workspace-panels";
import { EditorDialog, type Editor } from "./editors";
import { Studio } from "./studio";
import { Insights } from "./insights";
import { Account } from "./account";
import { Attribution } from "../components/attribution";
import {
  errorMessage,
  proApi,
  readProfile,
  selectedBilling,
  PRO_STORAGE,
  type WorkspaceCommand,
} from "./api";
import { downloadJson } from "./ui";
import {
  localDate,
  type Billing,
  type Workspace,
  type Routine,
  type ProTask,
  type Mix,
} from "./models";
import type { State } from "../lib/model";
const tabs = [
  ["workspace", "Overview"],
  ["projects", "Projects"],
  ["planner", "Planner"],
  ["routines", "Routines"],
  ["insights", "Insights"],
  ["studio", "Studio"],
  ["account", "Account"],
];
export default function ProApp({
  path,
  state,
  timerLabel,
  onRoutine,
  onTask,
  onMix,
  canPreview,
}: {
  path: string;
  state: State;
  timerLabel: string | null;
  onRoutine: (r: Routine) => void;
  onTask: (t: ProTask) => void;
  onMix: (m: Mix) => void;
  canPreview: boolean;
}) {
  const [profile, setProfile] = useState(readProfile),
    [billing, setBilling] = useState<Billing>(selectedBilling),
    [workspace, setWorkspace] = useState<Workspace | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [editor, setEditor] = useState<Editor | null>(null),
    [deletion, setDeletion] = useState<{
      kind: "delete-task" | "delete-routine" | "delete-mix";
      id: string;
    } | null>(null),
    [deleting, setDeleting] = useState(false);
  const heading = useRef<HTMLDivElement>(null),
    today = localDate();
  const section = path.split("/")[2] ?? "workspace";
  const isPublic = [
    "/pro",
    "/login",
    "/signup",
    "/forgot",
    "/pro/activate",
  ].includes(path);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    window.scrollTo?.(0, 0);
    setEditor(null);
    setDeletion(null);
    setError("");
  }, [path]);
  useEffect(() => {
    let live = true;
    if (isPublic || !profile?.activated) return;
    setLoading(true);
    proApi
      .loadWorkspace()
      .then((w) => {
        if (live) setWorkspace(w);
      })
      .catch((e) => {
        if (live) setError(errorMessage(e));
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [isPublic, profile?.activated, today]);
  useEffect(() => {
    if (workspace)
      document.documentElement.dataset.accent = workspace.preferences.accent;
  }, [workspace?.preferences.accent]);
  async function mutate(c: WorkspaceCommand) {
    try {
      const w = await proApi.mutate(c);
      setWorkspace(w);
      setError("");
    } catch (e) {
      setError(errorMessage(e));
      throw e;
    }
  }
  const logout = async () => {
    try {
      await proApi.signOut();
      setProfile(null);
      setWorkspace(null);
      delete document.documentElement.dataset.accent;
      location.hash = "#/";
    } catch (e) {
      setError(errorMessage(e));
    }
  };
  let content;
  if (path === "/pro")
    content = (
      <Pricing billing={billing} setBilling={setBilling} profile={profile} />
    );
  else if (["/login", "/signup", "/forgot"].includes(path))
    content = (
      <AuthPage
        key={path}
        mode={
          path === "/signup"
            ? "register"
            : path === "/forgot"
              ? "forgot"
              : "login"
        }
        billing={billing}
        onProfile={setProfile}
      />
    );
  else if (path === "/pro/activate" && profile)
    content = (
      <Activation profile={profile} billing={billing} onProfile={setProfile} />
    );
  else if (!profile?.activated)
    content = (
      <div className="pro-empty">
        <Sparkles size={25} />
        <h1>Your Pro space is waiting.</h1>
        <p>
          Explore the plan, then log in to continue. Your free timer is always
          available.
        </p>
        <Button asChild>
          <a href="#/pro">
            Explore Pro
            <ArrowRight size={14} />
          </a>
        </Button>
      </div>
    );
  else if (!workspace)
    content = loading ? (
      <p role="status" className="pro-empty">
        Opening your workspace…
      </p>
    ) : (
      <div className="pro-empty">
        <h1>We couldn’t open the preview.</h1>
        <p>{error}</p>
        <div className="pro-action-row">
          <Button
            onClick={() => {
              setLoading(true);
              proApi
                .loadWorkspace()
                .then(setWorkspace)
                .catch((e) => setError(errorMessage(e)))
                .finally(() => setLoading(false));
            }}
          >
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              try {
                downloadJson(
                  "pomodoro-preview-recovery.json",
                  localStorage.getItem(PRO_STORAGE),
                );
              } catch (e) {
                setError(errorMessage(e));
              }
            }}
          >
            Export stored data
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (
                window.confirm(
                  "Replace the Pro preview data with samples? Your free timer stays unchanged.",
                )
              ) {
                localStorage.removeItem(PRO_STORAGE);
                void proApi
                  .loadWorkspace()
                  .then(setWorkspace)
                  .catch((e) => setError(errorMessage(e)));
              }
            }}
          >
            Reset preview data
          </Button>
        </div>
      </div>
    );
  else
    content = (
      <>
        <div className="pro-workspace-heading">
          <a href="#/pro/workspace">
            <Sparkles size={15} /> Pomodoro{" "}
            <span className="pro-pill">PRO</span>
          </a>
          <span className="pro-muted">Local preview</span>
        </div>
        <nav className="pro-nav" aria-label="Pro workspace">
          {tabs.map(([key, label]) => (
            <a
              key={key}
              href={`#/pro/${key}`}
              aria-current={section === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
        {error && (
          <p role="alert" className="pro-error">
            {error}
          </p>
        )}
        <motion.div
          key={section}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          {section === "workspace" ? (
            <Overview workspace={workspace} state={state} name={profile.name} />
          ) : section === "projects" ? (
            <Projects
              workspace={workspace}
              state={state}
              edit={setEditor}
              mutate={mutate}
            />
          ) : section === "planner" ? (
            <Planner
              workspace={workspace}
              state={state}
              edit={setEditor}
              mutate={mutate}
              onFocus={onTask}
              onDelete={(id) => setDeletion({ kind: "delete-task", id })}
            />
          ) : section === "routines" ? (
            <Routines
              workspace={workspace}
              state={state}
              edit={setEditor}
              onApply={onRoutine}
              onDelete={(id) => setDeletion({ kind: "delete-routine", id })}
            />
          ) : section === "insights" ? (
            <Insights workspace={workspace} state={state} />
          ) : section === "studio" ? (
            <Studio
              workspace={workspace}
              mutate={mutate}
              onDelete={(id) => setDeletion({ kind: "delete-mix", id })}
              canPreview={canPreview}
              onUse={onMix}
            />
          ) : section === "account" ? (
            <Account
              profile={profile}
              workspace={workspace}
              onProfile={setProfile}
              onLogout={() => void logout()}
              mutate={mutate}
              onReset={async () => setWorkspace(await proApi.loadWorkspace())}
            />
          ) : (
            <div className="pro-empty">
              <h1>Page not found</h1>
              <a href="#/pro/workspace">Back to your workspace</a>
            </div>
          )}
        </motion.div>
        <Attribution />
        {editor && (
          <EditorDialog
            editor={editor}
            workspace={workspace}
            onSave={mutate}
            onClose={() => setEditor(null)}
          />
        )}
        <Dialog
          open={deletion !== null}
          onOpenChange={(v) => {
            if (!v && !deleting) setDeletion(null);
          }}
        >
          <DialogContent className="pro-dialog">
            <DialogTitle>
              Remove this {deletion?.kind.replace("delete-", "")}?
            </DialogTitle>
            <DialogDescription>
              This removes it from the Pro preview. For a recurring task
              template, generated copies will also be removed. Completed focus
              history stays intact.
            </DialogDescription>
            <div className="pro-dialog-actions">
              <Button
                variant="outline"
                disabled={deleting}
                onClick={() => setDeletion(null)}
              >
                Keep it
              </Button>
              <Button
                disabled={deleting}
                onClick={async () => {
                  if (!deletion) return;
                  setDeleting(true);
                  try {
                    await mutate(deletion);
                    setDeletion(null);
                  } catch {
                    /* Error shown above. */
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  return (
    <main className="focus-app pro-app">
      <a href="#/" className="back-to-focus">
        <ArrowLeft size={14} /> Back to your focus
        {timerLabel && <span className="live-timer-label">{timerLabel}</span>}
      </a>
      <div ref={heading} tabIndex={-1} className="pro-page-content">
        {content}
      </div>
    </main>
  );
}
