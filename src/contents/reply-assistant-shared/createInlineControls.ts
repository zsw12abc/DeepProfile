import type { ThemeState } from "./types";

interface CreateInlineControlsParams {
  toneOptions: readonly string[];
  tone: string;
  classes: {
    container: string;
    toneSelect: string;
    replyBtn: string;
  };
  style: {
    container: string;
    toneSelect: string;
    replyBtn: string;
  };
  buttonText: string;
  loadingText: string;
  onToneChange: (tone: string) => Promise<void> | void;
  onGenerate: () => Promise<void> | void;
  stopPropagationOnSelect?: boolean;
}

export const createInlineControls = ({
  toneOptions,
  tone,
  classes,
  style,
  buttonText,
  loadingText,
  onToneChange,
  onGenerate,
  stopPropagationOnSelect = false,
}: CreateInlineControlsParams) => {
  const container = document.createElement("div");
  container.className = classes.container;
  container.style.cssText = style.container;

  const toneSelect = document.createElement("select");
  toneSelect.className = classes.toneSelect;
  toneSelect.style.cssText = style.toneSelect;

  toneOptions.forEach((item) => {
    const option = document.createElement("option");
    option.value = item;
    option.textContent = item;
    toneSelect.appendChild(option);
  });
  toneSelect.value = tone;

  if (stopPropagationOnSelect) {
    toneSelect.onmousedown = (event) => event.stopPropagation();
    toneSelect.onclick = (event) => event.stopPropagation();
  }

  toneSelect.onchange = async (event) => {
    if (stopPropagationOnSelect) event.stopPropagation();
    await onToneChange((event.target as HTMLSelectElement).value);
  };

  const aiBtn = document.createElement("button");
  aiBtn.textContent = buttonText;
  aiBtn.className = classes.replyBtn;
  aiBtn.style.cssText = style.replyBtn;

  const setLoading = (loading: boolean) => {
    aiBtn.disabled = loading;
    aiBtn.textContent = loading ? loadingText : buttonText;
    aiBtn.style.opacity = loading ? "0.75" : "1";
    aiBtn.style.cursor = loading ? "not-allowed" : "pointer";
  };

  aiBtn.onclick = async (event) => {
    event.preventDefault();
    if (stopPropagationOnSelect) {
      event.stopPropagation();
    }
    setLoading(true);
    try {
      await onGenerate();
    } finally {
      setLoading(false);
    }
  };

  container.appendChild(toneSelect);
  container.appendChild(aiBtn);

  return {
    container,
    toneSelect,
    aiBtn,
    setLoading,
    setTone: (nextTone: string) => {
      toneSelect.value = nextTone;
    },
    applyTheme: (nextTheme: ThemeState) => {
      toneSelect.style.color = nextTheme.text;
      aiBtn.style.color = nextTheme.primary;
    },
  };
};
