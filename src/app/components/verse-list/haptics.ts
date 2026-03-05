import { triggerHaptic, type HapticStyle } from "@/app/lib/haptics";

export type { HapticStyle };

export function haptic(style: HapticStyle) {
  triggerHaptic(style);
}
