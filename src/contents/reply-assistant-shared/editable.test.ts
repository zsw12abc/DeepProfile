import { describe, expect, it } from "vitest";
import { setEditableText } from "./editable";

describe("editable", () => {
  it("writes text to textarea", () => {
    const textarea = document.createElement("textarea");
    setEditableText(textarea, "hello");
    expect(textarea.value).toBe("hello");
  });

  it("writes text to contenteditable element", () => {
    const div = document.createElement("div");
    div.setAttribute("contenteditable", "true");
    setEditableText(div, "content");
    expect(div.textContent).toBe("content");
  });

  it("resolves nested editable element when enabled", () => {
    const wrapper = document.createElement("div");
    const nested = document.createElement("div");
    nested.setAttribute("contenteditable", "true");
    wrapper.appendChild(nested);

    setEditableText(wrapper, "nested text", { resolveNested: true });
    expect(nested.textContent).toBe("nested text");
  });
});
