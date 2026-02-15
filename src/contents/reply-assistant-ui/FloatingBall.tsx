import React from "react";
import { FLOATING_BALL_SIZE, colorWithAlpha } from "./utils";

interface FloatingBallProps {
  ballPos: { left: number; top: number };
  themeState: any;
  logoSrc: string;
  onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => void;
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onError: () => void;
}

export const FloatingBall: React.FC<FloatingBallProps> = ({
  ballPos,
  themeState,
  logoSrc,
  onPointerDown,
  onMouseEnter,
  onMouseLeave,
  onError,
}) => {
  return (
    <button
      onPointerDown={onPointerDown}
      title="DeepProfile Reply Assistant (Draggable)"
      style={{
        position: "fixed",
        left: ballPos.left,
        top: ballPos.top,
        zIndex: 2147483646,
        width: FLOATING_BALL_SIZE,
        height: FLOATING_BALL_SIZE,
        borderRadius: 12,
        border: "none",
        background: `linear-gradient(135deg, ${themeState.primary}, ${themeState.secondary})`,
        boxShadow: `0 8px 20px ${colorWithAlpha(themeState.primary, 0.4)}`,
        cursor: "grab",
        userSelect: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 0,
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <img
        src={logoSrc}
        alt="DeepProfile"
        onError={onError}
        style={{
          width: 26,
          height: 26,
          objectFit: "contain",
          pointerEvents: "none",
        }}
      />
    </button>
  );
};
