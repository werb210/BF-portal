// BF_PORTAL_CALENDAR_CALL_v745 - the calendar event popup offers a Call button when the event names a
// phone number: booked calls carry it in the location ("Phone call - Boreal calls 5875551234") and the
// notes ("We will call you at ..."). Boreal's own (866) 631-8939 line is never offered.
const BOREAL_LINES = ["8666318939"];
const PHONE_RE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;

/** First callable 10-digit North American number in the given texts, as +1XXXXXXXXXX, or null. */
export function phoneFromEvent(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    if (!t) continue;
    for (const m of String(t).matchAll(PHONE_RE)) {
      let d = m[0].replace(/[^0-9]/g, "");
      if (d.length === 11 && d.startsWith("1")) d = d.slice(1);
      if (d.length !== 10 || BOREAL_LINES.includes(d)) continue;
      return "+1" + d;
    }
  }
  return null;
}

/** "(587) 555-1234" for a +1 number. */
export function prettyPhone(e164: string): string {
  const d = e164.replace(/[^0-9]/g, "").slice(-10);
  return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6);
}

// BF_PORTAL_JOIN_ROOM_v750 - the meeting room behind an event, from the join link the room writes into the event
// (".../api/meetings/join/<slug>"). Null when the event is not a Boreal meeting room.
const ROOM_RE = /\/api\/meetings\/join\/([A-Za-z0-9_-]{6,64})/;
export function roomSlugFromEvent(...texts: Array<string | null | undefined>): string | null {
  for (const t of texts) {
    const m = t ? ROOM_RE.exec(String(t)) : null;
    if (m) return m[1]!;
  }
  return null;
}
