import { useCallback, useState } from "react";
import type React from "react";

interface UseFloatingBallStateOptions {
  storageKey: string;
  clampPos: (pos: { left: number; top: number }) => {
    left: number;
    top: number;
  };
  onToggleOpen: () => void;
  initialPos: { left: number; top: number };
  clampDuringDrag?: boolean;
}

export const useFloatingBallState = ({
  storageKey,
  clampPos,
  onToggleOpen,
  initialPos,
  clampDuringDrag = false,
}: UseFloatingBallStateOptions) => {
  const [ballPos, setBallPos] = useState(initialPos);

  const onBallPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const startX = event.clientX;
      const startY = event.clientY;
      const startLeft = ballPos.left;
      const startTop = ballPos.top;
      let dragging = false;

      const handleMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragging = true;

        const nextPos = {
          left: startLeft + dx,
          top: startTop + dy,
        };
        setBallPos(clampDuringDrag ? clampPos(nextPos) : nextPos);
      };

      const handleUp = async (upEvent: PointerEvent) => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);

        if (!dragging) {
          onToggleOpen();
          return;
        }

        const finalPos = clampPos({
          left: startLeft + (upEvent.clientX - startX),
          top: startTop + (upEvent.clientY - startY),
        });
        setBallPos(finalPos);
        try {
          await chrome.storage.local.set({ [storageKey]: finalPos });
        } catch {
          // Ignore persistence failures.
        }
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [
      ballPos.left,
      ballPos.top,
      clampDuringDrag,
      clampPos,
      onToggleOpen,
      storageKey,
    ],
  );

  return { ballPos, setBallPos, onBallPointerDown };
};
