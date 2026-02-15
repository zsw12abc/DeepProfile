import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FloatingBall } from "./FloatingBall";

const themeState = {
  primary: "#00bcd4",
  secondary: "#00e5ff",
};

describe("FloatingBall", () => {
  it("renders with logo and vertical offset adjustment", () => {
    render(
      <FloatingBall
        ballPos={{ left: 20, top: 40 }}
        themeState={themeState}
        logoSrc="mock-logo.png"
        onPointerDown={vi.fn()}
        onMouseEnter={vi.fn()}
        onMouseLeave={vi.fn()}
        onError={vi.fn()}
      />,
    );

    const img = screen.getByAltText("DeepProfile");
    expect(img).toBeInTheDocument();
    expect(img).toHaveStyle({ transform: "translateY(2px)" });
  });
});
