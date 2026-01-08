import React from "react";

// Card component from options.tsx
export const Card: React.FC<{ title: string; children: React.ReactNode; icon?: React.ReactNode }> = ({ title, children, icon }) => (
  <div style={{
    backgroundColor: "white",
    borderRadius: "16px",
    padding: "28px",
    marginBottom: "24px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
    border: "1px solid #f0f0f0",
    transition: "transform 0.3s ease, box-shadow 0.3s ease"
  }}>
    <h2 style={{ 
        fontSize: "20px", 
        margin: "0 0 24px 0", 
        color: "#1a1a1a",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        fontWeight: "600"
    }}>
        {icon && <span style={{ display: "flex", alignItems: "center", marginRight: "10px" }}>{icon}</span>}
        {title}
    </h2>
    {children}
  </div>
);

// InputGroup component from options.tsx
export const InputGroup: React.FC<{ label: string; children: React.ReactNode; subLabel?: string }> = ({ label, children, subLabel }) => (
    <div style={{ marginBottom: "24px" }}>
        <label style={{ 
          display: "block", 
          marginBottom: "10px", 
          fontWeight: "600", 
          color: "#2d3748", 
          fontSize: "15px",
          alignItems: "center",
          gap: "6px"
        }}>
            {label}
        </label>
        {children}
        {subLabel && <div style={{ fontSize: "13px", color: "#718096", marginTop: "6px", lineHeight: "1.5" }}>{subLabel}</div>}
    </div>
);