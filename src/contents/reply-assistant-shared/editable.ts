import type { EditableTarget } from "./types";

export const isVisible = (el: Element): boolean => {
  const htmlEl = el as HTMLElement;
  const style = window.getComputedStyle(htmlEl);
  return style.display !== "none" && style.visibility !== "hidden";
};

export const isContentEditableElement = (el: Element): el is HTMLElement => {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.isContentEditable ||
    el.hasAttribute("contenteditable") ||
    el.getAttribute("contenteditable") === "true" ||
    el.getAttribute("contenteditable") === "plaintext-only"
  );
};

export const setEditableText = (
  target: EditableTarget,
  value: string,
  options?: { resolveNested?: boolean },
): void => {
  let writableTarget: EditableTarget | null = null;

  if (target instanceof HTMLTextAreaElement) {
    writableTarget = target;
  } else {
    if (
      target.isContentEditable ||
      target.getAttribute("contenteditable") === "true" ||
      target.getAttribute("contenteditable") === "plaintext-only"
    ) {
      writableTarget = target;
    } else if (options?.resolveNested) {
      const nested = target.querySelector(
        "textarea, [contenteditable='true'], [contenteditable='plaintext-only'], [contenteditable]",
      );
      if (
        nested &&
        (nested instanceof HTMLTextAreaElement ||
          isContentEditableElement(nested))
      ) {
        writableTarget = nested;
      }
    }
  }

  if (!writableTarget) return;

  if (writableTarget instanceof HTMLTextAreaElement) {
    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )?.set;
    nativeSetter?.call(writableTarget, value);
    writableTarget.dispatchEvent(new Event("input", { bubbles: true }));
    writableTarget.dispatchEvent(new Event("change", { bubbles: true }));
    writableTarget.focus();
    return;
  }

  writableTarget.focus();

  let insertedByCommand = false;
  try {
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(writableTarget);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    insertedByCommand = document.execCommand("insertText", false, value);
  } catch {
    insertedByCommand = false;
  }

  if (!insertedByCommand) {
    writableTarget.textContent = value;
  }

  try {
    writableTarget.dispatchEvent(
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: value,
      }),
    );
  } catch {
    // Ignore InputEvent compatibility issues.
  }

  try {
    writableTarget.dispatchEvent(
      new InputEvent("input", {
        bubbles: true,
        inputType: "insertText",
        data: value,
      }),
    );
  } catch {
    writableTarget.dispatchEvent(new Event("input", { bubbles: true }));
  }

  writableTarget.dispatchEvent(new Event("change", { bubbles: true }));
};
