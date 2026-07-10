import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import "../tuneye.css";

type ScreenId =
  | "welcome"
  | "scan"
  | "weighing"
  | "weight-light"
  | "grading"
  | "receipt"
  | "history";

type Species = "Yellowfin" | "Skipjack";
type Grade = "A" | "B" | "C" | "Reject";

type Session = {
  species: Species;
  weight: number;
  price: number | null;
  grade: Grade | null;
  conf: number | null;
  time: string;
};

const STEPS: { id: ScreenId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "scan", label: "Scan" },
  { id: "weighing", label: "Weighing" },
  { id: "grading", label: "Grading" },
  { id: "receipt", label: "Result" },
  { id: "history", label: "History" },
];

const peso = (n: number) =>
  "₱" + n.toLocaleString("en-PH", { maximumFractionDigits: 0 });

function todayStr() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export const Route = createFileRoute("/")({
  component: TunEye,
});

function TunEye() {
  const [screen, setScreen] = useState<ScreenId>("welcome");
  const [species, setSpecies] = useState<Species | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [source, setSource] = useState<"ai" | "manual" | null>(null);
  const [price, setPrice] = useState<number>(280);
  const [date, setDate] = useState<string>(todayStr());
  const [weight, setWeight] = useState<number | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);

  const [clock, setClock] = useState("09:41");
  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
      );
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const [sessions, setSessions] = useState<Session[]>([
    { species: "Yellowfin", weight: 22.1, price: 280, grade: "A", conf: 90, time: "Jul 9, 08:14" },
    { species: "Skipjack", weight: 14.6, price: 150, grade: "B", conf: 81, time: "Jul 9, 07:40" },
    { species: "Yellowfin", weight: 7.8, price: null, grade: null, conf: null, time: "Jul 8, 16:02" },
  ]);

  function go(id: ScreenId) {
    setScreen(id);
  }

  return (
    <div className="tuneye-page">
      <div className="page-head">
        <h1 className="display">TunEye — Tablet UI Flow</h1>
        <p>Automated tuna species classification &amp; quality grading</p>
        <div className="breadcrumb">
          <b>{STEPS.find((s) => s.id === screen)?.label ?? screen}</b>
        </div>
      </div>

      <div className="pillbar">
        {STEPS.map((s) => (
          <button
            key={s.id}
            className={`pill ${screen === s.id ? "active" : ""}`}
            onClick={() => go(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="device-wrap">
        <div className="device">
          <div className="statusbar">
            <div className="brand">
              <span className="brand-mark" />
              TunEye
            </div>
            <div className="time mono">{clock}</div>
          </div>

          {screen === "welcome" && <Welcome go={go} />}
          {screen === "scan" && (
            <Scan
              go={go}
              price={price}
              setPrice={setPrice}
              date={date}
              setDate={setDate}
              onConfirm={(sp, conf, src) => {
                setSpecies(sp);
                setConfidence(conf);
                setSource(src);
                go("weighing");
              }}
            />
          )}
          {screen === "weighing" && species && (
            <Weighing
              go={go}
              species={species}
              price={price}
              onCapture={(w) => {
                const rounded = Math.round(w * 100) / 100;
                setWeight(rounded);
                if (rounded < 10) go("weight-light");
                else {
                  const conf =
                    confidence ?? 78 + Math.floor(Math.random() * 18);
                  setConfidence(conf);
                  const g: Grade =
                    conf >= 90 ? "A" : conf >= 82 ? "B" : conf >= 74 ? "C" : "Reject";
                  setGrade(g);
                  go("grading");
                }
              }}
            />
          )}
          {screen === "weight-light" && species && weight != null && (
            <WeightLight
              go={go}
              species={species}
              weight={weight}
              price={price}
              onSave={() => {
                const entry: Session = {
                  species,
                  weight,
                  price,
                  grade: null,
                  conf: null,
                  time: "Just now",
                };
                setSessions((s) => [entry, ...s]);
                go("receipt");
              }}
            />
          )}
          {screen === "grading" && species && weight != null && grade && (
            <Grading
              go={go}
              species={species}
              weight={weight}
              price={price}
              confidence={confidence ?? 0}
              grade={grade}
              source={source}
              onSave={() => {
                const entry: Session = {
                  species,
                  weight,
                  price,
                  grade,
                  conf: confidence,
                  time: "Just now",
                };
                setSessions((s) => [entry, ...s]);
                go("receipt");
              }}
            />
          )}
          {screen === "receipt" && (
            <Receipt go={go} entry={sessions[0]} />
          )}
          {screen === "history" && (
            <History go={go} sessions={sessions} />
          )}
        </div>
      </div>

      <p className="caption-note">
        Prototype flow — tap through the screens, or use the pills above to jump
        to any step.
      </p>
    </div>
  );
}

/* ---------------- Screens ---------------- */

function TopBar({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      {onBack && (
        <button className="iconbtn" onClick={onBack} aria-label="Back">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
      <h2>{title}</h2>
      {right && <div className="spacer" />}
      {right}
    </div>
  );
}

function Welcome({ go }: { go: (s: ScreenId) => void }) {
  return (
    <div className="screen active">
      <div className="welcome-body">
        <div className="welcome-copy">
          <div className="welcome-mark">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 12c3-4 6-6 9-6 3 0 5.5 2 7 6-1.5 4-4 6-7 6-3 0-6-2-9-6Z"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
              <path d="M20 12l3-3v6l-3-3Z" fill="white" />
              <circle cx="8.4" cy="10.6" r=".9" fill="white" />
            </svg>
          </div>
          <h1>Welcome to TunEye</h1>
          <p>
            Point the scanner at the sample. TunEye identifies the species and
            grades quality automatically, right on this tablet.
          </p>
        </div>
        <div className="welcome-actions">
          <button className="btn btn-primary" onClick={() => go("scan")}>
            Get started
          </button>
          <button className="btn btn-ghost" onClick={() => go("history")}>
            View past sessions
          </button>
        </div>
      </div>
    </div>
  );
}

function Scan({
  go,
  price,
  setPrice,
  date,
  setDate,
  onConfirm,
}: {
  go: (s: ScreenId) => void;
  price: number;
  setPrice: (n: number) => void;
  date: string;
  setDate: (s: string) => void;
  onConfirm: (sp: Species, conf: number, src: "ai" | "manual") => void;
}) {
  const [aiResult, setAiResult] = useState<{ sp: Species; conf: number } | null>(null);
  const [manual, setManual] = useState<Species | null>(null);
  const [mode, setMode] = useState<"analyzing" | "ai" | "manual">("analyzing");

  useEffect(() => {
    setMode("analyzing");
    setAiResult(null);
    setManual(null);
    const t = window.setTimeout(() => {
      const options: { sp: Species; conf: number }[] = [
        { sp: "Yellowfin", conf: 92 },
        { sp: "Skipjack", conf: 87 },
      ];
      const pick = options[Math.floor(Math.random() * options.length)];
      setAiResult(pick);
      setMode("ai");
    }, 1600);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="screen active">
      <TopBar title="Scan fish" onBack={() => go("welcome")} />
      <div className="screen-scroll">
        <div className="split-row">
          <div className="split-col-a">
            <div className="cam-box">
              <div className="cam-frame" />
              <div className="cam-scanline" />
              <div className="cam-caption mono">camera preview</div>
            </div>
            <div className="status-line">
              <span className="dot-live" />
              {mode === "analyzing" ? "Analyzing sample…" : "Species identified"}
            </div>
            <div className="sub-line">
              {mode === "analyzing"
                ? "Detecting species from core sample"
                : "Review the detected species below"}
            </div>
          </div>

          <div className="split-col-b">
            <div className="price-card">
              <div className="row">
                <div className="price-field">
                  <span className="label">Base price date</span>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="price-field grow">
                  <span className="label">Base price today (per kg)</span>
                  <div className="unit-prefix">
                    <span>₱</span>
                    <input
                      type="number"
                      value={price}
                      min={0}
                      step={5}
                      onChange={(e) => setPrice(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {mode === "ai" && aiResult && (
              <div className="result-card show">
                <div className="result-top">
                  <div>
                    <div className="result-species display">
                      {aiResult.sp} tuna
                    </div>
                    <div className="result-sub">
                      Identified from fin shape &amp; core color
                    </div>
                  </div>
                  <div className="species-tag mono">Detected</div>
                </div>
              </div>
            )}

            {mode === "manual" && (
              <div>
                <div className="divider-note">
                  AI wasn't sure — select the species manually.
                </div>
                <div className="chip-row">
                  {(["Yellowfin", "Skipjack"] as Species[]).map((sp) => (
                    <button
                      key={sp}
                      className={`chip ${manual === sp ? "selected" : ""}`}
                      onClick={() => setManual(sp)}
                    >
                      <span className="chip-dot" />
                      {sp} tuna
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ flex: 1 }} />

            {mode === "ai" && aiResult && (
              <div className="btn-row">
                <button
                  className="btn btn-ghost"
                  onClick={() => setMode("manual")}
                >
                  Not correct? Skip
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => onConfirm(aiResult.sp, aiResult.conf, "ai")}
                >
                  Confirm
                </button>
              </div>
            )}
            {mode === "manual" && (
              <button
                className="btn btn-primary"
                disabled={!manual}
                style={{
                  opacity: manual ? 1 : 0.4,
                  pointerEvents: manual ? "auto" : "none",
                }}
                onClick={() => manual && onConfirm(manual, 100, "manual")}
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Weighing({
  go,
  species,
  price,
  onCapture,
}: {
  go: (s: ScreenId) => void;
  species: Species;
  price: number;
  onCapture: (w: number) => void;
}) {
  const centerRef = useRef(14 + Math.random() * 10);
  const [val, setVal] = useState<number>(centerRef.current);

  useEffect(() => {
    const id = window.setInterval(() => {
      const c = centerRef.current;
      const v = Math.max(0.5, c + (Math.random() * 1.2 - 0.6));
      setVal(v);
    }, 380);
    return () => window.clearInterval(id);
  }, []);

  const pct = Math.min(1, val / 30);
  const dash = 283;
  const est = val >= 10 ? val * price : 0;

  return (
    <div className="screen active">
      <TopBar title="Weigh sample" onBack={() => go("scan")} />
      <div className="screen-scroll">
        <div className="split-row">
          <div
            className="split-col-a"
            style={{ alignItems: "center", justifyContent: "center" }}
          >
            <div className="gauge-wrap">
              <svg width="220" height="124" viewBox="0 0 200 112">
                <path
                  d="M10 100 A90 90 0 0 1 190 100"
                  fill="none"
                  stroke="#e3e6e1"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M10 100 A90 90 0 0 1 190 100"
                  fill="none"
                  stroke={val < 10 ? "#a15b12" : "#0c6b46"}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={dash - dash * pct}
                />
                <line
                  x1="103"
                  y1="100"
                  x2="103"
                  y2="42"
                  stroke="#a15b12"
                  strokeWidth="1.5"
                  strokeDasharray="2 2"
                />
                <text
                  x="103"
                  y="34"
                  textAnchor="middle"
                  fontSize="9"
                  fill="#a15b12"
                  fontFamily="IBM Plex Mono, monospace"
                >
                  10kg
                </text>
              </svg>
              <div className="gauge-num mono">{val.toFixed(1)}</div>
              <div className="gauge-unit">kg — platform scale connected</div>
            </div>
            <div className="threshold-note">
              Under 10&nbsp;kg records weight only · 10&nbsp;kg and above
              proceeds to full grading
            </div>
          </div>

          <div className="split-col-b">
            <div
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 8 }}
            >
              <div className="row">
                <span className="label">Species confirmed</span>
                <span className="value" style={{ fontSize: 13 }}>
                  {species} tuna
                </span>
              </div>
              <div className="row">
                <span className="label">Base price</span>
                <span className="value mono" style={{ fontSize: 13 }}>
                  {peso(price)}/kg
                </span>
              </div>
              <div className="row">
                <span className="label">Live estimate</span>
                <span
                  className="value mono"
                  style={{
                    fontSize: 14,
                    color: val >= 10 ? "var(--accent)" : "var(--warn)",
                  }}
                >
                  {val >= 10 ? peso(est) : "— below threshold"}
                </span>
              </div>
            </div>

            <div className="sample-btns">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  (centerRef.current = 6 + Math.random() * 3)
                }
              >
                Simulate light catch
              </button>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  (centerRef.current = 20 + Math.random() * 8)
                }
              >
                Simulate full catch
              </button>
            </div>

            <div style={{ flex: 1 }} />
            <button
              className="btn btn-primary"
              onClick={() => onCapture(val)}
            >
              Capture weight
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WeightLight({
  go,
  species,
  weight,
  price,
  onSave,
}: {
  go: (s: ScreenId) => void;
  species: Species;
  weight: number;
  price: number;
  onSave: () => void;
}) {
  const total = price * weight;
  return (
    <div className="screen active">
      <TopBar title="Weight recorded" onBack={() => go("weighing")} />
      <div className="screen-scroll">
        <div className="split-row">
          <div className="split-col-a">
            <div
              className="card"
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              <div className="row">
                <span className="label">Species</span>
                <span className="value" style={{ fontSize: 14 }}>
                  {species} tuna
                </span>
              </div>
              <div className="row">
                <span className="label">Weight</span>
                <span className="value mono" style={{ fontSize: 14 }}>
                  {weight.toFixed(2)} kg
                </span>
              </div>
              <div className="row">
                <span className="label">Base price</span>
                <span className="value mono" style={{ fontSize: 14 }}>
                  {peso(price)}/kg
                </span>
              </div>
            </div>
          </div>
          <div className="split-col-b">
            <div className={`price-hero grade-hero g-warn`}>
              <div className="price-hero-left">
                <div className="label">Estimated value (no grade)</div>
                <div className="price-hero-total mono">{peso(total)}</div>
                <div className="price-hero-breakdown mono">
                  {peso(price)}/kg × {weight.toFixed(2)} kg
                </div>
              </div>
              <div className="price-hero-right">
                <div className="grade-letter" style={{ fontSize: 22 }}>
                  Light
                </div>
                <div className="label" style={{ color: "rgba(255,255,255,.85)" }}>
                  Under 10kg
                </div>
              </div>
            </div>
            <div
              className="card"
              style={{
                background: "var(--warn-soft)",
                borderColor: "#f0dcb8",
                marginTop: 12,
              }}
            >
              <div className="row" style={{ alignItems: "flex-start" }}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  style={{ marginTop: 2, flexShrink: 0 }}
                >
                  <path
                    d="M12 9v4M12 17h.01M10.3 3.86l-8.2 14.2A1.5 1.5 0 0 0 3.5 20h17a1.5 1.5 0 0 0 1.4-1.94l-8.2-14.2a1.5 1.5 0 0 0-2.4 0Z"
                    stroke="#a15b12"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--warn)",
                    marginLeft: 8,
                  }}
                >
                  Below the 10&nbsp;kg grading threshold — saved without a
                  quality grade.
                </span>
              </div>
            </div>
            <div style={{ flex: 1 }} />
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => go("scan")}>
                Rescan
              </button>
              <button className="btn btn-primary" onClick={onSave}>
                Save record
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Grading({
  go,
  species,
  weight,
  price,
  confidence,
  grade,
  source,
  onSave,
}: {
  go: (s: ScreenId) => void;
  species: Species;
  weight: number;
  price: number;
  confidence: number;
  grade: Grade;
  source: "ai" | "manual" | null;
  onSave: () => void;
}) {
  const total = useMemo(
    () => (grade === "Reject" ? 0 : price * weight),
    [price, weight, grade],
  );
  const gradeKey =
    grade === "Reject" ? "R" : (grade as "A" | "B" | "C");
  const gradeLabel = grade === "Reject" ? "Reject" : grade;
  const gradeCopy: Record<string, string> = {
    A: "Premium — sashimi grade",
    B: "Good — market grade",
    C: "Fair — cooking grade",
    Reject: "Rejected — not marketable",
  };
  return (
    <div className="screen active">
      <TopBar
        title="Grading result"
        onBack={() => go("weighing")}
        right={<span className="conf-badge solid">Result ready</span>}
      />
      <div className="screen-scroll">
        <div className="split-row">
          <div className="split-col-a">
            <div className="type-tabs">
              {(["Yellowfin", "Skipjack"] as Species[]).map((sp) => (
                <div
                  key={sp}
                  className={`type-tab ${species === sp ? "active" : ""}`}
                >
                  {sp}
                </div>
              ))}
            </div>
            <div className="core-cam" style={{ flex: 1 }}>
              <div className="cam-frame" />
              <div className="cam-caption mono">core sample view</div>
            </div>
          </div>
          <div className="split-col-b">
            {/* Grade hero — big, colored per grade */}
            <div className={`grade-hero g-${gradeKey}`}>
              <div className="grade-hero-letter display">{gradeLabel}</div>
              <div className="grade-hero-copy">
                <div className="grade-hero-title display">Grade {gradeLabel}</div>
                <div className="grade-hero-sub">{gradeCopy[grade]}</div>
              </div>
            </div>

            {/* Price breakdown: base × weight = total */}
            <div className="price-breakdown">
              <div className="pb-cell">
                <div className="label">Base price</div>
                <div className="pb-num mono">{peso(price)}</div>
                <div className="pb-hint">per kg</div>
              </div>
              <div className="pb-op mono">×</div>
              <div className="pb-cell">
                <div className="label">Weight</div>
                <div className="pb-num mono">{weight.toFixed(2)}</div>
                <div className="pb-hint">kg</div>
              </div>
              <div className="pb-op mono">=</div>
              <div className="pb-cell pb-total">
                <div className="label">Total value</div>
                <div className="pb-num mono">{peso(total)}</div>
                <div className="pb-hint">
                  {grade === "Reject" ? "rejected sample" : "estimated"}
                </div>
              </div>
            </div>

            <div className="detail-grid">
              <div className="card">
                <div className="label">Species</div>
                <div className="value" style={{ fontSize: 14, marginTop: 2 }}>
                  {species} tuna
                </div>
              </div>
              <div className="card conf-card">
                <div className="row">
                  <div className="label">Confidence</div>
                  <div className="value mono" style={{ fontSize: 14 }}>
                    {source === "manual" ? "Manual" : confidence + "%"}
                  </div>
                </div>
                {source !== "manual" && (
                  <div className="conf-bar" aria-hidden>
                    <div
                      className="conf-bar-fill"
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }} />
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => go("scan")}>
                Scan
              </button>
              <button className="btn btn-ghost" onClick={() => go("history")}>
                History
              </button>
              <button className="btn btn-primary" onClick={onSave}>
                Print / save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Receipt({
  go,
  entry,
}: {
  go: (s: ScreenId) => void;
  entry: Session;
}) {
  const graded = entry.grade != null;
  const rows: [string, string][] = [
    ["Species", entry.species + " tuna"],
    ["Weight", entry.weight.toFixed(2) + " kg"],
  ];
  if (graded && entry.price != null) {
    rows.push(["Confidence", entry.conf != null ? entry.conf + "%" : "Manual"]);
    rows.push(["Grade", entry.grade!]);
    rows.push(["Unit price", peso(entry.price) + "/kg"]);
    rows.push(["Est. value", peso(entry.price * entry.weight)]);
  } else {
    rows.push(["Grade", "Not graded (under 10kg)"]);
  }
  rows.push(["Saved", entry.time]);

  return (
    <div className="screen active">
      <TopBar title="Sample saved" onBack={() => go("history")} />
      <div className="screen-scroll">
        <div className="split-row">
          <div
            className="split-col-a"
            style={{
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              gap: 10,
            }}
          >
            <div className="check-ring">
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12.5l4.5 4.5L19 7"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h2 className="display">Saved to history</h2>
            <p className="sub">
              Sample record has been stored on this tablet
            </p>
          </div>
          <div className="split-col-b" style={{ justifyContent: "center" }}>
            <div className="receipt">
              {rows.map(([k, v]) => (
                <div className="r-row" key={k}>
                  <span>{k}</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => go("history")}>
                View history
              </button>
              <button className="btn btn-primary" onClick={() => go("scan")}>
                New scan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function History({
  go,
  sessions,
}: {
  go: (s: ScreenId) => void;
  sessions: Session[];
}) {
  return (
    <div className="screen active">
      <TopBar title="History" onBack={() => go("welcome")} />
      <div className="hist-search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle
            cx="11"
            cy="11"
            r="7"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M21 21l-3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        Search past sessions
      </div>
      <div className="screen-scroll">
        {sessions.length === 0 ? (
          <div className="empty-state">No sessions yet</div>
        ) : (
          sessions.map((s, i) => {
            const value =
              s.price != null ? s.price * s.weight : null;
            return (
              <div className="hist-item" key={i}>
                <div className="hist-swatch">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M3 12c3-4 6-6 9-6 3 0 5.5 2 7 6-1.5 4-4 6-7 6-3 0-6-2-9-6Z"
                      stroke="#12161a"
                      strokeWidth="1.4"
                    />
                  </svg>
                </div>
                <div className="hist-main">
                  <div className="hist-name">
                    {s.species} tuna · {s.weight.toFixed(2)}kg
                  </div>
                  <div className="hist-meta">
                    {s.time}
                    {s.price != null && ` · ${peso(s.price)}/kg`}
                    {s.conf != null && ` · ${s.conf}% conf`}
                  </div>
                </div>
                <div className="hist-right">
                  {value != null && (
                    <div className="hist-value mono">{peso(value)}</div>
                  )}
                  <div
                    className={`hist-grade ${
                      s.grade ? "g-A" : "g-none"
                    }`}
                  >
                    {s.grade ? "Grade " + s.grade : "—"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
