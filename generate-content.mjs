import fs from "node:fs";

const sourcePath = "C:/Users/miguel/.codex/attachments/2af20f42-8f52-498d-b71f-e79ab3295bda/Texto colado.txt";
const raw = fs.readFileSync(sourcePath, "utf8").replace(/\r/g, "");
const start = raw.indexOf("Enquanto Ainda Não Tem Nome");
if (start < 0) throw new Error("Título do manuscrito não encontrado");
const lines = raw.slice(start).split("\n").map((line) => line.trim()).filter(Boolean);

const manuscript = {
  title: lines.shift(),
  dedication: lines.shift(),
  author: "Miguel Arcanjo",
  date: lines.at(-1),
  sections: [],
};
lines.pop();

let current = null;
for (let index = 0; index < lines.length; index += 1) {
  const line = lines[index];
  const isRoman = /^(?:[IVX]{1,5}|XXI)$/.test(line);
  const isNamed = line === "PRÓLOGO" || line === "EPÍLOGO";
  if (isRoman || isNamed) {
    if (current) manuscript.sections.push(current);
    current = { number: line, title: lines[++index] || "", paragraphs: [] };
  } else if (current) {
    current.paragraphs.push(line);
  }
}
if (current) manuscript.sections.push(current);

fs.writeFileSync(
  new URL("./content.js", import.meta.url),
  `window.MANUSCRIPT = ${JSON.stringify(manuscript, null, 2)};\n`,
  "utf8",
);
