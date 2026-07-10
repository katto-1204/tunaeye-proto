export function TunEyeLogo({
  size = 24,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 12c2.5-3.5 6-5.5 9.5-5.5 4 0 7 1.8 10 5"
        fill={color}
        opacity="0.92"
      />
      <path d="M20 11l4-1.8v4.2L20 12Z" fill={color} />
      <circle cx="7.5" cy="11.5" r="1" fill={color} />
      <circle cx="7.5" cy="11.5" r="0.35" fill="#fff" />
    </svg>
  );
}
