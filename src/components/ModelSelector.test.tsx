import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelSelector } from "./ModelSelector";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../services/I18nService", () => ({
  I18nService: {
    t: (key: string) => {
      const translations: Record<string, string> = {
        loading: "Loading...",
        model_select: "Select Model",
      };
      return translations[key] || key;
    },
  },
}));

describe("ModelSelector", () => {
  const mockConfig = {
    selectedProvider: "openai",
    customModelNames: {
      openai: "gpt-4",
    },
  };
  const mockSetConfig = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state", () => {
    render(
      <ModelSelector
        isLoadingModels={true}
        models={[]}
        modelError={null}
        config={mockConfig}
        setConfig={mockSetConfig}
      />,
    );

    expect(screen.getByText(/Loading.../)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("手动输入模型名称 (如 gpt-4o)"),
    ).not.toBeInTheDocument();
  });

  it("renders dropdown when models are available", () => {
    const models = ["gpt-3.5-turbo", "gpt-4"];
    render(
      <ModelSelector
        isLoadingModels={false}
        models={models}
        modelError={null}
        config={mockConfig}
        setConfig={mockSetConfig}
      />,
    );

    const select = screen.getByRole("combobox");
    expect(select).toBeInTheDocument();
    expect(select).toHaveValue("gpt-4");

    expect(screen.getByText("-- Select Model --")).toBeInTheDocument();
    expect(screen.getByText("gpt-3.5-turbo")).toBeInTheDocument();
    expect(screen.getByText("gpt-4")).toBeInTheDocument();
  });

  it("calls setConfig when model is selected", () => {
    const models = ["gpt-3.5-turbo", "gpt-4"];
    render(
      <ModelSelector
        isLoadingModels={false}
        models={models}
        modelError={null}
        config={mockConfig}
        setConfig={mockSetConfig}
      />,
    );

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "gpt-3.5-turbo" } });

    expect(mockSetConfig).toHaveBeenCalledWith({
      ...mockConfig,
      customModelNames: {
        ...mockConfig.customModelNames,
        openai: "gpt-3.5-turbo",
      },
    });
  });

  it("renders text input when no models are available", () => {
    render(
      <ModelSelector
        isLoadingModels={false}
        models={[]}
        modelError={null}
        config={mockConfig}
        setConfig={mockSetConfig}
      />,
    );

    const input = screen.getByPlaceholderText("手动输入模型名称 (如 gpt-4o)");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("gpt-4");
  });

  it("calls setConfig when text input changes", () => {
    render(
      <ModelSelector
        isLoadingModels={false}
        models={[]}
        modelError={null}
        config={mockConfig}
        setConfig={mockSetConfig}
      />,
    );

    const input = screen.getByPlaceholderText("手动输入模型名称 (如 gpt-4o)");
    fireEvent.change(input, { target: { value: "gpt-5" } });

    expect(mockSetConfig).toHaveBeenCalledWith({
      ...mockConfig,
      customModelNames: {
        ...mockConfig.customModelNames,
        openai: "gpt-5",
      },
    });
  });

  it("falls back to empty value when provider has no saved model", () => {
    const configWithoutProviderModel = {
      selectedProvider: "gemini",
      customModelNames: {
        openai: "gpt-4",
      },
    };

    render(
      <ModelSelector
        isLoadingModels={false}
        models={["gemini-1.5-pro"]}
        modelError={null}
        config={configWithoutProviderModel}
        setConfig={mockSetConfig}
      />,
    );

    expect(screen.getByRole("combobox")).toHaveValue("");
  });

  it("handles missing customModelNames in config", () => {
    const configWithoutCustomNames = {
      selectedProvider: "openai",
    };

    render(
      <ModelSelector
        isLoadingModels={false}
        models={[]}
        modelError={null}
        config={configWithoutCustomNames as any}
        setConfig={mockSetConfig}
      />,
    );

    const input = screen.getByPlaceholderText("手动输入模型名称 (如 gpt-4o)");
    fireEvent.change(input, { target: { value: "gpt-4o-mini" } });

    expect(mockSetConfig).toHaveBeenCalledWith({
      ...configWithoutCustomNames,
      customModelNames: {
        openai: "gpt-4o-mini",
      },
    });
  });

  it("displays error message when modelError is present", () => {
    const errorMessage = "Failed to fetch models";
    render(
      <ModelSelector
        isLoadingModels={false}
        models={[]}
        modelError={errorMessage}
        config={mockConfig}
        setConfig={mockSetConfig}
      />,
    );

    expect(screen.getByText(`⚠️ ${errorMessage}`)).toBeInTheDocument();
  });
});
