import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { confidenceForGrade, gradeImageUrl, simulateGrade } from "../lib/grade-images";
import { SpeciesIcon } from "../lib/species-icons";
import { TunEyeLogo } from "../lib/tuneye-logo";
import "../tuneye.css";

type ScreenId =
  | "welcome"
  | "scan"
  | "pricing"
  | "weighing"
  | "weight-light"
  | "grading"
  | "receipt"
  | "history";

type Species = "Yellowfin" | "Skipjack";
type Grade = "A" | "B" | "C" | "Reject";
type SpeciesSource = "ai" | "manual";

type Session = {
  species: Species;
  weight: number;
  price: number | null;
  grade: Grade | null;
  conf: number | null;
  time: string;
};

type PriceRecord = {
  date: string;
  yellowfin: number;
  skipjack: number;
};

const INITIAL_PRICE_HISTORY: PriceRecord[] = [
  { date: "2026-07-09", yellowfin: 280, skipjack: 150 },
  { date: "2026-07-08", yellowfin: 275, skipjack: 148 },
  { date: "2026-07-07", yellowfin: 270, skipjack: 155 },
  { date: "2026-07-06", yellowfin: 265, skipjack: 152 },
  { date: "2026-07-05", yellowfin: 268, skipjack: 145 },
];

function formatPriceDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function priceDelta(current: number, previous: number | null) {
  if (previous == null) return null;
  const diff = current - previous;
  return { diff, up: diff > 0, down: diff < 0 };
}

const STEPS: { id: ScreenId; label: string }[] = [
  { id: "welcome", label: "Welcome" },
  { id: "scan", label: "Scan" },
  { id: "pricing", label: "Pricing" },
  { id: "weighing", label: "Weighing" },
  { id: "grading", label: "Grading" },
  { id: "receipt", label: "Result" },
  { id: "history", label: "History" },
];

function defaultPriceFor(species: Species) {
  return species === "Yellowfin" ? 280 : 150;
}

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
  const [speciesSource, setSpeciesSource] = useState<SpeciesSource | null>(null);
  const [speciesAiConf, setSpeciesAiConf] = useState<number | null>(null);
  const [gradingConfidence, setGradingConfidence] = useState<number | null>(null);
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

  const priceHistory = INITIAL_PRICE_HISTORY;

  function go(id: ScreenId) {
    if (id === "scan" || id === "welcome") {
      setGrade(null);
      setGradingConfidence(null);
    }
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
              <span className="brand-mark">
                <TunEyeLogo size={14} color="#fff" />
              </span>
              TunEye
            </div>
            <div className="time mono">{clock}</div>
          </div>

          {screen === "welcome" && <Welcome go={go} />}
          {screen === "scan" && (
            <Scan
              go={go}
              onConfirm={(sp, source, conf) => {
                setSpecies(sp);
                setSpeciesSource(source);
                setSpeciesAiConf(source === "ai" ? (conf ?? null) : null);
                setPrice(defaultPriceFor(sp));
                setGradingConfidence(null);
                go("pricing");
              }}
            />
          )}
          {screen === "pricing" && species && (
            <Pricing
              go={go}
              species={species}
              speciesSource={speciesSource ?? "manual"}
              speciesAiConf={speciesAiConf}
              price={price}
              setPrice={setPrice}
              date={date}
              setDate={setDate}
              priceHistory={priceHistory}
              onContinue={() => go("weighing")}
            />
          )}
          {screen === "weighing" && species && (
            <Weighing
              go={go}
              species={species}
              price={price}
              onCapture={(w, forcedGrade) => {
                const rounded = Math.round(w * 100) / 100;
                setWeight(rounded);
                if (rounded < 10) go("weight-light");
                else {
                  const result = forcedGrade
                    ? {
                        grade: forcedGrade,
                        confidence: confidenceForGrade(forcedGrade),
                      }
                    : simulateGrade();
                  setGradingConfidence(result.confidence);
                  setGrade(result.grade);
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
              gradingConfidence={gradingConfidence ?? 0}
              grade={grade}
              onSave={() => {
                const entry: Session = {
                  species,
                  weight,
                  price,
                  grade,
                  conf: gradingConfidence,
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
            <TunEyeLogo size={26} color="#fff" />
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

function PriceHistoryPanel({ records }: { records: PriceRecord[] }) {
  return (
    <div className="price-history">
      <div className="price-history-head">
        <span className="label">Base price history</span>
        <span className="price-history-hint">per kg · daily record</span>
      </div>
      <div className="price-history-table">
        <div className="price-history-row price-history-header">
          <span>Date</span>
          <span>Yellowfin</span>
          <span>Skipjack</span>
        </div>
        {records.map((row, i) => {
          const prev = records[i + 1] ?? null;
          const yfDelta = priceDelta(row.yellowfin, prev?.yellowfin ?? null);
          const skDelta = priceDelta(row.skipjack, prev?.skipjack ?? null);
          return (
            <div className="price-history-row" key={row.date}>
              <span className="mono ph-date">{formatPriceDate(row.date)}</span>
              <span className="ph-price">
                {peso(row.yellowfin)}
                {yfDelta && (
                  <em
                    className={`ph-delta ${yfDelta.up ? "up" : yfDelta.down ? "down" : ""}`}
                  >
                    {yfDelta.up ? "+" : ""}
                    {yfDelta.diff}
                  </em>
                )}
              </span>
              <span className="ph-price">
                {peso(row.skipjack)}
                {skDelta && (
                  <em
                    className={`ph-delta ${skDelta.up ? "up" : skDelta.down ? "down" : ""}`}
                  >
                    {skDelta.up ? "+" : ""}
                    {skDelta.diff}
                  </em>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpeciesResultCard({
  species,
  conf,
  source,
}: {
  species: Species;
  conf?: number;
  source: SpeciesSource;
}) {
  const isAi = source === "ai";

  return (
    <div className={`species-result-card ${isAi ? "ai" : "manual"}`}>
      <div className="species-result-icon-wrap">
        <SpeciesIcon species={species} size={44} />
      </div>
      <div className="species-result-body">
        <div className="species-result-top">
          <div className="species-result-name display">{species} tuna</div>
          <span className={`species-result-badge ${isAi ? "ai" : "manual"}`}>
            {isAi ? (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M12 2l2.2 6.8H21l-5.5 4 2.1 6.8L12 15.8 6.4 19.6l2.1-6.8L3 8.8h6.8L12 2Z" fill="currentColor" />
                </svg>
                AI detected
              </>
            ) : (
              <>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4M5 11h14v10H5V11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
                Your pick
              </>
            )}
          </span>
        </div>
        <div className="species-result-sub">
          {isAi
            ? "Identified from core sample & meat color"
            : "Species chosen manually on scanner"}
        </div>
        {isAi && conf != null && (
          <div className="species-result-conf">
            <div className="species-result-conf-bar" aria-hidden>
              <div className="species-result-conf-fill" style={{ width: `${conf}%` }} />
            </div>
            <span className="mono">{conf}% match</span>
          </div>
        )}
      </div>
    </div>
  );
}

function SpeciesPicker({
  value,
  onChange,
  note,
  suggested,
}: {
  value: Species | null;
  onChange: (sp: Species) => void;
  note: string;
  suggested?: Species | null;
}) {
  return (
    <div className="species-picker-wrap">
      <div className="divider-note">{note}</div>
      <div className="species-picker">
        {(["Yellowfin", "Skipjack"] as Species[]).map((sp) => {
          const selected = value === sp;
          const isSuggested = suggested === sp && !selected;
          return (
            <button
              key={sp}
              type="button"
              className={`species-tile ${selected ? "selected" : ""} ${isSuggested ? "suggested" : ""}`}
              onClick={() => onChange(sp)}
              aria-pressed={selected}
            >
              {isSuggested && <span className="species-tile-hint">AI pick</span>}
              <span className="species-tile-icon">
                <SpeciesIcon species={sp} size={48} variant="fish" />
              </span>
              <span className="species-tile-label">{sp}</span>
              <span className="species-tile-sub">tuna</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Scan({
  go,
  onConfirm,
}: {
  go: (s: ScreenId) => void;
  onConfirm: (sp: Species, source: SpeciesSource, conf?: number) => void;
}) {
  const [aiResult, setAiResult] = useState<{ sp: Species; conf: number } | null>(null);
  const [manual, setManual] = useState<Species | null>(null);
  const isAnalyzing = aiResult === null;

  useEffect(() => {
    setAiResult(null);
    setManual(null);
    const t = window.setTimeout(() => {
      const options: { sp: Species; conf: number }[] = [
        { sp: "Yellowfin", conf: 92 },
        { sp: "Skipjack", conf: 87 },
      ];
      const pick = options[Math.floor(Math.random() * options.length)];
      setAiResult(pick);
    }, 1600);
    return () => window.clearTimeout(t);
  }, []);

  const canContinue = manual != null || aiResult != null;
  const pickedManual = manual != null;
  const previewSpecies = manual ?? aiResult?.sp ?? null;
  const previewSource: SpeciesSource = pickedManual ? "manual" : "ai";

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

            {previewSpecies ? (
              <SpeciesResultCard
                species={previewSpecies}
                conf={pickedManual ? undefined : aiResult?.conf}
                source={previewSource}
              />
            ) : isAnalyzing ? (
              <div className="scan-species-placeholder">
                <span className="dot-live" />
                <span>Scanning for species…</span>
              </div>
            ) : null}

            <div className="status-line">
              <span className={`dot-live ${isAnalyzing ? "" : "done"}`} />
              {isAnalyzing ? "Analyzing sample…" : "Species identified"}
            </div>
            <div className="sub-line">
              {isAnalyzing
                ? "Analyzing core sample & meat color"
                : "Review the result or pick manually"}
            </div>
          </div>

          <div className="split-col-b">
            <SpeciesPicker
              value={manual}
              onChange={setManual}
              suggested={pickedManual ? null : aiResult?.sp ?? null}
              note={
                isAnalyzing
                  ? "Or select the species manually"
                  : "Or select a different species manually"
              }
            />

            <div style={{ flex: 1 }} />

            <button
              className="btn btn-primary"
              disabled={!canContinue}
              style={{
                opacity: canContinue ? 1 : 0.4,
                pointerEvents: canContinue ? "auto" : "none",
              }}
              onClick={() => {
                if (pickedManual && manual) onConfirm(manual, "manual");
                else if (aiResult) onConfirm(aiResult.sp, "ai", aiResult.conf);
              }}
            >
              {pickedManual
                ? `Continue with ${manual}`
                : aiResult
                  ? `Confirm ${aiResult.sp}`
                  : "Select a species"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pricing({
  go,
  species,
  speciesSource,
  speciesAiConf,
  price,
  setPrice,
  date,
  setDate,
  priceHistory,
  onContinue,
}: {
  go: (s: ScreenId) => void;
  species: Species;
  speciesSource: SpeciesSource;
  speciesAiConf: number | null;
  price: number;
  setPrice: (n: number) => void;
  date: string;
  setDate: (s: string) => void;
  priceHistory: PriceRecord[];
  onContinue: () => void;
}) {
  const historyPrice =
    species === "Yellowfin"
      ? priceHistory[0]?.yellowfin
      : priceHistory[0]?.skipjack;
  const delta =
    historyPrice != null ? priceDelta(price, historyPrice) : null;

  return (
    <div className="screen active">
      <TopBar title="Set base price" onBack={() => go("scan")} />
      <div className="screen-scroll">
        <div className="split-row">
          <div className="split-col-a">
            <SpeciesResultCard
              species={species}
              source={speciesSource}
              conf={speciesAiConf ?? undefined}
            />
            <div className="card pricing-summary">
              <div className="row">
                <span className="label">Species</span>
                <span className="value" style={{ fontSize: 14 }}>
                  {species} tuna
                </span>
              </div>
              <div className="row" style={{ marginTop: 10 }}>
                <span className="label">Today's base price</span>
                <span className="value mono" style={{ fontSize: 18, color: "var(--accent)" }}>
                  {peso(price)}/kg
                </span>
              </div>
              {delta && (
                <div className="pricing-delta-note">
                  <span className={`ph-delta ${delta.up ? "up" : delta.down ? "down" : ""}`}>
                    {delta.up ? "+" : ""}
                    {delta.diff} vs last recorded day
                  </span>
                </div>
              )}
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
                  <span className="label">{species} price (per kg)</span>
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

            <PriceHistoryPanel records={priceHistory} />

            <div style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={onContinue}>
              Continue to weighing
            </button>
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
  onCapture: (w: number, forcedGrade?: Grade) => void;
}) {
  const centerRef = useRef(14 + Math.random() * 10);
  const [val, setVal] = useState<number>(centerRef.current);
  const [demoGrade, setDemoGrade] = useState<Grade | null>(null);

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
      <TopBar title="Weigh sample" onBack={() => go("pricing")} />
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

            {val >= 10 && (
              <div className="grade-demo-btns">
                <span className="grade-demo-label">Demo grade</span>
                {(["A", "B", "C", "Reject"] as Grade[]).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className={`grade-demo-btn g-${g === "Reject" ? "R" : g}${demoGrade === g ? " active" : ""}`}
                    onClick={() => setDemoGrade(demoGrade === g ? null : g)}
                  >
                    {g === "Reject" ? "Reject" : g}
                  </button>
                ))}
              </div>
            )}

            <div style={{ flex: 1 }} />
            <button
              className="btn btn-primary"
              onClick={() => onCapture(val, demoGrade ?? undefined)}
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

function GradeCameraPreview({ grade }: { grade: Grade }) {
  const label = grade === "Reject" ? "Reject" : `Grade ${grade}`;
  return (
    <div className="core-cam grade-cam" style={{ flex: 1 }}>
      <div className="cam-frame cam-frame-filled">
        <img
          src={gradeImageUrl(grade)}
          alt={`${label} — core sample and meat color`}
          className="grade-scan-img"
        />
      </div>
      <div className="cam-caption mono">core sample &amp; meat color</div>
    </div>
  );
}

function Grading({
  go,
  species,
  weight,
  price,
  gradingConfidence,
  grade,
  onSave,
}: {
  go: (s: ScreenId) => void;
  species: Species;
  weight: number;
  price: number;
  gradingConfidence: number;
  grade: Grade;
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
            <GradeCameraPreview grade={grade} />
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
                    {gradingConfidence}%
                  </div>
                </div>
                <div className="conf-bar" aria-hidden>
                  <div
                    className="conf-bar-fill"
                    style={{ width: `${gradingConfidence}%` }}
                  />
                </div>
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

function ReceiptBarcode() {
  const bars = [2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 1, 2, 3, 1, 2, 1, 3, 2, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 3, 1, 2, 1, 4, 2, 1, 3, 2];
  return (
    <div className="thermal-barcode" aria-hidden>
      {bars.map((w, i) => (
        <span key={i} style={{ width: w }} />
      ))}
    </div>
  );
}

function ThermalPaper({
  entry,
  receiptNo,
  recordedAt,
  compact,
}: {
  entry: Session;
  receiptNo: string;
  recordedAt: string;
  compact?: boolean;
}) {
  const graded = entry.grade != null;
  const total =
    entry.price != null ? entry.price * entry.weight : 0;

  return (
    <div className={`thermal-paper ${compact ? "compact" : ""}`}>
      <div className="thermal-dash">- - - - - - - - - - - - - - - -</div>
      <div className="thermal-title">RECEIPT</div>
      <div className="thermal-dash">- - - - - - - - - - - - - - - -</div>

      <div className="thermal-section">
        <div className="thermal-section-title">Sample Details</div>
        <div className="thermal-kv">
          <span>Receipt No.</span>
          <span className="mono">{receiptNo}</span>
        </div>
        <div className="thermal-kv">
          <span>Recorded</span>
          <span>{recordedAt}</span>
        </div>
        <div className="thermal-kv">
          <span>Species</span>
          <span>{entry.species} tuna</span>
        </div>
        <div className="thermal-kv">
          <span>Weight</span>
          <span className="mono">{entry.weight.toFixed(2)} kg</span>
        </div>
        <div className="thermal-kv">
          <span>Status</span>
          <span className="thermal-badge">Saved</span>
        </div>
      </div>

      <div className="thermal-line" />

      <div className="thermal-section">
        <div className="thermal-section-title">Grading Details</div>
        {entry.price != null && (
          <div className="thermal-item">
            <span>Base price / kg</span>
            <span className="mono">{peso(entry.price)}</span>
          </div>
        )}
        {graded && entry.conf != null && (
          <div className="thermal-item">
            <span>Confidence</span>
            <span className="mono">{entry.conf}%</span>
          </div>
        )}
        <div className="thermal-item">
          <span>Grade</span>
          <span className="mono">
            {graded
              ? entry.grade === "Reject"
                ? "Reject"
                : "Grade " + entry.grade
              : "Not graded (under 10kg)"}
          </span>
        </div>
      </div>

      <div className="thermal-line" />

      <div className="thermal-total-row">
        <span>TOTAL AMOUNT</span>
        <span className="mono">{peso(total)}</span>
      </div>

      <div className="thermal-line" />

      <div className="thermal-thanks">THANK YOU</div>
      <ReceiptBarcode />
      <div className="thermal-tear" />
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
  const [fullscreen, setFullscreen] = useState(false);
  const receiptNo = useMemo(
    () => "TN-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    [entry.time, entry.species, entry.weight],
  );
  const recordedAt = new Date().toLocaleString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="screen active receipt-screen">
      <TopBar title="Print receipt" onBack={() => go("history")} />
      <div className="receipt-layout">
        <div className="receipt-success-col">
          <div className="receipt-success-body">
            <div className="receipt-success-icon" aria-hidden>
              <svg width="64" height="64" viewBox="0 0 56 56" fill="none">
                <rect x="8" y="6" width="32" height="42" rx="4" stroke="#3b82f6" strokeWidth="2" fill="#eff6ff" />
                <rect x="14" y="2" width="32" height="42" rx="4" stroke="#93c5fd" strokeWidth="1.5" fill="#f8fafc" />
                <rect x="20" y="10" width="28" height="36" rx="3" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
                <circle cx="34" cy="26" r="10" fill="#22c55e" />
                <path d="M29 26l3.5 3.5L39 22" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 className="receipt-success-title display">Success!</h2>
            <p className="receipt-success-sub">
              Sample record has been stored on this tablet and is ready to print.
            </p>
            <button type="button" className="receipt-download-btn">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 3v12M7 10l5 5 5-5M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Download PDF Receipt
            </button>
          </div>
          <div className="btn-row receipt-actions">
            <button className="btn btn-ghost" onClick={() => go("history")}>
              View history
            </button>
            <button className="btn btn-primary" onClick={() => go("scan")}>
              New scan
            </button>
          </div>
        </div>

        <div className="receipt-paper-col">
          <button
            type="button"
            className="receipt-fullscreen-btn"
            onClick={() => setFullscreen(true)}
            aria-label="View receipt full screen"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Full screen
          </button>
          <div className="receipt-dispenser receipt-dispenser-fit">
            <div className="receipt-slot" />
            <ThermalPaper
              entry={entry}
              receiptNo={receiptNo}
              recordedAt={recordedAt}
              compact
            />
          </div>
        </div>
      </div>

      {fullscreen && (
        <div className="receipt-fullscreen-overlay" role="dialog" aria-modal="true">
          <button
            type="button"
            className="receipt-fullscreen-close"
            onClick={() => setFullscreen(false)}
            aria-label="Close full screen"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="receipt-fullscreen-inner">
            <div className="receipt-dispenser receipt-dispenser-lg">
              <div className="receipt-slot" />
              <ThermalPaper
                entry={entry}
                receiptNo={receiptNo}
                recordedAt={recordedAt}
              />
            </div>
          </div>
        </div>
      )}
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
                      s.grade
                        ? "g-" + (s.grade === "Reject" ? "R" : s.grade)
                        : "g-none"
                    }`}
                  >
                    {s.grade ? (s.grade === "Reject" ? "Reject" : "Grade " + s.grade) : "—"}
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
