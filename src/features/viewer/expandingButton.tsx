import { useState, Children } from "react";

export function ExpandingButton({children,width=300, onOpenChange}: {children: React.ReactNode; width?:number, onOpenChange?: (open: boolean) => void;}) {
  const [open, setOpen] = useState(false);
  const items = Children.toArray(children);
  const handleToggle = () =>{
    setOpen(!open);
    onOpenChange?.(!open);
  }

  return (
    <div
      style={{
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        border: "0.5px solid #ccc",
        borderRadius: 999,
        overflow: "hidden",
        background: "white",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <button
        onClick={handleToggle}
        aria-expanded={open}
        aria-label={open ? "Close actions" : "Open actions"}
        style={{
          width: 30,
          height: 30,
          border: "none",
          background: "transparent",
          borderRadius: 999,
          overflow: "hidden",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 15,
          transition: "transform 0.25s cubic-bezier(0.4,0,0.2,1)",
          transform: open ? "rotate(0deg)" : "rotate(-135deg)",
        }}
      >
        ✏️
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          maxWidth: open ? width : 0,
          height: 30,
          overflow: "hidden",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition:
            "max-width 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease",
        }}
      >
        {items.map((child, i) => (
          <div key={i} style={{ display: "contents" }}>
            <div
              style={{
                width: 0.5,
                background: "#ccc",
                height: 30,
                flexShrink: 0,
              }}
            />
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ExpandingButton