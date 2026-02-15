export interface Point {
  left: number;
  top: number;
}

export interface Size {
  width: number;
  height: number;
}

export function clampFloatingBallPos(
  pos: Point,
  viewport: Size,
  ballSize: number,
  margin: number,
): Point {
  return {
    left: Math.min(
      Math.max(margin, pos.left),
      Math.max(margin, viewport.width - ballSize - margin),
    ),
    top: Math.min(
      Math.max(margin, pos.top),
      Math.max(margin, viewport.height - ballSize - margin),
    ),
  };
}

export function computeFloatingPanelPosition(
  ballPos: Point,
  viewport: Size,
  panel: Size,
  ballSize: number,
  gap: number,
  margin: number,
): Point {
  const spaceRight = viewport.width - (ballPos.left + ballSize + gap) - margin;
  const spaceLeft = ballPos.left - gap - margin;

  const placeRight =
    spaceRight >= panel.width || (spaceRight >= spaceLeft && spaceRight > 120);

  const leftRaw = placeRight
    ? ballPos.left + ballSize + gap
    : ballPos.left - panel.width - gap;

  const left = Math.min(
    Math.max(margin, leftRaw),
    Math.max(margin, viewport.width - panel.width - margin),
  );

  const preferredTop = ballPos.top - 6;
  const spaceBelow = viewport.height - preferredTop - margin;
  const canPlaceBelow = spaceBelow >= panel.height;
  const aboveTop = ballPos.top + ballSize - panel.height;

  const topRaw = canPlaceBelow
    ? preferredTop
    : aboveTop >= margin
      ? aboveTop
      : preferredTop;

  const top = Math.min(
    Math.max(margin, topRaw),
    Math.max(margin, viewport.height - panel.height - margin),
  );

  return { left, top };
}

export function isDarkThemeId(themeId?: string): boolean {
  const id = (themeId || "").toLowerCase();
  return id.includes("night") || id.includes("black") || id.includes("dark");
}
