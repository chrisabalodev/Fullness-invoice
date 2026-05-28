import { createRequire } from "node:module";

const _require = createRequire(import.meta.url);

function fmt(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("fr-FR");
}

const TYPE_LABELS: Record<string, string> = {
  facture: "FACTURE",
  facture_proforma: "FACTURE PROFORMA",
  devis: "DEVIS",
  bon_livraison: "BON DE LIVRAISON",
  avoir: "AVOIR",
};

export async function generateDocumentPdf(doc: any, company: any): Promise<Buffer> {
  const PDFDocument = _require("pdfkit") as any;

  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    const W = pdf.page.width - 80;
    const typeLabel = TYPE_LABELS[doc.type] ?? doc.type.toUpperCase();
    const currency = company.currency ?? "F CFA";

    // ── HEADER ──────────────────────────────────────────────────────────
    pdf.fontSize(18).font("Helvetica-Bold").text(company.name ?? "", 40, 40);
    if (company.description) {
      pdf.fontSize(9).font("Helvetica").text(company.description, 40);
    }
    pdf.fontSize(9).font("Helvetica");
    if (company.address) pdf.text(company.address, 40);
    if (company.phone) pdf.text(`Tél : ${company.phone}`, 40);
    if (company.fiscalNumber) pdf.text(`N° Fiscal : ${company.fiscalNumber}`, 40);
    if (company.rccm) pdf.text(`RCCM : ${company.rccm}`, 40);

    // ── DOCUMENT TYPE + NUMBER ──────────────────────────────────────────
    const headerBottom = pdf.y + 10;
    pdf
      .rect(40, headerBottom, W, 26)
      .fill("#1a1a2e")
      .fillColor("white")
      .fontSize(13)
      .font("Helvetica-Bold")
      .text(`${typeLabel}  N° ${doc.numero}`, 40, headerBottom + 6, { width: W, align: "center" })
      .fillColor("black");

    // Date / Echéance line
    pdf.y = headerBottom + 34;
    pdf.fontSize(9).font("Helvetica");
    pdf.text(`Date : ${fmtDate(doc.date)}`, 40, pdf.y, { continued: true });
    if (doc.echeance) {
      pdf.text(`   Échéance : ${fmtDate(doc.echeance)}`);
    } else {
      pdf.text("");
    }
    if (doc.modeReglement) pdf.text(`Mode de règlement : ${doc.modeReglement}`, 40);
    if (doc.conditionsPaiement) pdf.text(`Conditions : ${doc.conditionsPaiement}`, 40);
    if (doc.vendeur) pdf.text(`Vendeur : ${doc.vendeur}`, 40);
    if (doc.reference) pdf.text(`Réf. : ${doc.reference}`, 40);

    // ── CLIENT BLOCK ───────────────────────────────────────────────────
    const clientY = pdf.y + 8;
    pdf
      .rect(40, clientY, W, 18)
      .fill("#f0f0f0")
      .fillColor("black")
      .fontSize(9)
      .font("Helvetica-Bold")
      .text("DOIT :", 44, clientY + 4);
    pdf.y = clientY + 22;
    pdf.font("Helvetica");
    const client = doc.client;
    if (client) {
      pdf.text(client.name ?? "", 44);
      if (client.address) pdf.text(client.address, 44);
      if (client.city) pdf.text(client.city, 44);
      if (client.phone) pdf.text(`Tél : ${client.phone}`, 44);
      if (client.email) pdf.text(`Email : ${client.email}`, 44);
      if (client.fiscalNumber) pdf.text(`N° Fiscal : ${client.fiscalNumber}`, 44);
    }
    pdf.y += 8;

    // ── LINES TABLE ────────────────────────────────────────────────────
    const cols = { ref: 40, des: 100, qty: 295, unit: 335, pu: 375, rem: 430, mont: 470 };
    const colW = { ref: 58, des: 193, qty: 38, unit: 38, pu: 53, rem: 38, mont: 71 };

    const tableHeaderY = pdf.y;
    pdf.rect(40, tableHeaderY, W, 16).fill("#1a1a2e");
    pdf
      .fillColor("white")
      .fontSize(8)
      .font("Helvetica-Bold");
    const headers = ["RÉFERENCE", "DESIGNATION", "QTÉ", "UNITÉ", "PRIX HT", "REM%", "MONTANT"];
    const colKeys = Object.keys(cols) as Array<keyof typeof cols>;
    headers.forEach((h, i) => {
      const key = colKeys[i];
      pdf.text(h, cols[key], tableHeaderY + 4, { width: colW[key], align: i >= 2 ? "right" : "left" });
    });
    pdf.fillColor("black").font("Helvetica");

    let rowY = tableHeaderY + 18;
    const lines: any[] = doc.lines ?? [];
    lines.forEach((line, idx) => {
      if (rowY > 730) {
        pdf.addPage();
        rowY = 40;
      }
      const bg = idx % 2 === 0 ? "#ffffff" : "#f9f9f9";
      pdf.rect(40, rowY, W, 14).fill(bg);
      pdf.fillColor("black").fontSize(8).font("Helvetica");
      const montant = line.montantHt ?? (line.prixUnitaire * line.quantite * (1 - (line.remisePct ?? 0) / 100));
      pdf.text(line.articleRef ?? "", cols.ref, rowY + 3, { width: colW.ref });
      pdf.text(line.designation ?? "", cols.des, rowY + 3, { width: colW.des });
      pdf.text(String(line.quantite ?? ""), cols.qty, rowY + 3, { width: colW.qty, align: "right" });
      pdf.text(line.unite ?? "", cols.unit, rowY + 3, { width: colW.unit, align: "right" });
      pdf.text(fmt(line.prixUnitaire ?? 0), cols.pu, rowY + 3, { width: colW.pu, align: "right" });
      pdf.text(line.remisePct ? `${line.remisePct}%` : "", cols.rem, rowY + 3, { width: colW.rem, align: "right" });
      pdf.text(fmt(montant), cols.mont, rowY + 3, { width: colW.mont, align: "right" });
      rowY += 14;
    });
    pdf.rect(40, rowY, W, 1).fill("#cccccc");
    pdf.y = rowY + 8;

    // ── TOTALS ─────────────────────────────────────────────────────────
    const totX = 350;
    const totLW = 110;
    const totVW = 90;
    const totals: Array<[string, number, boolean?]> = [];
    if (doc.totalHt != null) totals.push(["Total HT", doc.totalHt]);
    if (doc.totalRemise != null && doc.totalRemise > 0) totals.push(["Remise", -doc.totalRemise]);
    if (!doc.tvaPourMemoire && doc.totalTva != null) {
      totals.push([`TVA (${company.tvaRate ?? 18}%)`, doc.totalTva]);
    } else if (doc.tvaPourMemoire) {
      totals.push(["TVA (pour mémoire)", doc.totalTva ?? 0]);
    }
    totals.push(["NET À PAYER", doc.totalTtc ?? 0, true]);

    let totY = pdf.y;
    totals.forEach(([label, value, bold]) => {
      if (bold) {
        pdf.rect(totX - 4, totY - 2, totLW + totVW + 8, 18).fill("#1a1a2e");
        pdf.fillColor("white").font("Helvetica-Bold").fontSize(10);
      } else {
        pdf.fillColor("black").font("Helvetica").fontSize(9);
      }
      pdf.text(label, totX, totY, { width: totLW });
      pdf.text(`${fmt(Math.abs(value))} ${currency}`, totX + totLW, totY, { width: totVW, align: "right" });
      totY += bold ? 20 : 14;
    });
    pdf.fillColor("black").font("Helvetica").fontSize(9);
    pdf.y = totY + 12;

    // ── BANK ACCOUNTS ──────────────────────────────────────────────────
    if (company.bankAccounts) {
      pdf.fontSize(8).text("Coordonnées bancaires :", 40);
      pdf.text(company.bankAccounts, 40, pdf.y, { lineGap: 1 });
      pdf.y += 6;
    }

    // ── NOTES ──────────────────────────────────────────────────────────
    if (doc.notes) {
      pdf.fontSize(8).text(`Notes : ${doc.notes}`, 40);
    }

    // ── LEGAL FOOTER ───────────────────────────────────────────────────
    if (company.legalFooter) {
      const footerY = pdf.page.height - 60;
      pdf
        .fontSize(7)
        .fillColor("#666666")
        .text(company.legalFooter, 40, footerY, { width: W, align: "center" });
    }

    pdf.end();
  });
}
