const fs = require('fs');
const path = require('path');

// 1. MidwifeMotherDetailPage.tsx
{
  const p = path.join(__dirname, '../../apps/web/src/MidwifeMotherDetailPage.tsx');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/retry:\s*1,\s*\r?\n/g, '');
  fs.writeFileSync(p, c, 'utf8');
  console.log('1. Updated MidwifeMotherDetailPage.tsx');
}

// 2. monitoring-queries.ts
{
  const p = path.join(__dirname, '../../apps/web/src/monitoring-queries.ts');
  let c = fs.readFileSync(p, 'utf8');
  c = c.replace(/retry:\s*1,\s*\r?\n/g, '');
  fs.writeFileSync(p, c, 'utf8');
  console.log('2. Updated monitoring-queries.ts');
}

// 3. stage3.tsx
{
  const p = path.join(__dirname, '../../apps/web/src/stage3.tsx');
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('import { Link } from "react-router-dom";')) {
    c = 'import { Link } from "react-router-dom";\n' + c;
  }

  // Replace mother card in MothersPage
  const searchPattern = /\{list\.data\?\.items\.map\(\(v\)\s*=>\s*\(\r?\n\s*<div\s+className="border-b py-3"\s+key=\{v\.publicId\}>[\s\S]*?<\/p>\r?\n\s*<\/div>\r?\n\s*\)\)\}/;

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

  if (searchPattern.test(c)) {
    c = c.replace(searchPattern, replacement);
    fs.writeFileSync(p, c, 'utf8');
    console.log('3. Updated stage3.tsx');
  } else {
    console.log('3. stage3.tsx pattern not found or already updated');
  }
}

// 4. App.tsx
{
  const p = path.join(__dirname, '../../apps/web/src/App.tsx');
  let c = fs.readFileSync(p, 'utf8');
  if (!c.includes('MidwifeMotherDetailPage')) {
    c = c.replace(
      'import {',
      'import { MidwifeMotherDetailPage } from "./MidwifeMotherDetailPage";\nimport {'
    );
    const searchRoute = /<Route\r?\n\s*path="my-mothers"\r?\n\s*element=\{\r?\n\s*<RoleGuard roles=\{\["MIDWIFE"\]\}>\r?\n\s*<MothersPage midwife \/>\r?\n\s*<\/RoleGuard>\r?\n\s*\}\r?\n\s*\/>/;
    const replacementRoute = `<Route
              path="my-mothers"
              element={
                <RoleGuard roles={["MIDWIFE"]}>
                  <MothersPage midwife />
                </RoleGuard>
              }
            />
            <Route
              path="my-mothers/:motherPublicId"
              element={
                <RoleGuard roles={["MIDWIFE"]}>
                  <MidwifeMotherDetailPage />
                </RoleGuard>
              }
            />`;
    c = c.replace(searchRoute, replacementRoute);
    fs.writeFileSync(p, c, 'utf8');
    console.log('4. Updated App.tsx');
  } else {
    console.log('4. App.tsx already has MidwifeMotherDetailPage');
  }
}
