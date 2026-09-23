import { unzipSync, strFromU8 } from "fflate";
function xml(bytes: Uint8Array) {
  const text = strFromU8(bytes);
  if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error("Документ содержит неподдерживаемую XML-разметку.");
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Повреждённая структура документа.");
  return doc;
}
export async function readDocument(file: File): Promise<string> {
  if (file.size > 10 * 1024 * 1024) throw new Error("Максимальный размер — 10 МБ.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "txt" || extension === "csv") return file.text();
  if (extension === "pdf") {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    const task = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
    try {
      const pdf = await task.promise;
      if (pdf.numPages > 50) throw new Error("Разделите PDF на файлы до 50 страниц.");
      const lines: string[] = [];
      for (let n = 1; n <= pdf.numPages; n++) {
        const page = await pdf.getPage(n);
        const content = await page.getTextContent();
        let line = "";
        for (const item of content.items) if ("str" in item) {
          line += item.str + " ";
          if (item.hasEOL) { lines.push(line); line = ""; }
        }
        if (line.trim()) lines.push(line);
        page.cleanup();
      }
      const text = lines.join("\n");
      if (!text.trim()) throw new Error("В PDF нет текстового слоя. Загрузите фото маркировки в «Поиск по фото» или вставьте список вручную.");
      return text;
    } finally { await task.destroy(); }
  }
  if (extension !== "xlsx" && extension !== "docx") throw new Error("Поддерживаются XLSX, DOCX, PDF, CSV и TXT. Старые XLS/DOC пересохраните в XLSX/DOCX.");
  let total = 0;
  const archive = unzipSync(new Uint8Array(await file.arrayBuffer()), { filter: entry => {
    if (!/^(word\/document\.xml|xl\/sharedStrings\.xml|xl\/worksheets\/sheet\d+\.xml)$/.test(entry.name)) return false;
    total += entry.originalSize;
    if (entry.originalSize > 8 * 1024 * 1024 || total > 20 * 1024 * 1024) throw new Error("Документ слишком большой после распаковки.");
    return true;
  }});
  if (extension === "docx") {
    if (!archive["word/document.xml"]) throw new Error("Не удалось прочитать DOCX.");
    return [...xml(archive["word/document.xml"]).getElementsByTagNameNS("*","p")].map(p=>
      [...p.getElementsByTagNameNS("*","t")].map(t=>t.textContent||"").join("")).join("\n");
  }
  const shared = archive["xl/sharedStrings.xml"] ? [...xml(archive["xl/sharedStrings.xml"]).getElementsByTagNameNS("*","si")].map(s=>s.textContent||"") : [];
  const rows: string[] = [];
  for (const [name, bytes] of Object.entries(archive)) if (name.startsWith("xl/worksheets/")) {
    for (const row of xml(bytes).getElementsByTagNameNS("*","row")) {
      const cells = [...row.getElementsByTagNameNS("*","c")].map(c=>{
        const value = c.getElementsByTagNameNS("*","v")[0]?.textContent||"";
        return c.getAttribute("t") === "s" ? shared[Number(value)]||"" : c.getAttribute("t") === "inlineStr" ? c.textContent||"" : value;
      });
      rows.push(cells.join("\t"));
    }
  }
  if (!rows.length) throw new Error("Таблица не содержит читаемых строк.");
  return rows.join("\n");
}
