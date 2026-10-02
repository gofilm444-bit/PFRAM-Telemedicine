const fs = require('fs');
const path = require('path');

const p = path.join(__dirname, '../../apps/web/src/stage3.tsx');
let c = fs.readFileSync(p, 'utf8');

if (!c.includes('import { Link } from "react-router-dom";')) {
  c = 'import { Link } from "react-router-dom";\n' + c;
}

const mothersPageStart = c.indexOf('export function MothersPage(');
if (mothersPageStart === -1) {
  console.error('MothersPage not found!');
  process.exit(1);
}

const mapStart = c.indexOf('{list.data?.items.map((v) => (', mothersPageStart);
if (mapStart === -1) {
  console.error('mapStart not found in MothersPage!');
  process.exit(1);
}

const mapEnd = c.indexOf('))}', mapStart);
if (mapEnd === -1) {
  console.error('mapEnd not found!');
  process.exit(1);
}

const replacement = `{list.data?.items.map((v) => (
          <div
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
          </div>
        ))}`;

c = c.substring(0, mapStart) + replacement + c.substring(mapEnd + 3);
fs.writeFileSync(p, c, 'utf8');
console.log('Successfully patched MothersPage in stage3.tsx!');
