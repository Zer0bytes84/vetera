import { GridPattern } from "@/components/GridPattern";

export function HeroPattern() {
  return (
    <div className="absolute inset-0 top-[--header-height] z-0 mx-0 max-w-none overflow-hidden pointer-events-none">
      <div
        className="absolute -top-44 right-40 h-56 w-[33rem] transform-gpu md:right-48 lg:right-56 rotate-[-10deg] rounded-full blur-3xl opacity-80 dark:opacity-40"
        style={{
          backgroundImage: "linear-gradient(115deg, #fff1be 28%, #ee87cb 70%, #b060ff)"
        }}
      />
    </div>
  );
}

