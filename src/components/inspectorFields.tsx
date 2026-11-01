import Field from "./field";

export type InspectorFieldDefinition =
  | { key: string; label: string; type: "text" | "textarea" | "color" | "number" | "checkbox" | "readonly"; defaultValue?: unknown; step?: number; min?: number; suffix?: string; placeholder?: string }
  | { key: string; label: string; type: "select"; options: string[]; defaultValue?: unknown; optionLabels?: Record<string, string>; allowCustom?: boolean; placeholder?: string };

export type InspectorSchema = {
  title: string;
  fields: InspectorFieldDefinition[];
};

export function InspectorFields({
  schema,
  data,
  onChange,
}: {
  schema: InspectorSchema;
  data: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div style={{ marginTop: 12 }}>
      <strong style={{ fontSize: 13 }}>{schema.title}</strong>
      {schema.fields.map((field) => {
        const value = data[field.key];
        if (field.type === "readonly") {
          return (
            <Field key={field.key} label={field.label}>
              <input className="field" value={`${String(value ?? field.defaultValue ?? 0)}${field.suffix ?? ""}`} readOnly />
            </Field>
          );
        }
        if (field.type === "textarea") {
          return (
            <Field key={field.key} label={field.label}>
              <textarea className="field" style={{ height: 80, padding: 8, resize: "vertical" }} value={String(value ?? field.defaultValue ?? "")} onChange={(event) => onChange(field.key, event.target.value)} />
            </Field>
          );
        }
        if (field.type === "checkbox") {
          return (
            <Field key={field.key} label={field.label}>
              <input type="checkbox" checked={Boolean(value ?? field.defaultValue ?? false)} onChange={(event) => onChange(field.key, event.target.checked)} />
            </Field>
          );
        }
        if (field.type === "select") {
          const currentValue = String(value ?? field.defaultValue ?? "");
          const isCustom = field.allowCustom && !field.options.includes(currentValue);
          return (
            <Field key={field.key} label={field.label}>
              <select className="field" value={isCustom ? "__custom__" : currentValue} onChange={(event) => onChange(field.key, event.target.value === "__custom__" ? "" : event.target.value)}>
                {field.options.map((option) => <option key={option} value={option}>{field.optionLabels?.[option] ?? option}</option>)}
                {field.allowCustom && <option value="__custom__">Other...</option>}
              </select>
              {isCustom && (
                <input className="field" style={{ marginTop: 4 }} placeholder={field.placeholder ?? "Custom value"} value={currentValue} onChange={(event) => onChange(field.key, event.target.value)} />
              )}
            </Field>
          );
        }
        if (field.type === "number") {
          return (
            <Field key={field.key} label={field.label}>
              <input className="field" type="number" step={field.step} min={field.min} value={Number(value ?? field.defaultValue ?? 0)} onChange={(event) => onChange(field.key, Number(event.target.value))} />
            </Field>
          );
        }
        return (
          <Field key={field.key} label={field.label}>
            <input className="field" type={field.type} placeholder={field.placeholder} value={String(value ?? field.defaultValue ?? (field.type === "color" ? "#ffffff" : ""))} onChange={(event) => onChange(field.key, event.target.value)} />
          </Field>
        );
      })}
    </div>
  );
}
