import { useEffect, useLayoutEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import {
  useGetDocument,
  useGetCompany,
} from "@workspace/api-client-react";
import { formatMoney, formatMoneyDecimal, formatDate, DOCUMENT_TYPE_TITLE_PRINT } from "@/lib/format";
import { numberToFrenchWords } from "@/lib/number-to-words";

const COPY_LABELS = ["ORIGINAL", "DUPLICATA", "TRIPLICATA", "QUADRUPLICATA"];

export default function DocumentPrintPage({ id }: { id: number }) {
  const { data: doc } = useGetDocument(id);
  const { data: company } = useGetCompany();
  const barcodeRef = useRef<HTMLCanvasElement>(null);
  const [copyLabel, setCopyLabel] = useState("ORIGINAL");

  useLayoutEffect(() => {
    if (doc && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, doc.numero, {
          format: "CODE128",
          width: 1.6,
          height: 50,
          displayValue: false,
          margin: 0,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        /* ignore */
      }
    }
  }, [doc]);

  useEffect(() => {}, [doc, company]);

  if (!doc || !company) {
    return <p style={{ padding: 20 }}>Chargement…</p>;
  }

  const toolbar = (
    <div className="print-toolbar no-print">
      <label htmlFor="copy-label-select" style={{ fontWeight: 600, marginRight: 8 }}>
        Type de copie :
      </label>
      <select
        id="copy-label-select"
        value={copyLabel}
        onChange={(e) => setCopyLabel(e.target.value)}
        style={{
          padding: "4px 10px",
          borderRadius: 4,
          border: "1px solid #ccc",
          fontSize: 14,
          marginRight: 16,
        }}
      >
        {COPY_LABELS.map((l) => (
          <option key={l} value={l}>{l}</option>
        ))}
      </select>
      <button
        onClick={() => window.print()}
        style={{
          padding: "6px 18px",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 4,
          fontWeight: 600,
          cursor: "pointer",
          fontSize: 14,
        }}
      >
        Imprimer / PDF
      </button>
    </div>
  );

  const showHeader = company.showHeader !== false;
  const title = DOCUMENT_TYPE_TITLE_PRINT[doc.type] ?? doc.type.toUpperCase();
  const isDevis = doc.type === "devis";
  const isProforma = doc.type === "facture_proforma";
  const isAvoir = doc.type === "avoir";
  const isBL = doc.type === "bon_livraison";
  const showPrices = !isBL;
  const arreteLabel = isDevis
    ? "Arrêté le présent devis à la somme de :"
    : isProforma
    ? "Arrêtée la présente facture proforma à la somme de :"
    : isAvoir
    ? "Arrêté le présent avoir à la somme de :"
    : "Arrêtée la présente facture à la somme de :";
  const doitLabel = isAvoir ? "AVOIR :" : isBL ? "LIVRER A :" : "DOIT :";

  const totalRound = Math.round(doc.totalTtc);
  const enLettres = numberToFrenchWords(totalRound).trim();

  const bankLines = (company.bankAccounts ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  const tvaLabel =
    doc.lines.length > 0 && doc.lines.every((l) => l.tvaRate === doc.lines[0]?.tvaRate)
      ? `${doc.lines[0]?.tvaRate ?? company.tvaRate ?? 18}%`
      : "";
  const showReglements = (doc.type === "facture" || doc.type === "facture_proforma")
    && doc.reglements.length > 0;

  return (
    <>
      <style>{PRINT_CSS}</style>
      {toolbar}
      <div className="print-page">
        {showHeader && (
          <div className="print-top">
            <div className="company-block">
              <div className="company-name">{company.name}</div>
              <div className="company-info">
                <div>{company.address}</div>
                <div>Tél : {company.phone}</div>
                <div>N° Fiscal : {company.fiscalNumber}</div>
                <div>RCCM : {company.rccm}</div>
                {bankLines.map((line, i) => (
                  <div key={i}>{line}</div>
                ))}
              </div>
            </div>
            <div className="barcode-block">
              <canvas ref={barcodeRef} className="barcode" />
              <div className="barcode-numero">{doc.numero}</div>
              <div className="comptoir-box">
                <div className="comptoir-name">{company.comptoirName}</div>
                <div>{company.comptoirCity}</div>
                <div>Tél : {company.comptoirPhone}</div>
              </div>
            </div>
            <div className="original-block">
              <div className="original-text">{copyLabel}</div>
            </div>
          </div>
        )}

        <div className="title-band">
          <div className="title-text">{title}</div>
          <div className="title-meta">
            <span>N° : <strong>{doc.numero}</strong></span>
            {doc.relatedDocumentNumero && (
              <span>Issu de : <strong>{doc.relatedDocumentNumero}</strong></span>
            )}
            {doc.echeance && (
              <span>Échéance : <strong>{formatDate(doc.echeance)}</strong></span>
            )}
            <span>Date : <strong>{formatDate(doc.date)}</strong></span>
          </div>
        </div>

        <div className="client-row">
          <div className="client-label">{doitLabel}</div>
          <div className="client-info">
            <div className="client-name">{doc.client.name}</div>
            <div className="client-meta">
              {doc.client.address && <span>{doc.client.address}</span>}
              {doc.client.city && <span> — {doc.client.city}</span>}
              {doc.client.phone && <span> · Tél : {doc.client.phone}</span>}
              {doc.client.fiscalNumber && <span> · NIF : {doc.client.fiscalNumber}</span>}
            </div>
          </div>
        </div>

        <div className="lines-wrap">
        <table className="lines-table">
          <thead>
            <tr>
              <th className="col-ref">REFERENCE</th>
              <th className="col-des">DESIGNATION</th>
              <th className="col-num col-sm">QTE</th>
              <th className="col-num">UNITE</th>
              {isBL && <th className="col-num">DEPOT</th>}
              {showPrices && (
                <>
                  <th className="col-num">PRIX HT</th>
                  <th className="col-num col-sm">R(%)</th>
                  <th className="col-num">MONTANT HT</th>
                  <th className="col-num col-sm">TVA%</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.id}>
                <td className="col-ref mono">{l.reference}</td>
                <td className="col-des">{l.designation}</td>
                <td className="col-num col-sm">{formatMoney(l.quantite)}</td>
                <td className="col-num">{l.unite}</td>
                {isBL && <td className="col-num">{l.depot ?? ""}</td>}
                {showPrices && (
                  <>
                    <td className="col-num">{formatMoneyDecimal(l.prixUnitaire)}</td>
                    <td className="col-num col-sm">{formatMoney(l.remisePct)}</td>
                    <td className="col-num">{formatMoneyDecimal(l.montantHt)}</td>
                    <td className="col-num col-sm">{l.tvaRate}</td>
                  </>
                )}
              </tr>
            ))}
            {Array.from({ length: Math.max(0, 12 - doc.lines.length) }).map((_, i) => (
              <tr key={`spacer-${i}`} className="spacer">
                <td colSpan={isBL ? 5 : 8}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {showPrices && (
          <div className="bottom-row">
            <div className="lettres-box">
              <div className="lettres-label">{arreteLabel}</div>
              <div className="lettres-text">
                {enLettres} francs cfa.
              </div>
              <div className="meta-line">
                {doc.vendeur && <span>Vendeur : {doc.vendeur}</span>}
                {doc.reference && <span>REF : {doc.reference}</span>}
                {doc.modeReglement && <span>Mode de règlement : {doc.modeReglement}</span>}
              </div>
              {doc.conditionsPaiement && (
                <div className="conditions-line">
                  Conditions de paiement : {doc.conditionsPaiement}
                </div>
              )}
              {showReglements && (
                <div className="reglements-box">
                  <div className="reglements-title">RÈGLEMENTS REÇUS</div>
                  <table className="reglements-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Mode</th>
                        <th>Référence</th>
                        <th className="right">Montant</th>
                      </tr>
                    </thead>
                    <tbody>
                      {doc.reglements.map((r) => (
                        <tr key={r.id}>
                          <td>{formatDate(r.date)}</td>
                          <td>{r.mode}</td>
                          <td>{r.reference ?? ""}</td>
                          <td className="right">{formatMoneyDecimal(r.montant)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="totals-box">
              <div className="totals-row">
                <span>Total HT (F CFA)</span>
                <span className="num">{formatMoneyDecimal(doc.totalHt)}</span>
              </div> 
              <div className="totals-row">
                <span>Total Remise (F CFA)</span>
                <span className="num">{formatMoneyDecimal(doc.totalRemise)}</span>
              </div>
              <div className="totals-row">
                <span>
                  {doc.tvaPourMemoire
                    ? `TVA ${tvaLabel} pour mémoire (F CFA)`
                    : `Total TVA ${tvaLabel} (F CFA)`}
                </span>
                <span className="num">{formatMoneyDecimal(doc.totalTva)}</span>
              </div>
              <div className="totals-grand">
                <span>NET A PAYER (F CFA)</span>
                <span className="num">{formatMoneyDecimal(doc.totalTtc)}</span>
              </div>
              {doc.tvaPourMemoire && (
                <div className="memo-mention">
                  TVA pour mémoire — non incluse dans le net à payer.
                </div>
              )}
            </div>
          </div>
        )}

        {isBL && (
          <div className="signature-row">
            <div className="signature-cell">
              <div className="signature-label">Cachet et signature</div>
            </div>
            <div className="signature-cell">
              <div className="signature-label">Vendeur</div>
              <div className="signature-value">{doc.vendeur ?? ""}</div>
            </div>
            <div className="signature-cell">
              <div className="signature-label">Magasin</div>
            </div>
            <div className="signature-cell">
              <div className="signature-label">Client</div>
            </div>
          </div>
        )}

        {company.legalFooter && (
          <div className="legal-footer">{company.legalFooter}</div>
        )}
      </div>
    </>
  );
}

const PRINT_CSS = `
  @page { size: A4; margin: 12mm; }
  html, body { background: #f3f3f3; margin: 0; padding: 0; }
  .print-page {
    background: #fff;
    color: #000;
    width: 210mm;
    min-height: 297mm;
    padding: 12mm;
    margin: 16px auto;
    box-sizing: border-box;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.3;
    border-radius: 14px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.13);
  }
  @media print {
    html, body { background: #fff; }
    .print-page { box-shadow: none; margin: 0; width: auto; min-height: auto; padding: 0; }
    .no-print { display: none !important; }
  }

  .print-toolbar {
    display: flex;
    align-items: center;
    padding: 10px 20px;
    background: #f5f5f5;
    border-bottom: 1px solid #ddd;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
  }

  .print-top {
    display: grid;
    grid-template-columns: 1fr auto 110px;
    gap: 14px;
    align-items: flex-start;
    border-bottom: 1.5px solid #000;
    padding-bottom: 8px;
  }
  .company-name {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 0.5px;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .company-info { font-size: 8.5pt; line-height: 1.4; font-family: 'Courier New', monospace; }
  .barcode-block { display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .barcode { display: block; }
  .barcode-numero { font-family: 'Courier New', monospace; font-size: 9pt; letter-spacing: 1px; }
  .comptoir-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 4px 10px;
    text-align: center;
    font-size: 8.5pt;
    margin-top: 4px;
    min-width: 200px;
  }
  .comptoir-name { font-weight: 700; text-transform: uppercase; font-size: 9pt; }
  .original-block { display: flex; justify-content: flex-end; padding-top: 4px; }
  .original-text { font-style: italic; font-weight: 700; font-size: 12pt; }

  .title-band {
    background: #000;
    color: #fff;
    margin-top: 6px;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .title-text {
    font-size: 16pt;
    font-weight: 800;
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .title-meta { font-size: 9pt; display: flex; gap: 18px; }
  .title-meta strong { font-weight: 700; }

  .client-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid #000;
    border-radius: 8px;
    padding: 6px 10px;
  }
  .client-label { font-weight: 700; font-size: 10pt; }
  .client-name { font-weight: 700; text-transform: uppercase; font-size: 11pt; }
  .client-meta { font-size: 9pt; color: #222; }

  .lines-wrap {
    margin-top: 6px;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #000;
  }
  .lines-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .lines-table th, .lines-table td {
    border: 1px solid #000;
    padding: 3px 5px;
    vertical-align: top;
  }
  .lines-table tr > th:first-child,
  .lines-table tr > td:first-child { border-left: none; }
  .lines-table tr > th:last-child,
  .lines-table tr > td:last-child { border-right: none; }
  .lines-table thead tr:first-child th { border-top: none; }
  .lines-table thead th {
    background: #f0f0f0;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 8.5pt;
    text-align: center;
  }
  .lines-table .col-num { text-align: right; white-space: nowrap; width: 70px; }
  .lines-table .col-sm { width: 42px; }
  .lines-table .col-ref { width: 80px; }
  .lines-table .col-des { width: auto; }
  .mono { font-family: 'Courier New', monospace; font-size: 8.5pt; }
  .lines-table .spacer td { color: transparent; border-top: none; border-bottom: none; }
  .lines-table tbody tr:last-child td { border-bottom: 1px solid #000; }

  .bottom-row {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 12px;
    margin-top: 8px;
    align-items: stretch;
  }
  .lettres-box {
    border: 1px solid #000;
    border-radius: 8px;
    padding: 8px 10px;
    font-size: 9pt;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .lettres-label { font-weight: 700; }
  .lettres-text { font-style: italic; margin-top: 4px; flex: 1; }
  .meta-line { display: flex; gap: 20px; margin-top: 8px; font-size: 8.5pt; color: #333; }

  .totals-box { border: 1px solid #000; border-radius: 8px; overflow: hidden; }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 10px;
    border-bottom: 1px solid #000;
    font-size: 9pt;
  }
  .totals-grand {
    display: flex;
    justify-content: space-between;
    padding: 8px 10px;
    background: #000;
    color: #fff;
    font-weight: 800;
    font-size: 11pt;
  }
  .num { font-family: 'Courier New', monospace; tabular-nums: true; }
  .memo-mention { padding: 4px 10px; font-size: 8pt; font-style: italic; color: #444; border-top: 1px solid #999; }

  .conditions-line {
    margin-top: 6px;
    font-size: 8.5pt;
    font-style: italic;
    color: #222;
    border-top: 1px dashed #999;
    padding-top: 4px;
  }

  .reglements-box { margin-top: 8px; border: 1px solid #000; border-radius: 8px; overflow: hidden; }
  .reglements-title {
    background: #f0f0f0;
    padding: 3px 8px;
    font-weight: 700;
    text-transform: uppercase;
    font-size: 8.5pt;
    border-bottom: 1px solid #000;
  }
  .reglements-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  .reglements-table th, .reglements-table td {
    padding: 2px 6px;
    border-bottom: 1px solid #ddd;
    text-align: left;
  }
  .reglements-table thead th { font-weight: 700; background: #f8f8f8; }
  .reglements-table .right { text-align: right; font-family: 'Courier New', monospace; }
  .reglements-table tbody tr:last-child td { border-bottom: none; }

  .signature-row {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-top: 10px;
    border: 1px solid #000;
    border-radius: 8px;
    overflow: hidden;
  }
  .signature-cell {
    border-right: 1px solid #000;
    padding: 6px 10px;
    min-height: 70px;
    font-size: 9pt;
  }
  .signature-cell:last-child { border-right: none; }
  .signature-label { font-weight: 700; text-transform: uppercase; font-size: 8.5pt; }
  .signature-value { padding-top: 4px; font-style: italic; }

  .legal-footer {
    margin-top: 8px;
    text-align: center;
    font-size: 8pt;
    font-style: italic;
    color: #444;
    border-top: 1px solid #999;
    padding-top: 4px;
  }
`;
