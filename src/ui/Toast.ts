import Phaser from "phaser";
import { WORLD_W } from "../game/Constants";
import { TEXT_STYLE } from "./BottomSheet";

/** A short-lived message that fades in, holds, then fades up and out. */
export function showToast(scene: Phaser.Scene, text: string, y: number, color = "#f4f1de"): void {
  const t = scene.add
    .text(WORLD_W / 2, y + 10, text, { ...TEXT_STYLE, fontSize: "13px", color })
    .setOrigin(0.5)
    .setAlpha(0)
    .setDepth(70);
  scene.tweens.add({
    targets: t,
    alpha: 1,
    y: y,
    duration: 180,
    ease: "Sine.Out",
    onComplete: () => {
      scene.time.delayedCall(650, () => {
        scene.tweens.add({ targets: t, alpha: 0, y: y - 10, duration: 250, onComplete: () => t.destroy() });
      });
    },
  });
}
