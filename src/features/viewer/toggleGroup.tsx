
function ToggleGroup({ 
  options, 
  value, 
  onChange 
}: { 
  options: string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div style={{height:30, display: "inline-flex", border: "0.5px solid #ccc", borderRadius: 999, overflow: "hidden", background: "#f0f0f0" }}>
      {options.map((option, i) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          style={{
            border: "none",
            borderLeft: i === 0 ? "none" : "0.5px solid #ccc",
            background: value === option ? "white" : "transparent",
            cursor: "pointer",
            fontWeight: value === option ? 500 : 400,
          }}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default ToggleGroup;