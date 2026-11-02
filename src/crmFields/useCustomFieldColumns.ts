// BF_PORTAL_v870_CRM_DATA_MODEL - custom fields as optional list columns. They start hidden (a brokerage may have dozens);
// each person picks the ones they want from Columns, remembered on this device per record type.
import { useCallback, useMemo, useState } from "react";
import { useCustomFields, type CustomField, type ObjectType } from "./customFieldsApi";

const PREFIX = "cfcol:";

function readShown(object: ObjectType): Set<string> {
  try {
    const raw = localStorage.getItem(`crm.${object}.cfColumns`);
    const list = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(list) ? list.map(String) : []);
  } catch {
    return new Set();
  }
}

export function useCustomFieldColumns(object: ObjectType) {
  const { fields } = useCustomFields(object);
  const [shownNames, setShownNames] = useState<Set<string>>(() => readShown(object));

  const toggle = useCallback((key: string) => {
    const name = key.slice(PREFIX.length);
    setShownNames((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      try { localStorage.setItem(`crm.${object}.cfColumns`, JSON.stringify([...next])); } catch { /* private mode */ }
      return next;
    });
  }, [object]);

  const shown: CustomField[] = useMemo(() => fields.filter((f) => shownNames.has(f.name)), [fields, shownNames]);
  const columnOptions = useMemo(() => fields.map((f) => ({ key: `${PREFIX}${f.name}`, label: f.label })), [fields]);
  /** The built-in hidden set plus every custom column not chosen. */
  const hiddenWith = useCallback((builtIn: Set<string>) => {
    const out = new Set(builtIn);
    for (const f of fields) if (!shownNames.has(f.name)) out.add(`${PREFIX}${f.name}`);
    return out;
  }, [fields, shownNames]);
  const isCfKey = (key: string) => key.startsWith(PREFIX);

  return { fields, shown, columnOptions, hiddenWith, toggle, isCfKey };
}
