import Phaser from "phaser";
import { generateAllTextures } from "../game/Textures";
import { WORLD_W, WORLD_H } from "../game/Constants";

// Nothing is fetched over the network here — every texture is drawn onto a
// canvas at boot time, so there is no loading screen and the app works
// offline. This scene exists only to do that drawing before GameScene reads
// the resulting texture keys.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create(): void {
    generateAllTextures(this, WORLD_W, WORLD_H);
    this.scene.start("game");
  }
}
