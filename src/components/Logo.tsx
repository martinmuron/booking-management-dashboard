interface LogoProps {
  className?: string;
  size?: number;
}

export function Logo({ className, size = 120 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Background circle */}
      <circle cx="60" cy="60" r="58" fill="black" stroke="white" strokeWidth="2" />
      
      {/* Main text Nick & Jenny */}
      <text
        x="60"
        y="45"
        textAnchor="middle"
        fontSize="16"
        fontFamily="serif"
        fontWeight="bold"
        fill="white"
        letterSpacing="1px"
      >
        NICK
      </text>
      
      {/* Ampersand */}
      <text
        x="60"
        y="62"
        textAnchor="middle"
        fontSize="14"
        fontFamily="serif"
        fontStyle="italic"
        fill="white"
      >
        &
      </text>
      
      <text
        x="60"
        y="80"
        textAnchor="middle"
        fontSize="16"
        fontFamily="serif"
        fontWeight="bold"
        fill="white"
        letterSpacing="1px"
      >
        JENNY
      </text>
      
      {/* Decorative elements */}
      <line x1="25" y1="50" x2="95" y2="50" stroke="white" strokeWidth="0.5" opacity="0.7" />
      <line x1="25" y1="85" x2="95" y2="85" stroke="white" strokeWidth="0.5" opacity="0.7" />
      
      {/* Small decorative dots */}
      <circle cx="30" cy="60" r="1.5" fill="white" opacity="0.8" />
      <circle cx="90" cy="60" r="1.5" fill="white" opacity="0.8" />
    </svg>
  );
}