/** Jembatan input antara HUD (DOM: joystick, tombol aksi) dan scene Phaser. */
export const controls = {
  joy: { x: 0, y: 0 },
  act: () => {},
  /** Pemain sedang berdiri di area ladang (hotbar alat hanya tampil di sini). */
  inFarm: false,
  onFarmChange: () => {},
  setInFarm(v: boolean) {
    if (v === this.inFarm) return;
    this.inFarm = v;
    this.onFarmChange();
  },
};
