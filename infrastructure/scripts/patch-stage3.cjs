const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../../apps/web/src/stage3.tsx');
let c = fs.readFileSync(p, 'utf8');

// Ensure Link is imported
if (!c.includes('import { Link } from "react-router-dom";')) {
  c = 'import { Link } from "react-router-dom";\n' + c;
}

const targetBlock = `<div className="border-b py-3" key={v.publicId}>
            <b>{v.fullName}</b>
            <p className="text-sm text-slate-600">
              Usia {v.age ?? "-"} ·{" "}
              {v.facility?.name ?? "Belum memilih fasilitas"} ·{" "}
              {v.activePregnancy?.gestationalAge
                ? \`\${v.activePregnancy.gestationalAge.weeks} minggu \${v.activePregnancy.gestationalAge.days} hari · Trimester \${v.activePregnancy.trimester}\`
                : "Profil kehamilan belum lengkap"}
            </p>
          </div>`;

const targetBlockCRLF = `<div className="border-b py-3" key={v.publicId}>\r\n            <b>{v.fullName}</b>\r\n            <p className="text-sm text-slate-600">\r\n              Usia {v.age ?? "-"}\u0020\u00b7{" "}\r\n              {v.facility?.name ?? "Belum memilih fasilitas"}\u0020\u00b7{" "}\r\n              {v.activePregnancy?.gestationalAge\r\n                ? \`\${v.activePregnancy.gestationalAge.weeks} minggu \${v.activePregnancy.gestationalAge.days} hari\u0020\u00b7 Trimester \${v.activePregnancy.trimester}\`\r\n                : "Profil kehamilan belum lengkap"}\r\n            </p>\r\n          </div>`;

const replacementBlock = `<div
            className="flex flex-wrap items-center justify-between border-b py-3"
            key={v.publicId}
          >
            <div>
              <b>{v.fullName}</b>
              <p className="text-sm text-slate-600">
                Usia {v.age ?? "-"} ·{" "}
                {v.facility?.name ?? "Belum memilih fasilitas"} ·{" "}
                {v.activePregnancy?.gestationalAge
                  ? \`\${v.activePregnancy.gestationalAge.weeks} minggu \${v.activePregnancy.gestationalAge.days} hari · Trimester \${v.activePregnancy.trimester}\`
                  : "Profil kehamilan belum lengkap"}
              </p>
            </div>
            {midwife && (
              <Link
                to={\`/my-mothers/\${v.publicId}\`}
                className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-pfram-primary shadow-sm hover:bg-slate-50 sm:mt-0"
              >
                Lihat Detail & Pemantauan →
              </Link>
            )}
          </div>`;

const idx = c.indexOf('{list.data?.items.map((v) => (');
if (idx !== -1) {
  const mapEnd = c.indexOf('))}', idx);
  if (mapEnd !== -1) {
    const before = c.substring(0, idx + '{list.data?.items.map((v) => (\n'.length);
    const after = c.substring(mapEnd);
    c = c.substring(0, idx) + `{list.data?.items.map((v) => (\n          ` + replacementBlock + `\n        ))}` + c.substring(mapEnd + 3);
    fs.writeFileSync(p, c, 'utf8');
    console.log('Successfully patched stage3.tsx via substring indexing!');
  } else {
    console.log('mapEnd not found');
  }
} else {
  console.log('list.data?.items.map not found');
}
