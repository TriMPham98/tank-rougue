// Declare missing module types
declare module "../models/PowerUpItem" {
  import { PowerUp } from "./utils/gameState";

  interface PowerUpItemProps {
    powerUp: PowerUp;
  }

  const PowerUpItem: React.FC<PowerUpItemProps>;
  export default PowerUpItem;
}

declare module "../models/Ground" {
  const Ground: React.FC;
  export default Ground;
}
