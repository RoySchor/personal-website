export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Starts from rest, peaks a third of the way in, then coasts to a long gentle stop: like a
// push followed by momentum. Velocity is 12t(1-t)^2, so it never jumps on the first frame.
export function easePushAndCoast(t) {
  return 1 - Math.pow(1 - t, 3) * (1 + 3 * t);
}
