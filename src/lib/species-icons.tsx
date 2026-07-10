export type Species = "Yellowfin" | "Skipjack";

function YellowfinFish() {
  return (
    <>
      <ellipse cx="24" cy="26" rx="17" ry="7.5" fill="#1e3a5f" />
      <path
        d="M7 26c4-3.5 9-5.5 14.5-5.5 6 0 10.5 2 15 5.5"
        fill="#2d4a6f"
      />
      <path d="M36 24l9-3.5v7L36 24Z" fill="#1e3a5f" />
      <ellipse cx="24" cy="27" rx="14" ry="5.5" fill="#4a6fa5" opacity="0.35" />
      <path
        d="M12 24c2-2 5-3 8-3 5 0 9 1.5 13 4"
        stroke="#5b8cbf"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
      <circle cx="11" cy="25" r="1.3" fill="#fff" />
      <circle cx="11" cy="25" r="0.45" fill="#1e3a5f" />
      <path
        d="M18 19c1.5-3 4.5-4.5 8-4.5"
        stroke="#64748b"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  );
}

function SkipjackFish() {
  return (
    <>
      <ellipse cx="24" cy="26" rx="15" ry="7" fill="#334155" />
      <path
        d="M9 26c3.5-2.5 8-4 12-4 5.5 0 9.5 1.8 14 4.5"
        fill="#475569"
      />
      <path d="M35 24l8-3v6l-8-3Z" fill="#334155" />
      <ellipse cx="24" cy="27" rx="12" ry="5" fill="#64748b" opacity="0.3" />
      <path
        d="M14 28h16M15 30.5h14M16 33h12"
        stroke="#94a3b8"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="12" cy="25.5" r="1.1" fill="#fff" />
      <circle cx="12" cy="25.5" r="0.4" fill="#334155" />
      <path
        d="M16 20c1-2 3-3 6-3"
        stroke="#64748b"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  );
}

function YellowfinCore() {
  return (
    <>
      <circle cx="24" cy="24" r="18" fill="#f5f6f4" stroke="#d1d5db" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="13" fill="#fce8e8" stroke="#e8b4b4" strokeWidth="1" />
      <circle cx="24" cy="24" r="9" fill="#d63a3a" />
      <circle cx="24" cy="24" r="5.5" fill="#b91c1c" />
      <ellipse cx="21" cy="21" rx="2" ry="1.5" fill="#fca5a5" opacity="0.5" />
      <path
        d="M24 11v4M24 33v4M11 24h4M33 24h4"
        stroke="#9aa39d"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </>
  );
}

function SkipjackCore() {
  return (
    <>
      <circle cx="24" cy="24" r="18" fill="#f5f6f4" stroke="#d1d5db" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="13" fill="#ede4e4" stroke="#c9b8b8" strokeWidth="1" />
      <circle cx="24" cy="24" r="9" fill="#7f1d1d" />
      <circle cx="24" cy="24" r="5.5" fill="#5c1212" />
      <path
        d="M17 20h14M16.5 24h15M17 28h14"
        stroke="#991b1b"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M24 11v4M24 33v4M11 24h4M33 24h4"
        stroke="#9aa39d"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.5"
      />
    </>
  );
}

export function SpeciesIcon({
  species,
  size = 40,
  variant = "core",
}: {
  species: Species;
  size?: number;
  variant?: "fish" | "core";
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      {variant === "fish" ? (
        species === "Yellowfin" ? <YellowfinFish /> : <SkipjackFish />
      ) : species === "Yellowfin" ? (
        <YellowfinCore />
      ) : (
        <SkipjackCore />
      )}
    </svg>
  );
}
