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
  const commands: string[] = ["BT", "/F1 21 Tf", "54 742 Td", `(${escapePdfText(styleName)}) Tj`, "0 -28 Td", "/F1 10 Tf", "(NEWSELF SALON GUIDE) Tj"];
  let currentY = 714;
  const addBlock = (heading: string, copy: string) => {
    commands.push(`0 -${currentY === 714 ? 30 : 18} Td`, "/F1 12 Tf", `(${escapePdfText(heading)}) Tj`, "0 -16 Td", "/F1 9 Tf");
    currentY -= currentY === 714 ? 46 : 34;
    for (const line of wrap(copy)) { commands.push(`(${escapePdfText(line)}) Tj`, "0 -13 Td"); currentY -= 13; }
  };
  addBlock("Target shape", guide.overview);
  addBlock("Real-world fit", guide.feasibility);
  for (const item of guide.instructions) addBlock(item.label, item.detail);
  addBlock("Daily styling", `Approximately ${guide.dailyStylingMinutes} minutes.`);
  addBlock("Maintenance", `Refresh the cut approximately every ${guide.maintenanceWeeks} weeks.`);
  addBlock("Important", "AI-generated reference. Final measurements should be adjusted by the stylist after assessing the client's actual hair, growth pattern, density, and condition.");
  commands.push("ET");
  const stream = commands.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${new TextEncoder().encode(stream).length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(new TextEncoder().encode(pdf).length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
