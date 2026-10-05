import { MotherAppShell } from "../MotherAppShell";
import { Card, StatusBadge } from "../../components";


export function MotherConsultationPlaceholder() {
  return (
    <MotherAppShell
      title="Konsultasi Bidan"
      subtitle="Telekonsultasi Bidan Maternal"
    >
      <Card className="border border-slate-200/90 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-2xl text-teal-700 ring-1 ring-teal-200/60">
          💬
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">
          Konsultasi Maternal
        </h2>
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
          Fitur ini sedang disiapkan untuk berkomunikasi dan berkonsultasi langsung dengan bidan pendamping fasilitas kesehatan Anda.
        </p>
        <div className="mt-4 flex justify-center">
          <StatusBadge variant="info" size="sm">
            Segera Hadir
          </StatusBadge>
        </div>
      </Card>
    </MotherAppShell>
  );
}

export function MotherEducationPlaceholder() {
  return (
    <MotherAppShell
      title="Edukasi Maternal"
      subtitle="Materi Edukasi Kesehatan Ibu & Anak"
    >
      <Card className="border border-slate-200/90 bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-700 ring-1 ring-amber-200/60">
          📖
        </div>
        <h2 className="mt-4 text-base font-bold text-slate-900">
          Edukasi & Panduan KIA
        </h2>
        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
          Fitur ini sedang disiapkan untuk menyajikan panduan nutrisi, tanda bahaya, dan artikel kesehatan kehamilan sesuai standar Kementerian Kesehatan RI.
        </p>
        <div className="mt-4 flex justify-center">
          <StatusBadge variant="info" size="sm">
            Segera Hadir
          </StatusBadge>
        </div>
      </Card>
    </MotherAppShell>
  );
}
