import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import MarkdownRenderer from "./MarkdownRenderer";
import React from "react";

describe("MarkdownRenderer", () => {
  it("should render headers correctly", () => {
    const content = "# Header 1\n## Header 2\n### Header 3";
    const { container } = render(<MarkdownRenderer content={content} />);

    const h1 = container.querySelector("h1");
    const h2 = container.querySelector("h2");
    const h3 = container.querySelector("h3");

    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe("Header 1");
    expect(h2).not.toBeNull();
    expect(h2?.textContent).toBe("Header 2");
    expect(h3).not.toBeNull();
    expect(h3?.textContent).toBe("Header 3");
  });

  it("should render bold text correctly", () => {
    const content = "This is **bold** text";
    const { container } = render(<MarkdownRenderer content={content} />);

    const strong = container.querySelector("strong");
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe("bold");
  });

  it("should render code blocks correctly", () => {
    const content = "This is `code` text";
    const { container } = render(<MarkdownRenderer content={content} />);

    const code = container.querySelector("code");
    expect(code).not.toBeNull();
    expect(code?.textContent).toBe("code");
  });

  it("should render unordered lists correctly", () => {
    const content = "* Item 1\n* Item 2";
    const { container } = render(<MarkdownRenderer content={content} />);

    const ul = container.querySelector("ul");
    const lis = container.querySelectorAll("li");

    expect(ul).not.toBeNull();
    expect(lis.length).toBe(2);
    expect(lis[0].textContent).toContain("Item 1");
    expect(lis[1].textContent).toContain("Item 2");
  });

  it("should handle empty content gracefully", () => {
    const { container } = render(<MarkdownRenderer content="" />);
    expect(container.textContent).toBe("");
  });

  it("should handle null content gracefully", () => {
    // @ts-expect-error - Testing runtime behavior with invalid props
    const { container } = render(<MarkdownRenderer content={null} />);
    expect(container.textContent).toBe("");
  });
});
