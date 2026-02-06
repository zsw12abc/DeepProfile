import React from "react";

// Card component from options.tsx
export const Card: React.FC<{
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, children, icon }) => (
  <div
    style={{
      background:
        "linear-gradient(180deg, var(--theme-surface, #ffffff), var(--theme-background, #f5f7fb))",
      borderRadius: "var(--theme-border-radius-large, 16px)",
      padding: "28px",
      marginBottom: "24px",
      boxShadow:
        "var(--theme-shadow-medium, 0 10px 30px rgba(15, 23, 42, 0.12))",
      border: "1px solid var(--theme-border, #e2e8f0)",
      transition: "transform 0.3s ease, box-shadow 0.3s ease",
      backdropFilter: "blur(12px)",
    }}
  >
    <h2
      style={{
        fontSize: "var(--theme-font-size-large, 20px)",
        margin: "0 0 24px 0",
        color: "var(--theme-text, #1a1a1a)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontWeight: "600",
      }}
    >
      {icon && (
        <span
          style={{ display: "flex", alignItems: "center", marginRight: "10px" }}
        >
          {icon}
        </span>
      )}
      {title}
    </h2>
    {children}
  </div>
);

// InputGroup component from options.tsx
export const InputGroup: React.FC<{
  label: string;
  children: React.ReactNode;
  subLabel?: string;
}> = ({ label, children, subLabel }) => (
  <div style={{ marginBottom: "24px" }}>
    <label
      style={{
        display: "block",
        marginBottom: "10px",
        fontWeight: "600",
        color: "var(--theme-text, #2d3748)",
        fontSize: "var(--theme-font-size-medium, 15px)",
        letterSpacing: "0.02em",
        textTransform: "uppercase",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {label}
    </label>
    {children}
    {subLabel && (
      <div
        style={{
          fontSize: "13px",
          color: "var(--theme-text-secondary, #718096)",
          marginTop: "6px",
          lineHeight: "1.5",
        }}
      >
        {subLabel}
      </div>
    )}
  </div>
);
