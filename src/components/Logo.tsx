export function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 400 400" fill="none">
      <rect width="400" height="400" rx="104" fill="#d6ff7b" />
      <circle cx="84" cy="84" r="26" fill="#fb5391" />
      <circle cx="316" cy="316" r="26" fill="#8d9cf9" />
      <path
        d="M80 118 L320 118 L80 282 L320 282"
        stroke="#1a1040"
        strokeWidth="54"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function LogoFull({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: { icon: 28, text: "text-base" }, md: { icon: 34, text: "text-xl" }, lg: { icon: 44, text: "text-3xl" } }[size];
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={s.icon} />
      <span className={`font-display font-extrabold text-white ${s.text}`} style={{ letterSpacing: "-0.5px" }}>
        One.Zi
      </span>
    </div>
  );
}

export function LogoScreen({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const s = { sm: { icon: 28, text: "text-base", sub: "text-xs" }, md: { icon: 34, text: "text-xl", sub: "text-sm" }, lg: { icon: 44, text: "text-3xl", sub: "text-lg" } }[size];
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={s.icon} />
      <div className="flex items-baseline gap-1.5">
        <span className={`font-display font-extrabold text-white ${s.text}`} style={{ letterSpacing: "-0.5px" }}>
          One.Zi
        </span>
        <span className={`font-display font-medium text-white/30 ${s.sub}`}>
          Vídeos
        </span>
      </div>
    </div>
  );
}
