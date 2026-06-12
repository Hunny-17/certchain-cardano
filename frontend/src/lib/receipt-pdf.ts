import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

// Noto Sans v42 — Vietnamese-capable, pinned version
// Source: fonts.googleapis.com/css2?family=Noto+Sans:wght@400;700&subset=vietnamese
const NOTO_SANS_REGULAR =
  "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyD9A99d.ttf";
const NOTO_SANS_BOLD =
  "https://fonts.gstatic.com/s/notosans/v42/o-0mIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjcz6L1SoM-jCpoiyAaBN9d.ttf";

const FONT_TIMEOUT_MS = 10_000;

export interface ReceiptData {
  txHash: string;
  policyId?: string;
  assetName?: string;
  recipientName?: string;
  certTitle?: string;
  certType?: string;
  institution?: string;
  issueDate?: string;
  verifiedAt: Date;
  network: "preprod" | "mainnet";
  cardanoscanUrl: string;
  certchainVerifyUrl: string;
}

export interface ReceiptResult {
  pdfBytes: Uint8Array;
  vietnameseSupport: boolean;
}

async function fetchFontBytes(url: string): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), FONT_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(tid);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.arrayBuffer();
  } catch (err) {
    clearTimeout(tid);
    throw err;
  }
}

async function loadFonts(doc: PDFDocument): Promise<{
  regular: PDFFont;
  bold: PDFFont;
  mono: PDFFont;
  vietnameseSupport: boolean;
}> {
  const mono = await doc.embedFont(StandardFonts.Courier);

  try {
    const [regularBytes, boldBytes] = await Promise.all([
      fetchFontBytes(NOTO_SANS_REGULAR),
      fetchFontBytes(NOTO_SANS_BOLD),
    ]);
    const regular = await doc.embedFont(regularBytes);
    const bold = await doc.embedFont(boldBytes);
    return { regular, bold, mono, vietnameseSupport: true };
  } catch (err) {
    console.warn("Noto Sans CDN unavailable, falling back to Helvetica:", err);
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return { regular, bold, mono, vietnameseSupport: false };
  }
}

// Colors
const BLUE = rgb(0, 0.2, 0.678);
const GREEN = rgb(0.0, 0.59, 0.33);
const RED = rgb(0.77, 0.19, 0.19);
const GRAY = rgb(0.45, 0.45, 0.45);
const LIGHT_GRAY = rgb(0.85, 0.85, 0.85);
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const GREEN_BG = rgb(0.93, 0.98, 0.95);

export async function generateReceipt(data: ReceiptData): Promise<ReceiptResult> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  const { regular, bold, mono, vietnameseSupport } = await loadFonts(doc);

  const page = doc.addPage([595.28, 841.89]); // A4 portrait
  const { width } = page.getSize();
  const margin = 50;
  const contentWidth = width - margin * 2;
  let y = 790;

  const drawDivider = (yPos: number) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: margin + contentWidth, y: yPos },
      thickness: 0.5,
      color: LIGHT_GRAY,
    });
  };

  const drawField = (label: string, value: string, yPos: number, isLong = false) => {
    page.drawText(label, {
      x: margin, y: yPos, size: 9, font: bold, color: GRAY,
    });
    const displayFont = isLong ? mono : regular;
    const displaySize = isLong ? 7.5 : 10;
    const displayValue = isLong && value.length > 56 ? value.slice(0, 56) + "…" : value;
    page.drawText(displayValue || "—", {
      x: margin + 140, y: yPos, size: displaySize, font: displayFont, color: BLACK,
    });
    return yPos - 20;
  };

  // ─── Header ────────────────────────────────────────────────
  page.drawText("CertChain", {
    x: margin, y, size: 26, font: bold, color: BLUE,
  });
  page.drawText("Verification Receipt", {
    x: margin + 155, y: y + 4, size: 13, font: regular, color: GRAY,
  });

  y -= 30;

  // Status badge
  page.drawRectangle({
    x: margin, y: y - 6, width: 220, height: 26,
    color: GREEN_BG,
    borderColor: GREEN, borderWidth: 1,
  });
  page.drawText("✓  AUTHENTIC CREDENTIAL", {
    x: margin + 10, y: y + 3, size: 11, font: bold, color: GREEN,
  });

  // Network badge (top right)
  const networkLabel = data.network === "preprod" ? "PREPROD TESTNET" : "MAINNET";
  const networkColor = data.network === "preprod" ? RED : GREEN;
  page.drawRectangle({
    x: margin + contentWidth - 120, y: y - 6, width: 120, height: 26,
    color: WHITE, borderColor: networkColor, borderWidth: 1,
  });
  page.drawText(networkLabel, {
    x: margin + contentWidth - 110, y: y + 3, size: 9, font: bold, color: networkColor,
  });

  y -= 40;
  drawDivider(y);
  y -= 18;

  // ─── [01] Credential Details ────────────────────────────────
  page.drawText("[01]  Credential Details", {
    x: margin, y, size: 11, font: bold, color: BLACK,
  });
  y -= 22;

  y = drawField("Recipient", data.recipientName ?? "—", y);
  y = drawField("Title", data.certTitle ?? "—", y);
  y = drawField("Type", data.certType ?? "—", y);
  y = drawField("Institution", data.institution ?? "—", y);
  y = drawField("Issue Date", data.issueDate ?? "—", y);

  y -= 10;
  drawDivider(y);
  y -= 18;

  // ─── [02] Blockchain Proof ──────────────────────────────────
  page.drawText("[02]  Blockchain Proof", {
    x: margin, y, size: 11, font: bold, color: BLACK,
  });
  y -= 22;

  y = drawField("Network", data.network === "preprod" ? "Cardano Preprod" : "Cardano Mainnet", y);
  y = drawField("Tx Hash", data.txHash, y, true);
  y = drawField("Asset Name", data.assetName ?? "—", y);
  y = drawField("Policy ID", data.policyId ?? "—", y, true);

  y -= 10;
  drawDivider(y);
  y -= 18;

  // ─── [03] Verification Metadata ─────────────────────────────
  page.drawText("[03]  Verification Metadata", {
    x: margin, y, size: 11, font: bold, color: BLACK,
  });
  y -= 22;

  const verifiedAtStr = data.verifiedAt.toISOString().replace("T", "  ").replace(/\.\d+Z$/, " UTC");
  y = drawField("Verified At", verifiedAtStr, y);
  y = drawField("Verified By", "Public — no account required", y);

  y -= 10;
  drawDivider(y);
  y -= 18;

  // ─── [04] Independent Verification ──────────────────────────
  page.drawText("[04]  Verify Independently", {
    x: margin, y, size: 11, font: bold, color: BLACK,
  });
  y -= 20;

  page.drawText("Cardanoscan:", { x: margin, y, size: 9, font: bold, color: GRAY });
  const cUrl = data.cardanoscanUrl.length > 70 ? data.cardanoscanUrl.slice(0, 70) + "…" : data.cardanoscanUrl;
  page.drawText(cUrl, { x: margin + 90, y, size: 8, font: mono, color: BLUE });
  y -= 18;

  page.drawText("CertChain:", { x: margin, y, size: 9, font: bold, color: GRAY });
  const vUrl = data.certchainVerifyUrl.length > 70 ? data.certchainVerifyUrl.slice(0, 70) + "…" : data.certchainVerifyUrl;
  page.drawText(vUrl, { x: margin + 90, y, size: 8, font: mono, color: BLUE });

  // ─── Footer ─────────────────────────────────────────────────
  drawDivider(50);
  page.drawText(
    "Generated by CertChain — certchain-cardano.vercel.app  ·  This receipt is a verification record, not a legal document.",
    { x: margin, y: 35, size: 7, font: regular, color: GRAY }
  );
  page.drawText(
    `Generated: ${data.verifiedAt.toUTCString()}`,
    { x: margin, y: 22, size: 7, font: mono, color: LIGHT_GRAY }
  );

  return { pdfBytes: await doc.save(), vietnameseSupport };
}
