export function Field({ label, children }: { label: string; children: React.ReactNode}) {
  return (
    <label style={{ display: "block", marginTop: 12 }}>
      <span style={{ fontSize: 10, fontFamily: "monospace", color: "#888", textTransform: "uppercase", letterSpacing: 1 }}>{label}</span>
      <div style={{ marginTop: 4, marginRight: 4 }}>{children}</div>
    </label>
  );
}

export default Field;