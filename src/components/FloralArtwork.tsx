import type { CSSProperties } from "react";
import type { FloralBackground } from "@/lib/floral-background";
import "./floral-artwork.css";

const paper: Record<FloralBackground, string> = {
  lilas: "#fdf8f1", sauge: "#fdf7ee", chiens: "#fcf9ef",
  lapins: "#fdf8ef", oiseaux: "#fdfaf1", chats: "#fefaf1",
  chiots: "#f5f3e6", nac: "#f5f3e6",
};

/** Keep each original canvas intact; complete sparse scenes with botanical edges. */
export function FloralArtwork({ scene, className = "" }: {
  scene: FloralBackground;
  className?: string;
}) {
  return (
    <div className={`floral-artwork ${className}`} data-scene={scene}
      style={{ "--floral-paper": paper[scene] } as CSSProperties} aria-hidden="true">
      <img className="floral-artwork-scene" src={`/art/cabinet-floral-${scene}.png`} alt="" />
      {["chats", "chiots", "nac"].includes(scene) && <span className="floral-artwork-flowers" />}
    </div>
  );
}
