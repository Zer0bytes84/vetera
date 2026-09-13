import { useFloralBackground } from "@/lib/floral-background";
import "./welcome-artwork.css";

export function WelcomeArtwork() {
  const [background] = useFloralBackground();
  return (
    <div className="welcome-artwork" aria-hidden="true">
      <img src={`/art/cabinet-floral-${background}.png`} alt="" />
    </div>
  );
}
