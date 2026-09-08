"use client";

import { FIELD_TYPE_LABELS, type FieldRule, type FieldType, type Schema } from "@/lib/validation";
import { PRESETS, presetById } from "@/lib/validation";

const TYPES: Array<FieldType | ""> = [
  "",
  "text",
  "integer",
  "number",
  "money",
  "date",
  "datetime",
  "boolean",
  "email",
  "iban",
  "tckn",
  "phone",
];

const cell =
  "border border-line bg-inset px-2 py-1 text-[12px] text-ink outline-none focus:border-line-strong rounded placeholder:text-faint/60";

export function SchemaEditor({
  columns,
  schema,
  onChange,
}: {
  columns: string[];
  schema: Schema;
  onChange: (s: Schema) => void;
}) {
  // veri kolonları + şemada olup veride olmayanlar
  const allColumns = [
    ...columns,
    ...schema.fields.map((f) => f.column).filter((c) => !columns.includes(c)),
  ];

  const ruleFor = (col: string): FieldRule =>
    schema.fields.find((f) => f.column === col) ?? { column: col };

  function update(col: string, patch: Partial<FieldRule>) {
    const idx = schema.fields.findIndex((f) => f.column === col);
    const next = [...schema.fields];
    const merged: FieldRule = { ...ruleFor(col), ...patch, column: col };
    // boş alanları temizle
    (Object.keys(merged) as Array<keyof FieldRule>).forEach((k) => {
      const v = merged[k];
      if (v === "" || v === undefined || v === false || (Array.isArray(v) && v.length === 0)) {
        if (k !== "column") delete merged[k];
      }
    });
    if (idx >= 0) next[idx] = merged;
    else next.push(merged);
    onChange({ ...schema, fields: next });
  }

  function applyPreset(col: string, presetId: string) {
    const p = presetById(presetId);
    if (!p) return;
    update(col, { ...p.rule });
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-line text-left font-mono text-[10px] uppercase tracking-wider text-faint">
            <th className="px-2 py-1.5">kolon</th>
            <th className="px-2 py-1.5">tip</th>
            <th className="px-2 py-1.5">zorunlu</th>
            <th className="px-2 py-1.5">benzersiz</th>
            <th className="px-2 py-1.5">min</th>
            <th className="px-2 py-1.5">max</th>
            <th className="px-2 py-1.5">izinli değerler</th>
            <th className="px-2 py-1.5">regex</th>
            <th className="px-2 py-1.5">tarih</th>
            <th className="px-2 py-1.5">hazır</th>
          </tr>
        </thead>
        <tbody>
          {allColumns.map((col) => {
            const r = ruleFor(col);
            const missing = !columns.includes(col);
            const isDate = r.type === "date" || r.type === "datetime";
            return (
              <tr key={col} className="border-b border-line/60 last:border-0">
                <td className="px-2 py-1.5 font-mono">
                  {col}
                  {missing && (
                    <span className="ml-1 text-[10px] text-amber-400" title="veride yok">
                      ⚠
                    </span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={r.type ?? ""}
                    onChange={(e) => update(col, { type: (e.target.value || undefined) as FieldType })}
                    className={cell}
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t === "" ? "—" : FIELD_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!r.required}
                    onChange={(e) => update(col, { required: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <input
                    type="checkbox"
                    checked={!!r.unique}
                    onChange={(e) => update(col, { unique: e.target.checked })}
                    className="accent-[var(--accent)]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.min ?? ""}
                    onChange={(e) => update(col, { min: e.target.value || undefined })}
                    className={`${cell} w-16`}
                    placeholder="—"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.max ?? ""}
                    onChange={(e) => update(col, { max: e.target.value || undefined })}
                    className={`${cell} w-16`}
                    placeholder="—"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.allowed?.join(", ") ?? ""}
                    onChange={(e) =>
                      update(col, {
                        allowed: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className={`${cell} w-40`}
                    placeholder="AKTIF, PASIF"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.pattern ?? ""}
                    onChange={(e) => update(col, { pattern: e.target.value || undefined })}
                    className={`${cell} w-32 font-mono`}
                    placeholder="^[A-Z]{3}$"
                  />
                </td>
                <td className="px-2 py-1.5">
                  {isDate ? (
                    <div className="flex items-center gap-1">
                      <select
                        value={r.dateFormat ?? "auto"}
                        onChange={(e) =>
                          update(col, { dateFormat: e.target.value as FieldRule["dateFormat"] })
                        }
                        className={cell}
                      >
                        <option value="auto">auto</option>
                        <option value="iso">ISO</option>
                        <option value="dd.mm.yyyy">dd.mm.yyyy</option>
                        <option value="dd/mm/yyyy">dd/mm/yyyy</option>
                      </select>
                      <label className="flex items-center gap-1 text-[10px] text-faint" title="gelecek tarih olamaz">
                        <input
                          type="checkbox"
                          checked={!!r.notFuture}
                          onChange={(e) => update(col, { notFuture: e.target.checked })}
                          className="accent-[var(--accent)]"
                        />
                        ≤bugün
                      </label>
                    </div>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) applyPreset(col, e.target.value);
                    }}
                    className={cell}
                  >
                    <option value="">uygula…</option>
                    {PRESETS.map((p) => (
                      <option key={p.id} value={p.id} title={p.description}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
