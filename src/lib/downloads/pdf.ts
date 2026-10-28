import "server-only";
import type { SalonGuide } from "@/lib/hairstyles/salon-guides";

function escapePdfText(value: string) {
  return value.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}

function wrap(value: string, width = 82) {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (!line || `${line} ${word}`.length <= width) line = line ? `${line} ${word}` : word;
    else { lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines;
}

export function createSalonGuidePdf(styleName: string, guide: SalonGuide) {
  const pages: string[][] = [];
  let commands: string[] = [], currentY = 742;
  const ascii = (value: string) => value.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7e\n]/g, "?");
  const line = (text: string, size: number, height: number) => {
    commands.push(`BT /F1 ${size} Tf 54 ${currentY} Td (${escapePdfText(ascii(text))}) Tj ET`);
    currentY -= height;
  };
  const newPage = () => {
    if (commands.length) pages.push(commands);
    commands = []; currentY = 742;
    for (const title of wrap(styleName, 45)) line(title, 20, 25);
    line("NEWSELF SALON DISCUSSION GUIDE", 10, 24);
  };
  newPage();
  const addBlock = (heading: string, copy: string) => {
    const lines = wrap(copy);
    if (currentY < Math.min(600, 40 + lines.length * 13)) newPage();
    line(heading, 12, 18);
    for (const text of lines) {
      if (currentY < 65) { newPage(); line(`${heading} (continued)`, 12, 18); }
      line(text, 9, 13);
    }
    currentY -= 14;
  };
  addBlock("Basis", guide.personalized ? "Photo-based cues and your stated preferences, interpreted through conservative discussion rules. This is not an in-person salon assessment." : "General style reference. No personal feasibility assessment is attached to this result.");
  addBlock("Target shape", guide.overview);
  addBlock("Real-world fit", guide.feasibility);
  for (const item of guide.instructions) addBlock(item.label, item.detail);
  addBlock("General styling estimate", `Approximately ${guide.dailyStylingMinutes} minutes. Ask for a demonstration; your routine may differ.`);
  addBlock("General maintenance estimate", `Discuss refreshing the cut approximately every ${guide.maintenanceWeeks} weeks.`);
  addBlock("Important", "AI-generated reference. Final measurements should be adjusted by the stylist after assessing the client's actual hair, growth pattern, density, and condition.");
  pages.push(commands);
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  pages.forEach((page, i) => {
    const stream = [...page, `BT /F1 8 Tf 54 38 Td (newself - ${i + 1} / ${pages.length}) Tj ET`].join("\n");
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`, `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`);
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
