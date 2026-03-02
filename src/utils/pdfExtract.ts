// PDF text extraction using PDF.js loaded from CDN
// We inject the script dynamically to avoid bundling the worker

declare global {
  interface Window {
    pdfjsLib: {
      getDocument: (params: { data: ArrayBuffer }) => { promise: Promise<PDFDocumentProxy> };
      GlobalWorkerOptions: { workerSrc: string };
    };
  }
}

interface PDFDocumentProxy {
  numPages: number;
  getPage: (pageNum: number) => Promise<PDFPageProxy>;
}

interface PDFPageProxy {
  getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
  view: number[]; // [x0, y0, x1, y1] page dimensions
}

let pdfJsLoaded = false;
const PDFJS_CDN = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

async function ensurePdfJs(): Promise<void> {
  if (pdfJsLoaded && window.pdfjsLib) return;

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = PDFJS_CDN;
    script.onload = () => {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      pdfJsLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load PDF.js from CDN"));
    document.head.appendChild(script);
  });
}

export interface PDFFlowInfo {
  pageNumber: number;
  title: string;
  charCount: number;
}

// Extract text from specific pages of a PDF (1-indexed, inclusive)
export async function extractTextFromPDFPages(file: File, startPage: number, endPage: number): Promise<string> {
  await ensurePdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];

  const start = Math.max(1, startPage);
  const end = Math.min(pdf.numPages, endPage);

  for (let i = start; i <= end; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const lines = new Map<number, string[]>();
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(item.str);
    }
    const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
    const pageText = sortedYs
      .map((y) => lines.get(y)!.join(" ").trim())
      .filter((line) => line.length > 0)
      .join("\n");
    pageTexts.push(`--- Page ${i} ---\n${pageText}`);
  }
  return pageTexts.join("\n\n");
}

// Detect distinct process flows within a PDF by scanning page headers.
// Uses a two-pass approach: first collects all top-of-page text items across pages,
// then identifies common navigation/header text to filter out, leaving unique flow titles.
export async function detectPDFFlows(file: File): Promise<PDFFlowInfo[]> {
  await ensurePdfJs();
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  if (pdf.numPages <= 1) return []; // Single page — no multi-flow detection needed

  // ── Phase 1: Collect top-of-page text items for each page ──
  const pageData: Array<{
    pageNumber: number;
    items: string[];        // individual text items from top ~25% of page
    charCount: number;
  }> = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageHeight = page.view[3] ?? 800;

    // Get text items from top 25% of page (PDF coordinates: 0=bottom, height=top)
    const topItems = textContent.items
      .filter((item) => item.transform[5] > pageHeight * 0.75)
      .sort((a, b) => b.transform[5] - a.transform[5])
      .map((item) => item.str.trim())
      .filter((s) => s.length > 2); // Ignore tiny fragments

    const totalChars = textContent.items.reduce((sum, item) => sum + item.str.length, 0);
    pageData.push({ pageNumber: i, items: topItems, charCount: totalChars });
  }

  // ── Phase 2: Build frequency map — how many pages each text item appears on ──
  const textFreq = new Map<string, number>();
  for (const pd of pageData) {
    const seen = new Set<string>();
    for (const item of pd.items) {
      if (!seen.has(item)) {
        seen.add(item);
        textFreq.set(item, (textFreq.get(item) ?? 0) + 1);
      }
    }
  }

  // Items appearing on > 50% of pages are common navigation/header text
  const threshold = Math.max(2, Math.ceil(pdf.numPages * 0.5));

  // ── Phase 3: For each page, find unique (non-common) items as flow title ──
  const rawFlows: PDFFlowInfo[] = [];
  for (const pd of pageData) {
    const uniqueItems = pd.items.filter((item) => (textFreq.get(item) ?? 0) < threshold);

    // Priority 1: Numbered process IDs (e.g., "1.3.3 Conduct Sales-Led Outreach")
    const numbered = uniqueItems.find((item) => /^\d+\.\d+/.test(item));
    // Priority 2: Title-like text (Capitalized words, substantial length)
    const titleLike = uniqueItems.find(
      (item) => /^[A-Z][a-z]+\s+[A-Z]/.test(item) && item.length > 5
    );
    // Priority 3: Any substantial unique text
    const anySubstantial = uniqueItems.find(
      (item) => item.length > 5 && !/^\d+$/.test(item) && !/^[a-z]/.test(item)
    );

    const title = numbered ?? titleLike ?? anySubstantial ?? `Page ${pd.pageNumber}`;
    rawFlows.push({
      pageNumber: pd.pageNumber,
      title: title.replace(/\s+/g, " ").trim(),
      charCount: pd.charCount,
    });
  }

  // ── Phase 4: Group consecutive pages with the same title ──
  const grouped: Array<{ title: string; startPage: number; endPage: number; totalChars: number }> = [];
  for (const flow of rawFlows) {
    const last = grouped[grouped.length - 1];
    // Untitled pages ("Page N") merge into adjacent group
    if (last && (last.title === flow.title || flow.title === `Page ${flow.pageNumber}`)) {
      last.endPage = flow.pageNumber;
      last.totalChars += flow.charCount;
    } else if (grouped.length === 0 && flow.title === `Page ${flow.pageNumber}`) {
      // First page is untitled — create a placeholder that will merge with next
      grouped.push({
        title: flow.title,
        startPage: flow.pageNumber,
        endPage: flow.pageNumber,
        totalChars: flow.charCount,
      });
    } else {
      // Check if previous group was just untitled pages — merge forward
      if (last && last.title.startsWith("Page ")) {
        last.title = flow.title;
        last.endPage = flow.pageNumber;
        last.totalChars += flow.charCount;
      } else {
        grouped.push({
          title: flow.title,
          startPage: flow.pageNumber,
          endPage: flow.pageNumber,
          totalChars: flow.charCount,
        });
      }
    }
  }

  // Only return multi-flow result if we found at least 2 distinct groups
  if (grouped.length <= 1) return [];

  return grouped.map((g) => ({
    pageNumber: g.startPage,
    title: `${g.title} (pages ${g.startPage}–${g.endPage})`,
    charCount: g.totalChars,
  }));
}

export async function extractTextFromPDF(file: File): Promise<string> {
  await ensurePdfJs();

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // Group items by their Y position (line) to reconstruct readable text
    const lines = new Map<number, string[]>();

    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(item.str);
    }

    // Sort by Y descending (top of page first) and join
    const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
    const pageText = sortedYs
      .map((y) => lines.get(y)!.join(" ").trim())
      .filter((line) => line.length > 0)
      .join("\n");

    pageTexts.push(`--- Page ${i} ---\n${pageText}`);
  }

  return pageTexts.join("\n\n");
}

export async function extractTextFromArrayBuffer(buffer: ArrayBuffer): Promise<string> {
  await ensurePdfJs();

  const pdf = await window.pdfjsLib.getDocument({ data: buffer }).promise;
  const pageTexts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    const lines = new Map<number, string[]>();
    for (const item of textContent.items) {
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push(item.str);
    }

    const sortedYs = Array.from(lines.keys()).sort((a, b) => b - a);
    const pageText = sortedYs
      .map((y) => lines.get(y)!.join(" ").trim())
      .filter((line) => line.length > 0)
      .join("\n");

    pageTexts.push(`--- Page ${i} ---\n${pageText}`);
  }

  return pageTexts.join("\n\n");
}
