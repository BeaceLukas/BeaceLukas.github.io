import React, { useEffect, useMemo, useState } from "react";

type Kuendigungsart = "ordentlich" | "ausserordentlich";
type OrdGrund = "" | "personenbedingt" | "verhaltensbedingt" | "betriebsbedingt";
type JaNein = "ja" | "nein";
type WichtigerGrund = "" | "diebstahl" | "betrug" | "koerperverletzung" | "schwere-beleidigung" | "sonstiger";
type StatusClass = "ok" | "warn" | "bad";
type Geschlecht = "" | "maennlich" | "weiblich" | "divers";

type FormState = {
  firma: string;
  arbeitgeber: string;
  mitarbeiterVorname: string;
  mitarbeiterNachname: string;
  geschlecht: Geschlecht;
  adresseStrasse: string;
  adressePlz: string;
  adresseOrt: string;
  eintritt: string;
  heute: string;
  mitarbeiterzahl: string;
  kuendigungsart: Kuendigungsart;
  schwanger: boolean;
  elternzeit: boolean;
  schwerbehindert: boolean;
  azubi: boolean;
  betriebsratMitglied: boolean;
  hatBetriebsrat: JaNein;
  ordGrund: OrdGrund;
  kuendigungstermin: string;
  abmahnung: JaNein;
  betriebsratAnhoerung: JaNein;
  wichtigerGrund: WichtigerGrund;
  begruendung: string;
};

type ErgebnisState = {
  kuendbar: boolean;
  statusClass: StatusClass;
  statusText: string;
  gruende: string[];
  warnungen: string[];
  kuendigungsart: Kuendigungsart;
};

/* ── Hilfsfunktionen ── */

function formatDate(dateString: string): string {
  if (!dateString) return "__________";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "__________";
  return d.toLocaleDateString("de-DE");
}

function formatDateObj(date: Date): string {
  if (Number.isNaN(date.getTime())) return "__________";
  return date.toLocaleDateString("de-DE");
}

function monthsBetween(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  return months;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function getKuendigungsfristInfo(eintritt: string, pruefdatum: string): { minDate: Date; text: string } | null {
  const entry = new Date(eintritt);
  const review = new Date(pruefdatum);
  if (Number.isNaN(entry.getTime()) || Number.isNaN(review.getTime())) return null;

  const monthsInCompany = monthsBetween(eintritt, pruefdatum);
  const yearsInCompany = Math.max(0, monthsInCompany / 12);

  if (yearsInCompany < 2) {
    return {
      minDate: addDays(review, 28),
      text: "Mindestens 4 Wochen (28 Tage) zum 15. oder Monatsende (§622 Abs. 1 BGB).",
    };
  }

  let requiredMonths = 1;
  if (yearsInCompany >= 20) requiredMonths = 7;
  else if (yearsInCompany >= 15) requiredMonths = 6;
  else if (yearsInCompany >= 12) requiredMonths = 5;
  else if (yearsInCompany >= 10) requiredMonths = 4;
  else if (yearsInCompany >= 8) requiredMonths = 3;
  else if (yearsInCompany >= 5) requiredMonths = 2;

  const minDate = endOfMonth(addMonths(review, requiredMonths));
  return {
    minDate,
    text: `Mindestens ${requiredMonths} Monat(e) zum Monatsende (§622 Abs. 2 BGB).`,
  };
}

function isLastDayOfMonth(date: Date): boolean {
  return date.getDate() === endOfMonth(date).getDate();
}

function humanizeWichtigerGrund(value: WichtigerGrund): string {
  switch (value) {
    case "diebstahl": return "Diebstahl";
    case "betrug": return "Betrug";
    case "koerperverletzung": return "Körperverletzung";
    case "schwere-beleidigung": return "schwere Beleidigung";
    case "sonstiger": return "sonstigen wichtigen Grund";
    default: return "wichtigen Grund";
  }
}

function buildEmpfaengerName(vorname: string, nachname: string): string {
  return [vorname, nachname].filter(Boolean).join(" ") || "Mitarbeiter";
}

function buildAnrede(geschlecht: Geschlecht, nachname: string): string {
  const safeNachname = nachname || "Mitarbeiter";
  if (geschlecht === "weiblich") return `Sehr geehrte Frau ${safeNachname},`;
  if (geschlecht === "maennlich") return `Sehr geehrter Herr ${safeNachname},`;
  return `Guten Tag ${safeNachname},`;
}

function buildEmpfaengerAdresse(strasse: string, plz: string, ort: string): string {
  const line2 = [plz, ort].filter(Boolean).join(" ");
  return [strasse || "Straße", line2 || "PLZ Ort"].join("\n");
}

function erstelleBrief(data: {
  firma: string;
  arbeitgeber: string;
  mitarbeiterVorname: string;
  mitarbeiterNachname: string;
  geschlecht: Geschlecht;
  adresseStrasse: string;
  adressePlz: string;
  adresseOrt: string;
  heute: string;
  kuendigungstermin: string;
  kuendigungsart: Kuendigungsart;
  ordGrund: OrdGrund;
  wichtigerGrund: WichtigerGrund;
  begruendung: string;
  kuendbar: boolean;
}): string {
  const {
    firma, arbeitgeber, mitarbeiterVorname, mitarbeiterNachname, geschlecht,
    adresseStrasse, adressePlz, adresseOrt, heute, kuendigungstermin,
    kuendigungsart, ordGrund, wichtigerGrund, begruendung, kuendbar,
  } = data;

  if (!kuendbar) {
    return `Auf Basis der eingegebenen Daten sollte derzeit kein automatisches Kündigungsschreiben verwendet werden.

Grund:
Die Prüfung hat ergeben, dass rechtliche Risiken oder formelle Mängel vorliegen.

Empfehlung:
Vor Ausspruch der Kündigung rechtliche Prüfung durchführen und fehlende Voraussetzungen ergänzen.`;
  }

  const empfaengerName = buildEmpfaengerName(mitarbeiterVorname, mitarbeiterNachname);
  const empfaengerAdresse = buildEmpfaengerAdresse(adresseStrasse, adressePlz, adresseOrt);
  const anrede = buildAnrede(geschlecht, mitarbeiterNachname);
  const betreff = "Kündigung des Arbeitsverhältnisses";

  let haupttext = "";
  if (kuendigungsart === "ordentlich") {
    const grundText = ordGrund ? `aus ${ordGrund}en Gründen` : "aus betrieblichen Gründen";
    haupttext = `${anrede}

hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis ordentlich und fristgerecht ${grundText} zum ${formatDate(kuendigungstermin)}.

Bitte melden Sie sich unverzüglich bei der Agentur für Arbeit arbeitssuchend, um Nachteile zu vermeiden.

Wir bitten Sie, alle Ihnen überlassenen Arbeitsmittel spätestens bis zum Beendigungsdatum zurückzugeben.

Mit freundlichen Grüßen

${arbeitgeber || "________________________"}
${firma || "Proximus AG"}`;
  } else {
    haupttext = `${anrede}

hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis außerordentlich und fristlos wegen ${humanizeWichtigerGrund(wichtigerGrund)} mit sofortiger Wirkung.

Begründung:
${begruendung || "Ein wichtiger Grund liegt vor."}

Hilfsweise kündigen wir das Arbeitsverhältnis ordentlich zum nächstmöglichen Termin.

Bitte geben Sie sämtliche Arbeitsmittel unverzüglich zurück.

Mit freundlichen Grüßen

${arbeitgeber || "________________________"}
${firma || "Proximus AG"}`;
  }

  return `${firma || "Proximus AG"}
${arbeitgeber || "Arbeitgeber"}
${formatDate(heute)}

An
${empfaengerName}
${empfaengerAdresse}

Betreff: ${betreff}

${haupttext}`;
}

/* ── Stepper-Konfiguration ── */

const STEPS = [
  { id: "grunddaten", label: "Grunddaten" },
  { id: "schutz", label: "Sonderschutz" },
  { id: "kuendigung", label: "Kündigungsdetails" },
  { id: "ergebnis", label: "Ergebnis" },
] as const;

/* ── Hauptkomponente ── */

export default function App() {
  const todayIso = new Date().toISOString().split("T")[0];
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>({
    firma: "Proximus AG",
    arbeitgeber: "",
    mitarbeiterVorname: "",
    mitarbeiterNachname: "",
    geschlecht: "",
    adresseStrasse: "",
    adressePlz: "",
    adresseOrt: "",
    eintritt: "",
    heute: todayIso,
    mitarbeiterzahl: "",
    kuendigungsart: "ordentlich",
    schwanger: false,
    elternzeit: false,
    schwerbehindert: false,
    azubi: false,
    betriebsratMitglied: false,
    hatBetriebsrat: "nein",
    ordGrund: "",
    kuendigungstermin: "",
    abmahnung: "nein",
    betriebsratAnhoerung: "nein",
    wichtigerGrund: "",
    begruendung: "",
  });

  const [ergebnis, setErgebnis] = useState<ErgebnisState | null>(null);
  const [brief, setBrief] = useState<string>("Hier erscheint nach der Prüfung das Kündigungsschreiben.");
  const [pdfStatus, setPdfStatus] = useState<string>("");

  const styles = `
    * { box-sizing: border-box; font-family: 'Segoe UI', Arial, Helvetica, sans-serif; }
    :root {
      --bg: #f5f7fa; --card: #ffffff; --text: #1f2937; --muted: #64748b; --primary: #12b8c9;
      --primary-dark: #0f9cab; --primary-soft: #ecfeff; --ok-bg: #ecfdf5; --ok-border: #10b981;
      --ok-text: #065f46; --warn-bg: #fff7ed; --warn-border: #f59e0b; --warn-text: #9a3412;
      --bad-bg: #fef2f2; --bad-border: #ef4444; --bad-text: #991b1b;
    }
    body { margin: 0; background: var(--bg); color: var(--text); }
    .page { min-height: 100vh; background: var(--bg); }
    header { background: linear-gradient(135deg, #12b8c9, #0ea5b7); color: white; padding: 32px 20px; text-align: center; }
    header h1 { margin: 0 0 8px; font-size: 1.8rem; }
    header p { margin: 0; font-size: 0.95rem; opacity: 0.95; }
    .container { max-width: 1200px; margin: 24px auto; padding: 0 20px 40px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); gap: 24px; }
    .card { background: var(--card); border-radius: 16px; box-shadow: 0 4px 16px rgba(0,0,0,0.06); padding: 24px; }
    .card h2 { margin-top: 0; font-size: 1.25rem; color: #0f172a; }

    /* Stepper */
    .stepper { display: flex; gap: 0; margin-bottom: 24px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
    .stepper-step { flex: 1; padding: 12px 8px; text-align: center; font-size: 0.85rem; font-weight: 600; background: #f8fafc; color: var(--muted); cursor: pointer; transition: all 0.2s; border-right: 1px solid #e2e8f0; position: relative; }
    .stepper-step:last-child { border-right: none; }
    .stepper-step.active { background: var(--primary); color: white; }
    .stepper-step.done { background: var(--primary-soft); color: #0e7490; }
    .stepper-step:hover:not(.active) { background: #eef2f7; }
    .step-num { display: inline-block; width: 22px; height: 22px; line-height: 22px; border-radius: 50%; background: #cbd5e1; color: white; font-size: 0.75rem; margin-right: 6px; }
    .stepper-step.active .step-num { background: rgba(255,255,255,0.3); }
    .stepper-step.done .step-num { background: #10b981; }

    /* Info-Boxen */
    .info-hint { background: #f0f9ff; border: 1px solid #bae6fd; border-left: 4px solid var(--primary); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; font-size: 0.88rem; color: #0c4a6e; line-height: 1.5; }
    .info-hint strong { color: #0e7490; }
    .info-hint p { margin: 0 0 6px; }
    .info-hint p:last-child { margin-bottom: 0; }

    /* Formular */
    .section-title { margin: 20px 0 10px; padding-bottom: 6px; border-bottom: 2px solid #e5e7eb; color: #0f172a; font-size: 1rem; font-weight: bold; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .full { grid-column: 1 / -1; }
    label { display: block; font-size: 0.9rem; font-weight: 600; margin-bottom: 5px; color: #334155; }
    input, select, textarea { width: 100%; padding: 10px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.9rem; background: #fff; }
    input:focus, select:focus, textarea:focus { outline: 2px solid rgba(18,184,201,0.18); border-color: var(--primary); }
    textarea { resize: vertical; min-height: 90px; }
    .checkbox-group { display: grid; gap: 8px; margin-top: 6px; }
    .checkbox-item { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: border-color 0.2s; }
    .checkbox-item:hover { border-color: var(--primary); }
    .checkbox-item input { width: auto; margin: 0; }
    .checkbox-item .cb-label { flex: 1; }
    .checkbox-item .cb-hint { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

    /* Buttons */
    .actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 20px; }
    button { border: none; border-radius: 10px; padding: 11px 18px; font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: 0.2s ease; }
    .primary { background: var(--primary); color: white; }
    .primary:hover { background: var(--primary-dark); }
    .secondary { background: #e2e8f0; color: #1e293b; }
    .secondary:hover { background: #cbd5e1; }
    .nav-buttons { display: flex; justify-content: space-between; margin-top: 24px; }

    /* Ergebnis */
    .result-box { border-radius: 12px; padding: 16px; margin-bottom: 16px; border: 2px solid transparent; }
    .ok { background: var(--ok-bg); border-color: var(--ok-border); color: var(--ok-text); }
    .warn { background: var(--warn-bg); border-color: var(--warn-border); color: var(--warn-text); }
    .bad { background: var(--bad-bg); border-color: var(--bad-border); color: var(--bad-text); }
    .result-box h3 { margin-top: 0; margin-bottom: 8px; }
    .result-meta { display: grid; gap: 6px; margin-top: 10px; }

    /* Brief */
    .letter { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; min-height: 200px; line-height: 1.6; font-size: 0.9rem; }
    .letter-sheet { width: 794px; min-height: 1123px; margin: 0 auto; position: relative; background: #ffffff; border: 1px solid #d9e2ec; border-radius: 10px; overflow: hidden; }
    .letter-template { position: relative; min-height: 1123px; padding: 42px 44px 120px; }
    .letter-template::before { content: ""; position: absolute; inset: 0; background: #f7f7f7; z-index: 0; }
    .letter-top-right, .letter-body, .letter-footer { position: relative; z-index: 1; }
    .letter-top-right { display: flex; justify-content: flex-end; margin-bottom: 72px; }
    .logo-stack { text-align: right; color: #2f7d42; line-height: 1.1; }
    .logo-bwv { font-size: 28px; font-weight: 700; letter-spacing: 0.5px; }
    .logo-bwv-sub { color: #98a1a8; font-size: 14px; margin-top: 2px; margin-bottom: 18px; }
    .logo-proximus { color: #2f3135; font-size: 28px; letter-spacing: 0.5px; }
    .logo-proximus-sub { color: #6b7280; font-size: 14px; letter-spacing: 2px; margin-top: 2px; }
    .letter-body { white-space: pre-wrap; font-size: 0.96rem; color: #2b3138; line-height: 1.7; min-height: 430px; }
    .letter-footer { position: absolute; left: 0; right: 0; bottom: 0; padding: 0 24px 24px; }
    .footer-grid { display: grid; grid-template-columns: 70px 1fr 1fr 190px; gap: 18px; align-items: end; }
    .footer-squares { display: grid; grid-template-columns: repeat(2, 28px); grid-template-rows: repeat(3, 28px); gap: 4px; align-self: end; }
    .sq-green { background: #1ea44a; }
    .sq-light { background: #91d1ad; }
    .sq-pale { background: #b7d5c2; }
    .sq-empty { background: transparent; }
    .footer-line { height: 2px; background: #b6b6b6; margin-bottom: 8px; }
    .footer-line.green { background: #2ca24f; height: 4px; }
    .footer-text { white-space: pre-line; font-size: 11px; color: #7b7f84; line-height: 1.35; }
    .footer-claim { text-align: right; font-size: 14px; color: #7b7f84; }
    .pdf-info { font-size: 0.85rem; color: var(--muted); margin-top: 8px; }
    .sticky-column { position: sticky; top: 18px; align-self: start; }

    /* Zusammenfassung im Ergebnis-Step */
    .summary-grid { display: grid; gap: 12px; margin-bottom: 16px; }
    .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
    .summary-card h4 { margin: 0 0 6px; font-size: 0.9rem; color: #0e7490; }
    .summary-card p { margin: 0; font-size: 0.88rem; line-height: 1.4; }

    @media (max-width: 900px) {
      .container { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .sticky-column { position: static; }
      .letter-sheet { width: 100%; min-height: 900px; }
      .footer-grid { grid-template-columns: 1fr; }
      .footer-claim { text-align: left; }
      .stepper { flex-wrap: wrap; }
      .stepper-step { font-size: 0.78rem; padding: 10px 6px; }
    }
  `;

  const initialResult = useMemo<ErgebnisState>(() => ({
    kuendbar: false,
    statusClass: "warn",
    statusText: "Noch keine Prüfung durchgeführt",
    gruende: ['Bitte die Schritte durchgehen und auf \u201EK\u00FCndbarkeit pr\u00FCfen\u201C klicken.'],
    warnungen: [],
    kuendigungsart: form.kuendigungsart,
  }), [form.kuendigungsart]);

  const currentResult = ergebnis || initialResult;

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pruefen(): void {
    const gruende: string[] = [];
    const warnungen: string[] = [];
    let kuendbar = true;
    let statusClass: StatusClass = "ok";
    let statusText = "Die Kündigung ist nach den eingegebenen Angaben grundsätzlich möglich.";

    const betriebszugehoerigkeitMonate = monthsBetween(form.eintritt, form.heute);
    const mitarbeiterzahl = parseInt(form.mitarbeiterzahl || "0", 10) || 0;
    const kschgGilt = mitarbeiterzahl > 10 && betriebszugehoerigkeitMonate >= 6;

    /* ── Pflichtfelder ── */
    if (!form.mitarbeiterVorname || !form.mitarbeiterNachname || !form.heute || !form.firma) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Es fehlen Pflichtangaben für die Prüfung.";
      if (!form.firma) gruende.push("Firmenname fehlt.");
      if (!form.mitarbeiterVorname) gruende.push("Vorname des Mitarbeiters fehlt.");
      if (!form.mitarbeiterNachname) gruende.push("Nachname des Mitarbeiters fehlt.");
      if (!form.heute) gruende.push("Prüfdatum fehlt.");
    }

    /* ── Mitarbeiterzahl & KSchG ── */
    if (!form.mitarbeiterzahl || mitarbeiterzahl <= 0) {
      warnungen.push("Die Anzahl der Mitarbeiter wurde nicht angegeben. Diese ist für die Prüfung des allgemeinen Kündigungsschutzes nach §1 KSchG erforderlich.");
    } else if (mitarbeiterzahl <= 10) {
      warnungen.push(`Kleinbetrieb (${mitarbeiterzahl} Mitarbeiter): Der allgemeine Kündigungsschutz nach §1 KSchG greift nicht (§23 Abs. 1 KSchG). Es gelten aber die Kündigungsfristen nach §622 BGB und der besondere Kündigungsschutz.`);
    }

    /* ── Sonderkündigungsschutz ── */

    // Mutterschutz (§17 MuSchG)
    if (form.schwanger) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Die Mitarbeiterin ist nicht kündbar.";
      gruende.push("Sonderkündigungsschutz wegen Schwangerschaft (§17 MuSchG). Eine Kündigung ist während der Schwangerschaft, bis 4 Monate nach der Entbindung und bis 4 Wochen nach einer Fehlgeburt unzulässig. Wurde bereits gekündigt, hat die Schwangere 2 Wochen Zeit, dem Arbeitgeber die Schwangerschaft mitzuteilen — die Kündigung kann dann unwirksam sein.");
    }

    // Elternzeit (§18 BEEG)
    if (form.elternzeit) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Der Mitarbeiter ist nicht kündbar.";
      gruende.push("Sonderkündigungsschutz während der Elternzeit (§18 BEEG).");
    }

    // Azubi nach Probezeit (§22 BBiG)
    if (form.azubi) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Der Mitarbeiter ist nicht kündbar.";
      gruende.push("Azubi nach der Probezeit: Eine ordentliche Kündigung ist ausgeschlossen (§22 BBiG).");
    }

    // Betriebsratsmitglied / JAV (§15 KSchG)
    if (form.betriebsratMitglied) {
      if (form.kuendigungsart === "ordentlich") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Ordentliche Kündigung von Betriebsratsmitgliedern ist unzulässig.";
        gruende.push("Betriebsratsmitglieder und JAV-Mitglieder genießen besonderen Kündigungsschutz (§15 KSchG). Eine ordentliche Kündigung ist grundsätzlich ausgeschlossen.");
      } else {
        // Außerordentliche Kündigung bei schwerem Vergehen möglich
        statusClass = kuendbar ? "warn" : statusClass;
        if (kuendbar) statusText = "Kündigung nur bei schwerem Vergehen möglich.";
        gruende.push("Betriebsratsmitglieder können nur außerordentlich bei schweren Vergehen gekündigt werden (§15 KSchG), z. B. bei Verrat von Betriebsgeheimnissen oder Missbrauch des Amtes.");
      }
    }

    // Schwerbehinderung (§168 SGB IX) — Schutz greift erst nach 6 Monaten
    if (form.schwerbehindert) {
      if (betriebszugehoerigkeitMonate >= 6) {
        statusClass = kuendbar ? "warn" : statusClass;
        if (kuendbar) statusText = "Kündigung nur mit Zustimmung des Integrationsamts möglich.";
        gruende.push("Der Mitarbeiter ist schwerbehindert: Vorherige Zustimmung des Integrationsamts erforderlich (§168 SGB IX). Der Schutz greift nach 6 Monaten Betriebszugehörigkeit.");
      } else {
        warnungen.push("Schwerbehinderung wurde angegeben, aber der besondere Kündigungsschutz nach §168 SGB IX greift erst nach 6 Monaten Betriebszugehörigkeit (aktuell: " + betriebszugehoerigkeitMonate + " Monate).");
      }
    }

    /* ── Ordentliche Kündigung ── */
    if (form.kuendigungsart === "ordentlich") {
      if (!form.ordGrund) {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Ordentliche Kündigung nicht ausreichend begründet.";
        gruende.push("Kein Kündigungsgrund ausgewählt. Bei Anwendbarkeit des KSchG muss die Kündigung sozial gerechtfertigt sein (§1 Abs. 2 KSchG).");
      }

      // Betriebsrat-Anhörung nur relevant wenn es einen Betriebsrat gibt
      if (form.hatBetriebsrat === "ja" && form.betriebsratAnhoerung !== "ja") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Ordentliche Kündigung ist formell unwirksam.";
        gruende.push("Der Betriebsrat wurde nicht angehört (§102 BetrVG). Ohne Anhörung ist die Kündigung unwirksam.");
      }

      if (kschgGilt) {
        gruende.push(`Allgemeiner Kündigungsschutz greift (§1 KSchG, §23 Abs. 1 KSchG): mehr als 10 Mitarbeiter und mindestens 6 Monate Betriebszugehörigkeit (hier: ${mitarbeiterzahl} Mitarbeiter, ${betriebszugehoerigkeitMonate} Monate). Die Kündigung muss sozial gerechtfertigt sein.`);
      } else if (mitarbeiterzahl > 0) {
        warnungen.push(`Allgemeiner Kündigungsschutz nach §1 KSchG greift voraussichtlich nicht (${mitarbeiterzahl} Mitarbeiter, ${betriebszugehoerigkeitMonate} Monate). Die Kündigungsfristen nach §622 BGB sind dennoch einzuhalten.`);
      }

      // Verhaltensbedingt: Abmahnung
      if (form.ordGrund === "verhaltensbedingt" && form.abmahnung !== "ja") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Verhaltensbedingte Kündigung nicht ausreichend abgesichert.";
        gruende.push("Vor einer verhaltensbedingten Kündigung ist regelmäßig eine Abmahnung erforderlich, damit der Arbeitnehmer sein Verhalten ändern kann (§1 Abs. 2 KSchG).");
      }

      // Betriebsbedingt: Sozialauswahl
      if (form.ordGrund === "betriebsbedingt") {
        gruende.push("Bei betriebsbedingter Kündigung müssen soziale Auswahlkriterien berücksichtigt werden (§1 Abs. 3 KSchG). Der Arbeitgeber darf nicht willkürlich entscheiden, wen er kündigt.");
      }

      // Personenbedingt
      if (form.ordGrund === "personenbedingt") {
        gruende.push("Personenbedingte Kündigung: Der Arbeitnehmer kann seine arbeitsvertraglichen Pflichten aus persönlichen Gründen nicht mehr erfüllen (z. B. fehlende Eignung, dauerhafte Erkrankung).");
      }

      // Fristenprüfung
      if (!form.kuendigungstermin) {
        warnungen.push("Kein Kündigungstermin angegeben — Fristenprüfung nicht möglich.");
      } else {
        const termin = new Date(form.kuendigungstermin);
        const pruefdatum = new Date(form.heute);
        const fristInfo = getKuendigungsfristInfo(form.eintritt, form.heute);
        if (!Number.isNaN(termin.getTime()) && !Number.isNaN(pruefdatum.getTime()) && fristInfo) {
          if (termin < fristInfo.minDate) {
            kuendbar = false;
            statusClass = "bad";
            statusText = "Kündigungstermin ist nicht fristgerecht.";
            gruende.push(`Der Kündigungstermin ${formatDate(form.kuendigungstermin)} liegt vor der Mindestfrist (§622 BGB). Frühestmöglicher Termin: ${formatDateObj(fristInfo.minDate)}.`);
          }
          const yearsInCompany = monthsBetween(form.eintritt, form.heute) / 12;
          if (yearsInCompany < 2 && termin.getDate() !== 15 && !isLastDayOfMonth(termin)) {
            kuendbar = false;
            statusClass = "bad";
            statusText = "Kündigungstermin nicht an einem zulässigen Stichtag.";
            gruende.push("Bei unter 2 Jahren Betriebszugehörigkeit muss der Termin auf den 15. oder das Monatsende fallen (§622 Abs. 1 BGB).");
          }
          if (yearsInCompany >= 2 && !isLastDayOfMonth(termin)) {
            kuendbar = false;
            statusClass = "bad";
            statusText = "Kündigungstermin nicht an einem zulässigen Stichtag.";
            gruende.push("Ab 2 Jahren Betriebszugehörigkeit muss die Kündigung zum Monatsende wirksam werden (§622 Abs. 2 BGB).");
          }
          warnungen.push(`Fristenhinweis: ${fristInfo.text}`);
        }
      }
    }

    /* ── Außerordentliche Kündigung ── */
    if (form.kuendigungsart === "ausserordentlich") {
      if (!form.wichtigerGrund) {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Außerordentliche Kündigung nicht ausreichend begründet.";
        gruende.push("Kein wichtiger Grund angegeben (§626 Abs. 1 BGB). Eine fristlose Kündigung setzt einen Grund voraus, der so schwerwiegend ist, dass die Fortsetzung des Arbeitsverhältnisses unzumutbar ist.");
      } else {
        gruende.push("Wichtiger Grund für fristlose Kündigung angegeben (§626 Abs. 1 BGB): " + humanizeWichtigerGrund(form.wichtigerGrund) + ".");
      }
      if (!form.begruendung.trim()) {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Sachverhalt für fristlose Kündigung fehlt.";
        gruende.push("Die konkrete Begründung des Sachverhalts fehlt.");
      }
      // Betriebsrat-Anhörung auch bei außerordentlicher Kündigung
      if (form.hatBetriebsrat === "ja" && form.betriebsratAnhoerung !== "ja") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Außerordentliche Kündigung formell unwirksam.";
        gruende.push("Auch bei außerordentlicher Kündigung muss der Betriebsrat vorher angehört werden (§102 BetrVG).");
      }
      warnungen.push("Die Kündigung muss innerhalb von 2 Wochen nach Bekanntwerden des Grundes erklärt werden (§626 Abs. 2 BGB).");
      if (form.schwerbehindert && betriebszugehoerigkeitMonate >= 6) {
        warnungen.push("Auch bei außerordentlicher Kündigung eines schwerbehinderten Mitarbeiters ist die Zustimmung des Integrationsamts erforderlich (§174 SGB IX).");
      }
    }

    /* ── Tarifvertrag-Hinweis ── */
    warnungen.push("Prüfen Sie zusätzlich, ob ein Tarifvertrag besondere Kündigungsfristen oder zusätzliche Schutzregelungen enthält (§622 Abs. 4 BGB).");

    setErgebnis({ kuendbar, statusClass, statusText, gruende, warnungen, kuendigungsart: form.kuendigungsart });
    setBrief(erstelleBrief({
      firma: form.firma,
      arbeitgeber: form.arbeitgeber,
      mitarbeiterVorname: form.mitarbeiterVorname,
      mitarbeiterNachname: form.mitarbeiterNachname,
      geschlecht: form.geschlecht,
      adresseStrasse: form.adresseStrasse,
      adressePlz: form.adressePlz,
      adresseOrt: form.adresseOrt,
      heute: form.heute,
      kuendigungstermin: form.kuendigungstermin,
      kuendigungsart: form.kuendigungsart,
      ordGrund: form.ordGrund,
      wichtigerGrund: form.wichtigerGrund,
      begruendung: form.begruendung,
      kuendbar,
    }));
    setStep(3); // Jump to Ergebnis step
  }

  async function briefKopieren(): Promise<void> {
    try {
      await navigator.clipboard.writeText(brief);
      alert("Kündigungsschreiben wurde in die Zwischenablage kopiert.");
    } catch {
      alert("Kopieren war nicht möglich.");
    }
  }

  async function briefAlsPdf(): Promise<void> {
    if (!ergebnis?.kuendbar) {
      setPdfStatus("PDF wird nur erzeugt, wenn die Prüfung positiv ist.");
      return;
    }
    const target = document.getElementById("pdf-letter-sheet");
    if (!target) {
      setPdfStatus("Briefvorlage wurde nicht gefunden.");
      return;
    }
    try {
      setPdfStatus("PDF wird erstellt und heruntergeladen …");
      const [{ default: html2canvas }, jsPdfModule] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const JsPDF = jsPdfModule.jsPDF;
      const canvas = await html2canvas(target, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new JsPDF("p", "mm", "a4");
      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      const fileName = `kuendigung_${(form.mitarbeiterNachname || "mitarbeiter").toLowerCase()}.pdf`;
      pdf.save(fileName);
      setPdfStatus("PDF wurde heruntergeladen.");
    } catch (error) {
      console.error(error);
      setPdfStatus("PDF-Erstellung fehlgeschlagen.");
    }
  }

  /* ── Render ── */

  return (
    <div className="page">
      <style>{styles}</style>
      <header>
        <h1>Kündigungsleitfaden</h1>
        <p>Schritt-für-Schritt-Prüfung der Kündbarkeit mit druckfertigem Kündigungsschreiben</p>
      </header>

      <main className="container">
        <section className="card">
          {/* Stepper */}
          <div className="stepper">
            {STEPS.map((s, i) => (
              <div
                key={s.id}
                className={`stepper-step ${i === step ? "active" : i < step ? "done" : ""}`}
                onClick={() => setStep(i)}
              >
                <span className="step-num">{i + 1}</span>
                {s.label}
              </div>
            ))}
          </div>

          {/* ── Step 1: Grunddaten ── */}
          {step === 0 && (
            <>
              <h2>Grunddaten des Mitarbeiters</h2>
              <div className="info-hint">
                <p><strong>Wichtig:</strong> Eintrittsdatum und Mitarbeiterzahl bestimmen die Kündigungsfrist (§622 BGB) und ob der allgemeine Kündigungsschutz gilt (§23 Abs. 1 KSchG: mehr als 10 Mitarbeiter + mindestens 6 Monate Betriebszugehörigkeit).</p>
              </div>
              <div className="form-grid">
                <div>
                  <label htmlFor="firma">Firma</label>
                  <input id="firma" type="text" value={form.firma} onChange={(e) => setField("firma", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="arbeitgeber">Vertreter Arbeitgeber</label>
                  <input id="arbeitgeber" type="text" placeholder="Max Mustermann" value={form.arbeitgeber} onChange={(e) => setField("arbeitgeber", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="mitarbeiterVorname">Vorname Mitarbeiter</label>
                  <input id="mitarbeiterVorname" type="text" placeholder="Vorname" value={form.mitarbeiterVorname} onChange={(e) => setField("mitarbeiterVorname", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="mitarbeiterNachname">Nachname Mitarbeiter</label>
                  <input id="mitarbeiterNachname" type="text" placeholder="Nachname" value={form.mitarbeiterNachname} onChange={(e) => setField("mitarbeiterNachname", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="geschlecht">Geschlecht</label>
                  <select id="geschlecht" value={form.geschlecht} onChange={(e) => setField("geschlecht", e.target.value as Geschlecht)}>
                    <option value="">Bitte wählen</option>
                    <option value="maennlich">Männlich</option>
                    <option value="weiblich">Weiblich</option>
                    <option value="divers">Divers</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="adresseStrasse">Straße und Hausnummer</label>
                  <input id="adresseStrasse" type="text" placeholder="Musterstraße 1" value={form.adresseStrasse} onChange={(e) => setField("adresseStrasse", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="adressePlz">PLZ</label>
                  <input id="adressePlz" type="text" placeholder="12345" value={form.adressePlz} onChange={(e) => setField("adressePlz", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="adresseOrt">Ort</label>
                  <input id="adresseOrt" type="text" placeholder="Musterstadt" value={form.adresseOrt} onChange={(e) => setField("adresseOrt", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="eintritt">Eintrittsdatum</label>
                  <input id="eintritt" type="date" value={form.eintritt} onChange={(e) => setField("eintritt", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="heute">Datum der Prüfung</label>
                  <input id="heute" type="date" value={form.heute} onChange={(e) => setField("heute", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="mitarbeiterzahl">Anzahl Mitarbeiter im Betrieb</label>
                  <input id="mitarbeiterzahl" type="number" min="1" placeholder="z. B. 25" value={form.mitarbeiterzahl} onChange={(e) => setField("mitarbeiterzahl", e.target.value)} />
                </div>
                <div>
                  <label htmlFor="kuendigungsart">Geplante Kündigungsart</label>
                  <select id="kuendigungsart" value={form.kuendigungsart} onChange={(e) => setField("kuendigungsart", e.target.value as Kuendigungsart)}>
                    <option value="ordentlich">Ordentliche Kündigung</option>
                    <option value="ausserordentlich">Außerordentliche Kündigung</option>
                  </select>
                </div>
              </div>

              <div className="info-hint" style={{ marginTop: "16px" }}>
                <p><strong>Ordentliche Kündigung (§1 KSchG, §622 BGB):</strong> Beendigung mit Kündigungsfrist. Die Frist richtet sich nach der Betriebszugehörigkeit.</p>
                <p><strong>Außerordentliche Kündigung (§626 BGB):</strong> Fristlose Beendigung bei wichtigem Grund. Muss innerhalb von 2 Wochen nach Bekanntwerden erklärt werden.</p>
              </div>

              <div className="nav-buttons">
                <div></div>
                <button className="primary" type="button" onClick={() => setStep(1)}>Weiter: Sonderschutz</button>
              </div>
            </>
          )}

          {/* ── Step 2: Sonderkündigungsschutz ── */}
          {step === 1 && (
            <>
              <h2>Sonderkündigungsschutz prüfen</h2>
              <div className="info-hint">
                <p>Bestimmte Personengruppen sind gesetzlich besonders geschützt. Wählen Sie alle zutreffenden Merkmale aus.</p>
              </div>

              <div className="checkbox-group">
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.schwanger} onChange={(e) => setField("schwanger", e.target.checked)} />
                  <div className="cb-label">
                    Mitarbeiterin ist schwanger
                    <div className="cb-hint">§17 MuSchG — Schutz ab dem 1. Tag der Schwangerschaft, bis 4 Monate nach der Entbindung und 4 Wochen nach einer Fehlgeburt.</div>
                  </div>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.elternzeit} onChange={(e) => setField("elternzeit", e.target.checked)} />
                  <div className="cb-label">
                    Mitarbeiter befindet sich in Elternzeit
                    <div className="cb-hint">§18 BEEG — Kündigungsschutz ab Anmeldung und während der gesamten Elternzeit.</div>
                  </div>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.schwerbehindert} onChange={(e) => setField("schwerbehindert", e.target.checked)} />
                  <div className="cb-label">
                    Mitarbeiter ist schwerbehindert
                    <div className="cb-hint">§168 SGB IX — Zustimmung des Integrationsamts erforderlich. Schutz greift erst nach 6 Monaten Betriebszugehörigkeit.</div>
                  </div>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.azubi} onChange={(e) => setField("azubi", e.target.checked)} />
                  <div className="cb-label">
                    Mitarbeiter ist Azubi nach der Probezeit
                    <div className="cb-hint">§22 BBiG — Ordentliche Kündigung nach der Probezeit ausgeschlossen.</div>
                  </div>
                </label>
                <label className="checkbox-item">
                  <input type="checkbox" checked={form.betriebsratMitglied} onChange={(e) => setField("betriebsratMitglied", e.target.checked)} />
                  <div className="cb-label">
                    Mitarbeiter ist Betriebsratsmitglied / JAV
                    <div className="cb-hint">§15 KSchG — Ordentliche Kündigung grundsätzlich unzulässig. Außerordentliche Kündigung nur bei schweren Vergehen (z. B. Verrat von Betriebsgeheimnissen, Amtsmissbrauch).</div>
                  </div>
                </label>
              </div>

              <div className="nav-buttons" style={{ marginTop: "24px" }}>
                <button className="secondary" type="button" onClick={() => setStep(0)}>Zurück</button>
                <button className="primary" type="button" onClick={() => setStep(2)}>Weiter: Kündigungsdetails</button>
              </div>
            </>
          )}

          {/* ── Step 3: Kündigungsdetails ── */}
          {step === 2 && (
            <>
              <h2>{form.kuendigungsart === "ordentlich" ? "Ordentliche Kündigung" : "Außerordentliche Kündigung"}</h2>

              {/* Betriebsrat vorhanden? — gilt für beide Arten */}
              <div className="form-grid" style={{ marginBottom: "16px" }}>
                <div className="full">
                  <label htmlFor="hatBetriebsrat">Gibt es einen Betriebsrat im Betrieb?</label>
                  <select id="hatBetriebsrat" value={form.hatBetriebsrat} onChange={(e) => setField("hatBetriebsrat", e.target.value as JaNein)}>
                    <option value="nein">Nein</option>
                    <option value="ja">Ja</option>
                  </select>
                </div>
                {form.hatBetriebsrat === "ja" && (
                  <div className="full">
                    <label htmlFor="betriebsratAnhoerung">Wurde der Betriebsrat angehört?</label>
                    <select id="betriebsratAnhoerung" value={form.betriebsratAnhoerung} onChange={(e) => setField("betriebsratAnhoerung", e.target.value as JaNein)}>
                      <option value="nein">Nein</option>
                      <option value="ja">Ja</option>
                    </select>
                    <div className="info-hint" style={{ marginTop: "8px" }}>
                      <p>§102 BetrVG: Der Betriebsrat muss vor jeder Kündigung angehört werden. Ohne Anhörung ist die Kündigung unwirksam.</p>
                    </div>
                  </div>
                )}
              </div>

              {form.kuendigungsart === "ordentlich" && (
                <>
                  <div className="info-hint">
                    <p>Die ordentliche Kündigung setzt bei Anwendbarkeit des KSchG einen sozial gerechtfertigten Grund voraus (§1 Abs. 2 KSchG). Der Kündigungstermin muss die Frist nach §622 BGB einhalten.</p>
                  </div>
                  <div className="form-grid">
                    <div>
                      <label htmlFor="ordGrund">Kündigungsgrund</label>
                      <select id="ordGrund" value={form.ordGrund} onChange={(e) => setField("ordGrund", e.target.value as OrdGrund)}>
                        <option value="">Bitte wählen</option>
                        <option value="personenbedingt">Personenbedingt</option>
                        <option value="verhaltensbedingt">Verhaltensbedingt</option>
                        <option value="betriebsbedingt">Betriebsbedingt</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="kuendigungstermin">Geplanter Kündigungstermin</label>
                      <input id="kuendigungstermin" type="date" value={form.kuendigungstermin} onChange={(e) => setField("kuendigungstermin", e.target.value)} />
                    </div>
                    {form.ordGrund === "verhaltensbedingt" && (
                      <div>
                        <label htmlFor="abmahnung">Abmahnung vorhanden?</label>
                        <select id="abmahnung" value={form.abmahnung} onChange={(e) => setField("abmahnung", e.target.value as JaNein)}>
                          <option value="nein">Nein</option>
                          <option value="ja">Ja</option>
                        </select>
                        <div className="info-hint" style={{ marginTop: "8px" }}>
                          <p>Vor einer verhaltensbedingten Kündigung ist in der Regel eine Abmahnung erforderlich, damit der Arbeitnehmer sein Verhalten ändern kann.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {form.kuendigungsart === "ausserordentlich" && (
                <>
                  <div className="info-hint">
                    <p><strong>§626 BGB:</strong> Die außerordentliche Kündigung beendet das Arbeitsverhältnis sofort. Sie ist nur zulässig bei einem wichtigen Grund, der so schwerwiegend ist, dass die Fortsetzung bis zum Ablauf der normalen Frist unzumutbar ist.</p>
                    <p><strong>Achtung:</strong> Die Kündigung muss innerhalb von 2 Wochen nach Bekanntwerden des Grundes erklärt werden (§626 Abs. 2 BGB).</p>
                  </div>
                  <div className="form-grid">
                    <div className="full">
                      <label htmlFor="wichtigerGrund">Wichtiger Grund</label>
                      <select id="wichtigerGrund" value={form.wichtigerGrund} onChange={(e) => setField("wichtigerGrund", e.target.value as WichtigerGrund)}>
                        <option value="">Bitte wählen</option>
                        <option value="diebstahl">Diebstahl</option>
                        <option value="betrug">Betrug</option>
                        <option value="koerperverletzung">Körperverletzung</option>
                        <option value="schwere-beleidigung">Schwere Beleidigung</option>
                        <option value="sonstiger">Sonstiger wichtiger Grund</option>
                      </select>
                    </div>
                    <div className="full">
                      <label htmlFor="begruendung">Sachverhalt / Begründung</label>
                      <textarea id="begruendung" placeholder="Sachverhalt möglichst genau beschreiben …" value={form.begruendung} onChange={(e) => setField("begruendung", e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              <div className="nav-buttons" style={{ marginTop: "24px" }}>
                <button className="secondary" type="button" onClick={() => setStep(1)}>Zurück</button>
                <button className="primary" type="button" onClick={pruefen}>Kündbarkeit prüfen</button>
              </div>
            </>
          )}

          {/* ── Step 4: Ergebnis & Brief ── */}
          {step === 3 && (
            <>
              <h2>Prüfungsergebnis</h2>

              {/* Zusammenfassung der Eingaben */}
              <div className="summary-grid">
                <div className="summary-card">
                  <h4>Mitarbeiter</h4>
                  <p>{form.mitarbeiterVorname} {form.mitarbeiterNachname} — {form.firma}</p>
                  <p>Eintritt: {formatDate(form.eintritt)} — Betrieb: {form.mitarbeiterzahl || "k. A."} Mitarbeiter</p>
                </div>
                <div className="summary-card">
                  <h4>Kündigungsart</h4>
                  <p>{form.kuendigungsart === "ordentlich"
                    ? `Ordentliche Kündigung (${form.ordGrund || "kein Grund"}) zum ${formatDate(form.kuendigungstermin)}`
                    : `Außerordentliche Kündigung — ${form.wichtigerGrund ? humanizeWichtigerGrund(form.wichtigerGrund) : "kein Grund"}`
                  }</p>
                </div>
              </div>

              <div className={`result-box ${currentResult.statusClass}`}>
                <h3>{currentResult.statusText}</h3>
                <div className="result-meta">
                  <p><strong>Kündbar:</strong> {currentResult.kuendbar ? "Ja, grundsätzlich möglich" : "Nein bzw. rechtlich kritisch"}</p>
                  <p><strong>Art:</strong> {currentResult.kuendigungsart === "ordentlich" ? "Ordentliche Kündigung" : "Außerordentliche Kündigung"}</p>
                </div>
              </div>

              {ergebnis && (
                <div className="result-box" style={{ background: "#f8fafc", borderColor: "#cbd5e1" }}>
                  <h3>Begründung</h3>
                  <ul>
                    {(currentResult.gruende.length ? currentResult.gruende : ["Keine Begründung vorhanden."]).map((g, i) => <li key={i}>{g}</li>)}
                  </ul>
                  {currentResult.warnungen.length > 0 && (
                    <>
                      <h3>Hinweise</h3>
                      <ul>
                        {currentResult.warnungen.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    </>
                  )}
                </div>
              )}

              <div className="actions">
                <button className="secondary" type="button" onClick={() => setStep(0)}>Neue Prüfung</button>
                <button className="secondary" type="button" onClick={briefKopieren}>Schreiben kopieren</button>
                <button className="primary" type="button" onClick={briefAlsPdf}>PDF herunterladen</button>
              </div>
              {pdfStatus && <p className="pdf-info">{pdfStatus}</p>}
            </>
          )}
        </section>

        {/* ── Rechte Spalte: Kündigungsschreiben ── */}
        <section className="card sticky-column">
          <h2>Kündigungsschreiben</h2>
          {ergebnis?.kuendbar ? (
            <div id="pdf-letter-sheet" className="letter-sheet">
              <div className="letter-template">
                <div className="letter-top-right">
                  <div className="logo-stack">
                    <div className="logo-bwv">BWV</div>
                    <div className="logo-bwv-sub">Bildungsverband</div>
                    <div className="logo-proximus">PROXIMUS</div>
                    <div className="logo-proximus-sub">PRIVATKUNDEN</div>
                  </div>
                </div>
                <div className="letter-body">{brief}</div>
                <div className="letter-footer">
                  <div className="footer-grid">
                    <div className="footer-squares" aria-hidden="true">
                      <div className="sq-empty"></div>
                      <div className="sq-green"></div>
                      <div className="sq-light"></div>
                      <div className="sq-empty"></div>
                      <div className="sq-green"></div>
                      <div className="sq-pale"></div>
                    </div>
                    <div>
                      <div className="footer-line"></div>
                      <div className="footer-text">Proximus AG
Hauptstraße 12
48143 Münster
Deutschland</div>
                    </div>
                    <div>
                      <div className="footer-line"></div>
                      <div className="footer-text">Vorstand: Max Mustermann
Vorsitzender des Aufsichtsrats: Erika Beispiel
Handelsregister: HRB 12345, Amtsgericht Münster
USt-IdNr.: DE123456789
Telefon: +49 251 123456-0
E-Mail: info@proximus-ag.de</div>
                    </div>
                    <div>
                      <div className="footer-line green"></div>
                      <div className="footer-claim">Eine Branche macht Bildung</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="letter">{brief}</div>
          )}
        </section>
      </main>
    </div>
  );
}
