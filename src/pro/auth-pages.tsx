import { useState, type FormEvent } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Layers3,
  ChartNoAxesCombined,
  Cloud,
  AudioLines,
  CalendarDays,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "./ui";
import { proApi, errorMessage, rememberBilling } from "./api";
import type { Billing, Profile } from "./models";
import { Attribution } from "../components/attribution";
const benefits = [
  {
    icon: Layers3,
    title: "A place for every project",
    text: "Organize tasks, add tags, and see where your attention goes.",
  },
  {
    icon: CalendarDays,
    title: "A day with a little direction",
    text: "Plan in tomatoes, repeat daily tasks, and save your favorite routines.",
  },
  {
    icon: ChartNoAxesCombined,
    title: "See your steady progress",
    text: "Explore focus trends, project time, and a thoughtful weekly review.",
  },
  {
    icon: AudioLines,
    title: "Make this space your own",
    text: "Blend rain with melodies. Save mixes and choose a quieter accent.",
  },
  {
    icon: Cloud,
    title: "Your focus, wherever you are",
    text: "Cloud backup and device sync are planned for the connected release.",
  },
];
export function Pricing({
  billing,
  setBilling,
  profile,
}: {
  billing: Billing;
  setBilling: (v: Billing) => void;
  profile: Profile | null;
}) {
  return (
    <>
      <p className="pro-eyebrow">
        <Sparkles size={13} /> POMODORO PRO
      </p>
      <h1 className="pro-hero-title">
        A little more space.
        <br />
        <span>For your best work.</span>
      </h1>
      <p className="pro-lead">
        Your familiar tomato. A thoughtful workspace for everything around it.
      </p>
      <div
        className="pro-billing-toggle"
        role="group"
        aria-label="Billing interval"
      >
        {(["monthly", "annual"] as const).map((v) => (
          <Button
            key={v}
            variant={billing === v ? "default" : "ghost"}
            aria-pressed={billing === v}
            onClick={() => {
              setBilling(v);
              rememberBilling(v);
            }}
          >
            {v === "monthly" ? "Monthly" : "Yearly"}
            {v === "annual" && <span>Save 33%</span>}
          </Button>
        ))}
      </div>
      <section className="pro-price-card">
        <div className="pro-price-top">
          <span className="pro-pill">ONE SIMPLE PLAN</span>
          <span className="pro-muted">Cancel anytime</span>
        </div>
        <p className="pro-price">
          {billing === "annual" ? "₹1,199" : "₹149"}
          <span> / {billing === "annual" ? "year" : "month"}</span>
        </p>
        <p className="pro-muted">
          {billing === "annual"
            ? "About ₹100/month, billed yearly."
            : "Billed monthly. A little room to try it."}
        </p>
        <ul className="pro-checklist">
          {[
            "Projects & daily planning",
            "Saved focus routines",
            "Detailed focus insights",
            "Sound mixes & accent themes",
            "Cloud sync in the connected release",
          ].map((t) => (
            <li key={t}>
              <Check size={15} />
              {t}
            </li>
          ))}
        </ul>
        <Button className="pro-wide" asChild>
          <a
            href={
              profile?.activated
                ? "#/pro/workspace"
                : profile
                  ? "#/pro/activate"
                  : "#/login"
            }
          >
            {profile?.activated
              ? "Open Pro workspace"
              : profile
                ? "Continue to Pro"
                : "Login & continue"}
            <ArrowRight size={15} />
          </a>
        </Button>
        <p className="pro-fineprint">
          Preview pricing · No payment is collected in this version.
        </p>
      </section>
      <div className="pro-benefits">
        {benefits.map(({ icon: Icon, title, text }, i) => (
          <motion.article
            key={title}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Icon size={18} />
            <div>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          </motion.article>
        ))}
      </div>
      <div className="pro-note">
        <strong>Your free space stays free.</strong>
        <p>
          The tomato timer, existing sounds, tasks, notes, and CSV export remain
          available without an account.
        </p>
      </div>
      <Attribution />
    </>
  );
}
export function AuthPage({
  mode,
  billing,
  onProfile,
}: {
  mode: "login" | "register" | "forgot";
  billing: Billing;
  onProfile: (p: Profile) => void;
}) {
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sent, setSent] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "forgot") {
        setSent(true);
        return;
      }
      const profile = await proApi.authenticate(
        mode === "register" ? { name, email, password } : { email, password },
        mode,
        billing,
      );
      setPassword("");
      onProfile(profile);
      location.hash = "#/pro/activate";
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function demo() {
    setBusy(true);
    setError("");
    try {
      const p = await proApi.authenticate(
        {
          email: "demo@pomodoro.example",
          password: "a little focus for today",
        },
        "login",
        billing,
      );
      setPassword("");
      onProfile(p);
      location.hash = "#/pro/activate";
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="pro-auth">
      <a
        href={mode === "login" ? "#/pro" : "#/login"}
        className="back-to-focus"
      >
        <ArrowLeft size={14} />
        {mode === "login" ? "Back to Pro" : "Back to login"}
      </a>
      <p className="pro-eyebrow">YOUR FOCUS SPACE</p>
      <h1 className="pro-hero-title">
        {mode === "register"
          ? "Make yourself at home."
          : mode === "forgot"
            ? "A fresh start."
            : "Welcome back."}
      </h1>
      <p className="pro-lead">
        {mode === "register"
          ? "Create your account to continue to Pro."
          : mode === "forgot"
            ? "Enter your email to preview the recovery flow."
            : "Login to continue with your chosen Pro plan."}
      </p>
      <div className="pro-note compact">
        <strong>Account preview</strong>
        <p>
          No real account is created. Use demo details; passwords are never
          saved or sent. Your workspace stays in this browser.
        </p>
      </div>
      {sent ? (
        <div className="pro-empty" role="status">
          <strong>Recovery preview complete</strong>
          <p>
            A connected app would send recovery instructions if an account
            exists. No email was sent.
          </p>
          <Button variant="outline" asChild>
            <a href="#/login">Return to login</a>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="pro-form">
          <fieldset disabled={busy}>
            {mode === "register" && (
              <Field label="Your name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label="Email address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={254}
                autoComplete="email"
                required
                placeholder="you@example.com"
              />
            </Field>
            {mode !== "forgot" && (
              <Field
                label="Password"
                htmlFor="pro-password-input"
                hint="Preview: use any 15–128 character demo password."
              >
                <div className="pro-password">
                  <Input
                    id="pro-password-input"
                    type={visible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={15}
                    maxLength={128}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={visible ? "Hide password" : "Show password"}
                    onClick={() => setVisible(!visible)}
                  >
                    {visible ? <EyeOff size={15} /> : <Eye size={15} />}
                  </Button>
                </div>
              </Field>
            )}
            {error && (
              <p className="pro-error" role="alert">
                {error}
              </p>
            )}
            <Button className="pro-wide" type="submit">
              {busy
                ? "Please wait…"
                : mode === "register"
                  ? "Create account & continue"
                  : mode === "forgot"
                    ? "Preview recovery"
                    : "Login & continue"}
              <ArrowRight size={15} />
            </Button>
          </fieldset>
        </form>
      )}
      {mode !== "forgot" && (
        <>
          <Button
            variant="outline"
            className="pro-wide"
            disabled={busy}
            onClick={demo}
          >
            Explore with demo account
          </Button>
          <p className="pro-auth-links">
            {mode === "login" ? (
              <>
                New here? <a href="#/signup">Create account</a>
                <a href="#/forgot">Forgot password?</a>
              </>
            ) : (
              <>
                Already have an account? <a href="#/login">Login</a>
              </>
            )}
          </p>
          <p className="pro-fineprint">
            Selected: Pro {billing} ·{" "}
            {billing === "annual" ? "₹1,199/year" : "₹149/month"}
            <br />
            No charges during this preview.
          </p>
        </>
      )}
    </div>
  );
}
export function Activation({
  profile,
  billing,
  onProfile,
}: {
  profile: Profile;
  billing: Billing;
  onProfile: (p: Profile) => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <>
      <p className="pro-eyebrow">YOU’RE ALMOST THERE</p>
      <h1 className="pro-hero-title">
        Meet your
        <br />
        <span>focus workspace.</span>
      </h1>
      <p className="pro-lead">
        Projects, plans, and a rhythm that feels like you.
      </p>
      <section className="pro-price-card">
        <p className="pro-muted">{profile.email}</p>
        <h2>Pro · {billing === "annual" ? "Yearly" : "Monthly"}</h2>
        <p className="pro-price">
          {billing === "annual" ? "₹1,199" : "₹149"}
          <span> / {billing === "annual" ? "year" : "month"}</span>
        </p>
        <div className="pro-note compact">
          <strong>Try the complete frontend preview</strong>
          <p>
            Sample data is included. No card, real subscription, or cloud sync.
            Purchases will become available after backend integration.
          </p>
        </div>
        {error && (
          <p role="alert" className="pro-error">
            {error}
          </p>
        )}
        <Button
          className="pro-wide"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const p = await proApi.activate({ ...profile, billing });
              onProfile(p);
              location.hash = "#/pro/workspace";
            } catch (e) {
              setError(errorMessage(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Opening…" : "Open Pro preview"}
          <ArrowRight size={15} />
        </Button>
        <a href="#/pro" className="pro-small-link">
          Change plan
        </a>
      </section>
    </>
  );
}
