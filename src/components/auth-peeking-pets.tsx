// Line drawings in the manner of Notion's illustrations: thick ink strokes,
// paper fills, one or two black shapes. Each animal peeks around the login card.

const INK = "var(--pet-ink)";

export function PeekingDog({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 220 230" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
        {/* Body, mostly hidden behind the card. */}
        <path d="M62 150 C52 182 50 208 52 230 M158 150 C168 182 170 208 168 230" />
        {/* Head */}
        <path d="M58 92 C56 52 82 34 110 34 C138 34 164 52 162 92 C161 124 150 152 110 154 C70 152 59 124 58 92 Z" fill="var(--pet-paper)" />
        {/* Floppy ears */}
        <path d="M66 58 C42 54 22 86 30 120 C34 136 52 138 58 122 C62 110 60 92 66 76 Z" fill={INK} />
        <path d="M154 58 C178 54 198 86 190 120 C186 136 168 138 162 122 C158 110 160 92 154 76 Z" fill={INK} />
        {/* Patch round the right eye */}
        <path d="M122 76 C138 70 150 82 148 96 C146 110 128 112 120 102 C114 94 114 80 122 76 Z" fill={INK} stroke="none" />
        {/* Eyes */}
        <circle cx="88" cy="92" r="6" fill={INK} stroke="none" />
        <circle cx="134" cy="92" r="6" fill="var(--pet-paper)" stroke="none" />
        <circle cx="134" cy="92" r="3.5" fill={INK} stroke="none" />
        {/* Muzzle, nose, smile, tongue */}
        <path d="M84 124 C84 108 136 108 136 124 C136 140 120 146 110 146 C100 146 84 140 84 124 Z" fill="var(--pet-paper)" />
        <path d="M100 116 C100 110 120 110 120 116 C120 122 114 125 110 125 C106 125 100 122 100 116 Z" fill={INK} />
        <path d="M110 126 V133 M98 133 C104 140 116 140 122 133" />
        <path d="M106 138 C106 148 116 148 116 138" fill="#f3768d" strokeWidth="4" />
      </g>
    </svg>
  );
}

export function PeekingCat({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 220 210" xmlns="http://www.w3.org/2000/svg">
      <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round" strokeWidth="5">
        {/* Paw resting on the card edge */}
        <path d="M150 168 C150 152 186 152 186 168 C186 182 150 182 150 168 Z" fill="var(--pet-paper)" />
        <path d="M162 160 V170 M174 160 V170" strokeWidth="3.5" />
        {/* Ears */}
        <path d="M52 76 L58 24 L96 56" fill="var(--pet-paper)" />
        <path d="M156 76 L150 24 L112 56" fill="var(--pet-paper)" />
        <path d="M62 52 L64 36 L78 50 M146 52 L144 36 L130 50" strokeWidth="3.5" />
        {/* Head */}
        <path d="M44 104 C42 64 76 48 104 48 C132 48 166 64 164 104 C162 142 136 160 104 160 C72 160 46 142 44 104 Z" fill="var(--pet-paper)" />
        {/* Tabby stripes */}
        <path d="M94 54 L97 72 M104 52 V72 M114 54 L111 72" strokeWidth="4" />
        <path d="M46 96 L62 98 M48 110 L62 108 M162 96 L146 98 M160 110 L146 108" strokeWidth="4" />
        {/* Content, half-closed eyes */}
        <path d="M74 100 C80 92 90 92 96 100 M112 100 C118 92 128 92 134 100" />
        {/* Nose and mouth */}
        <path d="M98 114 H110 L104 121 Z" fill={INK} />
        <path d="M104 121 C102 130 94 132 90 126 M104 121 C106 130 114 132 118 126" strokeWidth="4" />
        {/* Whiskers */}
        <path d="M30 118 L70 122 M32 134 L70 128 M178 118 L138 122 M176 134 L138 128" strokeWidth="3" />
        {/* Cheeks */}
        <circle cx="70" cy="128" r="7" fill="#f7a8b8" stroke="none" opacity=".7" />
        <circle cx="138" cy="128" r="7" fill="#f7a8b8" stroke="none" opacity=".7" />
      </g>
    </svg>
  );
}

// Solid silhouettes set behind the card: crisp where they cross its edge,
// frosted where the glass covers them.
export function DogSilhouette({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor">
        <circle cx="100" cy="68" r="46" />
        <ellipse cx="54" cy="78" rx="18" ry="36" transform="rotate(18 54 78)" />
        <ellipse cx="146" cy="78" rx="18" ry="36" transform="rotate(-18 146 78)" />
        <path d="M66 104 C40 150 34 214 56 244 H144 C166 214 160 150 134 104 Z" />
        <path d="M150 230 C182 226 196 200 188 178 C184 170 176 172 176 182 C178 200 166 212 146 214 Z" />
      </g>
    </svg>
  );
}

export function CatSilhouette({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 200 250" xmlns="http://www.w3.org/2000/svg">
      <g fill="currentColor">
        <path d="M58 40 L64 4 L92 30 Z M142 40 L136 4 L108 30 Z" />
        <ellipse cx="100" cy="60" rx="46" ry="40" />
        <path d="M70 92 C46 140 44 214 62 244 H138 C156 214 154 140 130 92 Z" />
        <path d="M136 236 C176 240 198 212 186 186 C180 174 168 178 172 192 C176 210 160 222 140 220 Z" />
      </g>
    </svg>
  );
}
