/** Radiant's original halo, shared by every workspace page. */
export function HeroPattern() {
  return (
    <div
      aria-hidden="true"
      data-shell-gradient="radiant"
      className="pointer-events-none absolute inset-0 z-0 mx-0 max-w-none overflow-hidden dark:hidden"
    >
      <div
        className="absolute -top-44 right-40 h-56 w-[33rem] rotate-[-10deg] transform-gpu rounded-full opacity-80 blur-3xl md:right-48 lg:right-56 dark:opacity-40"
        style={{ backgroundImage: "linear-gradient(115deg, #fff1be 28%, #ee87cb 70%, #b060ff)" }}
      />
    </div>
  );
}
