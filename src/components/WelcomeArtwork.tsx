import { useFloralBackground } from "@/lib/floral-background";
import "./welcome-artwork.css";
import { FloralArtwork } from "./FloralArtwork";

export function WelcomeArtwork() {
  const [background] = useFloralBackground();
  return (
    <div className="welcome-artwork" aria-hidden="true">
      <FloralArtwork scene={background} className="welcome-artwork-scene" />
    </div>
  );
}
