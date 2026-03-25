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
  betriebsrat: boolean;
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
      text: "Mindestens 4 Wochen (28 Tage) sowie Termin zum 15. oder Monatsende.",
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
    text: `Mindestens ${requiredMonths} Monat(e) zum Monatsende gemäß §622 BGB.`,
  };
}

function isLastDayOfMonth(date: Date): boolean {
  return date.getDate() === endOfMonth(date).getDate();
}

function humanizeWichtigerGrund(value: WichtigerGrund): string {
  switch (value) {
    case "diebstahl":
      return "Diebstahl";
    case "betrug":
      return "Betrug";
    case "koerperverletzung":
      return "Körperverletzung";
    case "schwere-beleidigung":
      return "schwere Beleidigung";
    case "sonstiger":
      return "sonstigen wichtigen Grund";
    default:
      return "wichtigen Grund";
  }
}

function buildEmpfaengerName(vorname: string, nachname: string): string {
  return [vorname, nachname].filter(Boolean).join(" ") || "Mitarbeiter";
}

function buildAnrede(geschlecht: Geschlecht, nachname: string): string {
  const safeNachname = nachname || "Mitarbeiter";
  if (geschlecht === "weiblich") return `Sehr geehrte Frau ${safeNachname},`;
  if (geschlecht === "maennlich") return `Sehr geehrter Herr ${safeNachname},`;
  if (geschlecht === "divers") return `Guten Tag ${safeNachname},`;
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
    firma,
    arbeitgeber,
    mitarbeiterVorname,
    mitarbeiterNachname,
    geschlecht,
    adresseStrasse,
    adressePlz,
    adresseOrt,
    heute,
    kuendigungstermin,
    kuendigungsart,
    ordGrund,
    wichtigerGrund,
    begruendung,
    kuendbar,
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

function runSelfTests(): void {
  console.assert(formatDate("2025-01-31") !== "__________", "formatDate sollte gültige Datumswerte formatieren");
  console.assert(monthsBetween("2025-01-01", "2025-07-01") === 6, "monthsBetween sollte volle Monate berechnen");
  console.assert(buildEmpfaengerName("Erika", "Muster") === "Erika Muster", "Vor- und Nachname sollten korrekt zusammengeführt werden");
  console.assert(buildAnrede("weiblich", "Muster") === "Sehr geehrte Frau Muster,", "Anrede weiblich sollte korrekt gebildet werden");
  console.assert(buildAnrede("maennlich", "Muster") === "Sehr geehrter Herr Muster,", "Anrede männlich sollte korrekt gebildet werden");
  console.assert(buildEmpfaengerAdresse("Musterstraße 1", "12345", "Musterstadt").includes("12345 Musterstadt"), "Adresse sollte getrennt formatiert werden");

  const brief = erstelleBrief({
    firma: "Proximus AG",
    arbeitgeber: "Max Mustermann",
    mitarbeiterVorname: "Erika",
    mitarbeiterNachname: "Muster",
    geschlecht: "weiblich",
    adresseStrasse: "Musterstraße 1",
    adressePlz: "12345",
    adresseOrt: "Musterstadt",
    heute: "2025-01-31",
    kuendigungstermin: "2025-03-31",
    kuendigungsart: "ordentlich",
    ordGrund: "betriebsbedingt",
    wichtigerGrund: "",
    begruendung: "",
    kuendbar: true,
  });
  console.assert(brief.includes("Betreff: Kündigung des Arbeitsverhältnisses"), "Briefgenerator sollte einen Betreff erzeugen");
  console.assert(brief.includes("Erika Muster"), "Briefgenerator sollte den vollen Namen enthalten");
}

export default function App() {
  const todayIso = new Date().toISOString().split("T")[0];
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
    betriebsrat: false,
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

  useEffect(() => {
    runSelfTests();
  }, []);

  const styles = `
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; }
    :root {
      --bg: #f5f7fa; --card: #ffffff; --text: #1f2937; --muted: #64748b; --primary: #12b8c9;
      --primary-dark: #0f9cab; --primary-soft: #ecfeff; --ok-bg: #ecfdf5; --ok-border: #10b981;
      --ok-text: #065f46; --warn-bg: #fff7ed; --warn-border: #f59e0b; --warn-text: #9a3412;
      --bad-bg: #fef2f2; --bad-border: #ef4444; --bad-text: #991b1b;
    }
    body { margin: 0; background: var(--bg); color: var(--text); }
    .page { min-height: 100vh; background: var(--bg); color: var(--text); }
    header { background: linear-gradient(135deg, #12b8c9, #0ea5b7); color: white; padding: 36px 20px; text-align: center; }
    header h1 { margin: 0 0 10px; font-size: 2rem; }
    header p { margin: 0; font-size: 1rem; opacity: 0.95; }
    .container { max-width: 1200px; margin: 28px auto; padding: 0 20px 40px; display: grid; grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr); gap: 24px; }
    .card { background: var(--card); border-radius: 18px; box-shadow: 0 10px 24px rgba(0,0,0,0.08); padding: 24px; }
    .card h2 { margin-top: 0; font-size: 1.35rem; color: #0f172a; }
    .intro-box { display: grid; gap: 10px; background: var(--primary-soft); border: 1px solid #bdeff4; border-radius: 14px; padding: 16px; margin-bottom: 22px; }
    .intro-box strong { color: #0f172a; }
    .checklist { margin: 0; padding-left: 18px; color: #155e75; }
    .section-title { margin: 24px 0 12px; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; color: #0f172a; font-size: 1.05rem; font-weight: bold; }
    .section-info { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; margin-bottom: 14px; color: #334155; font-size: 0.92rem; line-height: 1.5; }
    .section-info p { margin: 0 0 8px; }
    .section-info p:last-child { margin-bottom: 0; }
    .learn-box { background: #f8fafc; border: 1px solid #dbeafe; border-left: 5px solid var(--primary); border-radius: 12px; padding: 14px; margin-top: 12px; }
    .learn-box h4 { margin: 0 0 8px; font-size: 0.98rem; color: #0f172a; }
    .learn-box p, .learn-box ul { margin: 0; color: #334155; font-size: 0.92rem; line-height: 1.5; }
    .learn-box ul { padding-left: 18px; margin-top: 8px; }
    .mini-tip { margin-top: 6px; color: var(--muted); font-size: 0.85rem; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full { grid-column: 1 / -1; }
    label { display: block; font-size: 0.95rem; font-weight: 600; margin-bottom: 6px; color: #334155; }
    input, select, textarea { width: 100%; padding: 11px 12px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; background: #fff; }
    input:focus, select:focus, textarea:focus { outline: 2px solid rgba(18,184,201,0.18); border-color: var(--primary); }
    textarea { resize: vertical; min-height: 100px; }
    .checkbox-group { display: grid; gap: 8px; margin-top: 6px; }
    .checkbox-item { display: flex; align-items: center; gap: 10px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
    .checkbox-item input { width: auto; margin: 0; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 24px; }
    button { border: none; border-radius: 12px; padding: 12px 18px; font-size: 0.95rem; font-weight: bold; cursor: pointer; transition: 0.2s ease; }
    .primary { background: var(--primary); color: white; }
    .primary:hover { background: var(--primary-dark); }
    .secondary { background: #e2e8f0; color: #1e293b; }
    .secondary:hover { background: #cbd5e1; }
    .result-box { border-radius: 14px; padding: 18px; margin-bottom: 18px; border: 2px solid transparent; }
    .ok { background: var(--ok-bg); border-color: var(--ok-border); color: var(--ok-text); }
    .warn { background: var(--warn-bg); border-color: var(--warn-border); color: var(--warn-text); }
    .bad { background: var(--bad-bg); border-color: var(--bad-border); color: var(--bad-text); }
    .result-box h3 { margin-top: 0; margin-bottom: 10px; }
    .result-meta { display: grid; gap: 8px; margin-top: 12px; }
    .letter { white-space: pre-wrap; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; min-height: 300px; line-height: 1.6; font-size: 0.95rem; }
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
    .pdf-info { font-size: 0.88rem; color: var(--muted); margin-top: 10px; }
    .hint { font-size: 0.88rem; color: var(--muted); margin-top: 10px; }
    .sticky-column { position: sticky; top: 18px; align-self: start; }
    @media (max-width: 900px) {
      .container { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
      .sticky-column { position: static; }
      .letter-sheet { width: 100%; min-height: 900px; }
      .footer-grid { grid-template-columns: 1fr; }
      .footer-claim { text-align: left; }
    }
  `;

  const initialResult = useMemo<ErgebnisState>(() => ({
    kuendbar: false,
    statusClass: "warn",
    statusText: "Noch keine Prüfung durchgeführt",
    gruende: ["Bitte links die Daten eingeben und auf „Kündbarkeit prüfen“ klicken."],
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
    let statusText = "Der Mitarbeiter ist nach den eingegebenen Angaben grundsätzlich kündbar.";

    const betriebszugehoerigkeitMonate = monthsBetween(form.eintritt, form.heute);
    const mitarbeiterzahl = parseInt(form.mitarbeiterzahl || "0", 10) || 0;
    const kschgGilt = mitarbeiterzahl > 10 && betriebszugehoerigkeitMonate >= 6;

    if (!form.mitarbeiterVorname || !form.mitarbeiterNachname || !form.heute || !form.firma) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Es fehlen Pflichtangaben für die Prüfung.";
      if (!form.firma) gruende.push("Firmenname fehlt.");
      if (!form.mitarbeiterVorname) gruende.push("Vorname des Mitarbeiters fehlt.");
      if (!form.mitarbeiterNachname) gruende.push("Nachname des Mitarbeiters fehlt.");
      if (!form.heute) gruende.push("Prüfdatum fehlt.");
    }

    if (form.schwanger) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Der Mitarbeiter ist nicht kündbar.";
      gruende.push("Sonderkündigungsschutz wegen Schwangerschaft.");
    }
    if (form.elternzeit) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Der Mitarbeiter ist nicht kündbar.";
      gruende.push("Sonderkündigungsschutz während der Elternzeit.");
    }
    if (form.azubi) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Der Mitarbeiter ist nicht kündbar.";
      gruende.push("Azubi nach der Probezeit genießt besonderen Kündigungsschutz.");
    }
    if (form.betriebsrat) {
      kuendbar = false;
      statusClass = "bad";
      statusText = "Der Mitarbeiter ist grundsätzlich nicht kündbar.";
      gruende.push("Betriebsratsmitglieder/JAV haben Sonderkündigungsschutz.");
    }
    if (form.schwerbehindert) {
      statusClass = kuendbar ? "warn" : statusClass;
      if (kuendbar) statusText = "Kündigung nur unter zusätzlichen Voraussetzungen möglich.";
      gruende.push("Bei Schwerbehinderung ist die Zustimmung des Integrationsamts erforderlich.");
    }

    if (form.kuendigungsart === "ordentlich") {
      if (!form.ordGrund) {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Ordentliche Kündigung derzeit nicht ausreichend begründet.";
        gruende.push("Für eine ordentliche Kündigung wurde kein Kündigungsgrund ausgewählt.");
      }
      if (form.betriebsratAnhoerung !== "ja") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Ordentliche Kündigung ist formell problematisch.";
        gruende.push("Der Betriebsrat wurde nicht angehört.");
      }
      if (kschgGilt) {
        gruende.push(`Allgemeiner Kündigungsschutz nach KSchG ist anwendbar (mehr als 10 Mitarbeiter und Betriebszugehörigkeit mindestens 6 Monate; hier: ${mitarbeiterzahl} Mitarbeiter, ${betriebszugehoerigkeitMonate} Monate).`);
      } else {
        warnungen.push(`Allgemeiner Kündigungsschutz nach KSchG greift hier voraussichtlich nicht (hier: ${mitarbeiterzahl} Mitarbeiter, ${betriebszugehoerigkeitMonate} Monate Betriebszugehörigkeit).`);
      }
      if (form.ordGrund === "verhaltensbedingt" && form.abmahnung !== "ja") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Verhaltensbedingte Kündigung ist derzeit nicht ausreichend abgesichert.";
        gruende.push("Vor einer verhaltensbedingten Kündigung ist regelmäßig eine Abmahnung erforderlich.");
      }
      if (form.ordGrund === "betriebsbedingt") {
        gruende.push("Bei betriebsbedingter Kündigung sind soziale Auswahlkriterien zu beachten.");
      }
      if (!form.kuendigungstermin) {
        warnungen.push("Kein Kündigungstermin angegeben.");
      } else {
        const termin = new Date(form.kuendigungstermin);
        const pruefdatum = new Date(form.heute);
        const fristInfo = getKuendigungsfristInfo(form.eintritt, form.heute);
        if (!Number.isNaN(termin.getTime()) && !Number.isNaN(pruefdatum.getTime()) && fristInfo) {
          if (termin < fristInfo.minDate) {
            kuendbar = false;
            statusClass = "bad";
            statusText = "Geplanter Kündigungstermin ist nicht fristgerecht.";
            gruende.push(`Der Kündigungstermin ${formatDate(form.kuendigungstermin)} liegt vor der Mindestfrist. Erforderlich: frühestens ${formatDateObj(fristInfo.minDate)}.`);
          }
          const yearsInCompany = monthsBetween(form.eintritt, form.heute) / 12;
          if (yearsInCompany < 2 && termin.getDate() !== 15 && !isLastDayOfMonth(termin)) {
            kuendbar = false;
            statusClass = "bad";
            statusText = "Geplanter Kündigungstermin entspricht nicht den gesetzlichen Stichtagen.";
            gruende.push("Bei unter 2 Jahren Betriebszugehörigkeit muss der Termin auf den 15. oder das Monatsende fallen.");
          }
          if (yearsInCompany >= 2 && !isLastDayOfMonth(termin)) {
            kuendbar = false;
            statusClass = "bad";
            statusText = "Geplanter Kündigungstermin entspricht nicht den gesetzlichen Stichtagen.";
            gruende.push("Bei längerer Betriebszugehörigkeit muss die Kündigung zum Monatsende wirksam werden.");
          }
          warnungen.push(`Fristenprüfung: ${fristInfo.text}`);
        }
      }
    }

    if (form.kuendigungsart === "ausserordentlich") {
      if (!form.wichtigerGrund) {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Außerordentliche Kündigung nicht ausreichend begründet.";
        gruende.push("Es wurde kein wichtiger Grund angegeben.");
      } else {
        gruende.push("Ein wichtiger Grund für eine fristlose Kündigung wurde angegeben: " + humanizeWichtigerGrund(form.wichtigerGrund) + ".");
      }
      if (!form.begruendung.trim()) {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Sachverhalt für fristlose Kündigung fehlt.";
        gruende.push("Die konkrete Begründung wurde nicht beschrieben.");
      }
      if (form.betriebsratAnhoerung !== "ja") {
        kuendbar = false;
        statusClass = "bad";
        statusText = "Außerordentliche Kündigung ist formell problematisch.";
        gruende.push("Der Betriebsrat wurde nicht angehört.");
      }
      if (form.schwerbehindert) {
        warnungen.push("Auch bei außerordentlicher Kündigung sind besondere Schutzvorschriften zu prüfen.");
      }
    }

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

  return (
    <div className="page">
      <style>{styles}</style>
      <header>
        <h1>Kündigungsleitfaden für die Personalabteilung</h1>
        <p>Prüfung der Kündbarkeit eines Mitarbeiters mit druckfertigem Kündigungsschreiben als PDF</p>
      </header>

      <main className="container">
        <section className="card">
          <h2>Mitarbeiterdaten und Prüffragen</h2>

          <div className="intro-box">
            <strong>So benutzt du das Tool</strong>
            <ul className="checklist">
              <li>1. Grunddaten des Mitarbeiters eintragen.</li>
              <li>2. Sonderkündigungsschutz prüfen.</li>
              <li>3. Je nach Kündigungsart die passenden Felder ausfüllen.</li>
              <li>4. Auf „Kündbarkeit prüfen“ klicken.</li>
              <li>5. Bei positiver Prüfung das Schreiben als PDF exportieren.</li>
              <li>6. Arbeitsvertragliche oder tarifvertragliche Sonderregelungen immer zusätzlich prüfen.</li>
            </ul>
            <div className="mini-tip">Die Firma ist bereits auf Proximus AG vorbelegt. Vorname, Nachname, Geschlecht und Anschrift sind getrennte Felder. Arbeitsvertragliche oder tarifvertragliche Regelungen können den Arbeitnehmer besser stellen und müssen immer zusätzlich geprüft werden.</div>
          </div>

          <div className="section-title">Grunddaten</div>
          <div className="section-info">
            <p>In diesem Bereich werden die wichtigsten Stammdaten erfasst. Besonders wichtig sind Eintrittsdatum, Prüfdatum und die Anzahl der Mitarbeiter im Betrieb.</p>
            <p>Zusätzlich gilt: Arbeitsvertragliche oder tarifvertragliche Abmachungen können für den Arbeitnehmer günstigere Regelungen enthalten. Auch diese besonderen Kündigungsschutzregeln müssen immer separat geprüft werden.</p>
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

          <div className="learn-box">
            <h4>Ordentliche und außerordentliche Kündigung einfach erklärt</h4>
            <ul>
              <li><strong>Ordentliche Kündigung:</strong> Das Arbeitsverhältnis endet mit Ablauf der geltenden Kündigungsfrist.</li>
              <li><strong>Außerordentliche Kündigung:</strong> Das Arbeitsverhältnis endet sofort und setzt einen wichtigen Grund voraus.</li>
            </ul>
          </div>

          <div className="section-title">Sonderkündigungsschutz</div>
          <div className="section-info">
            <p>Bei den folgenden Personengruppen gelten besondere gesetzliche Schutzvorschriften. Eine Kündigung ist dann häufig nur mit behördlicher Zustimmung oder gar nicht möglich.</p>
            <p>Die Auswahl dient als Vorprüfung und ersetzt keine juristische Einzelfallbewertung.</p>
          </div>
          <div className="checkbox-group">
            <label className="checkbox-item"><input type="checkbox" checked={form.schwanger} onChange={(e) => setField("schwanger", e.target.checked)} /> Mitarbeiterin ist schwanger</label>
            <label className="checkbox-item"><input type="checkbox" checked={form.elternzeit} onChange={(e) => setField("elternzeit", e.target.checked)} /> Mitarbeiter befindet sich in Elternzeit</label>
            <label className="checkbox-item"><input type="checkbox" checked={form.schwerbehindert} onChange={(e) => setField("schwerbehindert", e.target.checked)} /> Mitarbeiter ist schwerbehindert</label>
            <label className="checkbox-item"><input type="checkbox" checked={form.azubi} onChange={(e) => setField("azubi", e.target.checked)} /> Mitarbeiter ist Azubi nach der Probezeit</label>
            <label className="checkbox-item"><input type="checkbox" checked={form.betriebsrat} onChange={(e) => setField("betriebsrat", e.target.checked)} /> Mitarbeiter ist Betriebsratsmitglied / JAV</label>
          </div>

          {form.kuendigungsart === "ordentlich" && (
            <>
              <div className="section-title">Prüfung ordentliche Kündigung</div>
              <div className="section-info">
                <p>Der geplante Kündigungstermin muss die gesetzliche Kündigungsfrist einhalten und auf einen zulässigen Stichtag fallen.</p>
                <p>Dabei werden Eintrittsdatum und Prüfdatum berücksichtigt, damit die Frist nach §622 BGB nachvollziehbar geprüft wird.</p>
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
                <div>
                  <label htmlFor="abmahnung">Abmahnung vorhanden?</label>
                  <select id="abmahnung" value={form.abmahnung} onChange={(e) => setField("abmahnung", e.target.value as JaNein)}>
                    <option value="nein">Nein</option>
                    <option value="ja">Ja</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="betriebsratAnhoerung">Betriebsrat angehört?</label>
                  <select id="betriebsratAnhoerung" value={form.betriebsratAnhoerung} onChange={(e) => setField("betriebsratAnhoerung", e.target.value as JaNein)}>
                    <option value="nein">Nein</option>
                    <option value="ja">Ja</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {form.kuendigungsart === "ausserordentlich" && (
            <>
              <div className="section-title">Prüfung außerordentliche Kündigung</div>
              <div className="section-info">
                <p>Eine außerordentliche Kündigung beendet das Arbeitsverhältnis sofort und erfordert einen wichtigen, nachweisbaren Grund.</p>
                <p>Der Sachverhalt sollte so konkret wie möglich dokumentiert werden, um die Wirksamkeit der Maßnahme zu sichern.</p>
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
                  <textarea id="begruendung" placeholder="Sachverhalt möglichst genau beschreiben" value={form.begruendung} onChange={(e) => setField("begruendung", e.target.value)} />
                </div>
              </div>
            </>
          )}

          <div className="actions">
            <button className="primary" type="button" onClick={pruefen}>Kündbarkeit prüfen</button>
            <button className="secondary" type="button" onClick={briefKopieren}>Kündigungsschreiben kopieren</button>
            <button className="secondary" type="button" onClick={briefAlsPdf}>PDF direkt herunterladen</button>
          </div>
          <p className="hint">Hinweis: Beim Klick auf den Button wird die PDF direkt automatisch heruntergeladen.</p>
          {pdfStatus && <p className="pdf-info">{pdfStatus}</p>}
        </section>

        <section className="card sticky-column">
          <h2>Ergebnis</h2>
          <div className={`result-box ${currentResult.statusClass}`}>
            <h3>{currentResult.statusText}</h3>
            {ergebnis ? (
              <div className="result-meta">
                <p><strong>Kündbar:</strong> {currentResult.kuendbar ? "Ja, grundsätzlich" : "Nein bzw. rechtlich kritisch"}</p>
                <p><strong>Kündigungsart:</strong> {currentResult.kuendigungsart === "ordentlich" ? "Ordentliche Kündigung" : "Außerordentliche Kündigung"}</p>
              </div>
            ) : (
              <p>Bitte links die Daten eingeben und auf „Kündbarkeit prüfen“ klicken.</p>
            )}
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

          <h2>Automatisch erzeugtes Kündigungsschreiben</h2>
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
