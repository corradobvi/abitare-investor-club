// Date mostrate sempre in timezone Europe/Rome, formato italiano.

const GIORNO_MESE = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit" });
const DATA = new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" });
const DATA_ORA = new Intl.DateTimeFormat("it-IT", {
  timeZone: "Europe/Rome",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// "13/10"
export function giornoMese(d: Date | string): string {
  return GIORNO_MESE.format(new Date(d));
}

// "13/10/2026"
export function data(d: Date | string): string {
  return DATA.format(new Date(d));
}

// "13/10/2026, 14:05"
export function dataOra(d: Date | string): string {
  return DATA_ORA.format(new Date(d));
}
