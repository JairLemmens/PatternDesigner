import React from "react";



export function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontFamily: "monospace", fontSize: 12, color: "#111", wordBreak: "break-all" }}>
        {value}
      </div>
    </div>
  );
}

export function btnStyle(bg: string, color: string, border = "none"): React.CSSProperties {
  return { height: 32, padding: "0 12px", background: bg, color, border, borderRadius: 4, fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 };
}

