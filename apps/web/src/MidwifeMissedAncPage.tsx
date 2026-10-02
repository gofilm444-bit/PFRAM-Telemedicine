import { Link } from "react-router-dom";
import { formatAncDateTime } from "./anc-api";
import { useMidwifeMissedAnc } from "./anc-queries";
import { Card, EmptyState, PageHeader } from "./components";

export function MidwifeMissedAncPage() {
  const { data, isLoading, isError, refetch } = useMidwifeMissedAnc();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Jadwal ANC Belum Dikonfirmasi Hadir"
        description="Daftar jadwal pemeriksaan ibu binaan yang telah melewati tanggal rencana dan belum dikonfirmasi hadir."
      />

      {/* Summary card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Total Perlu Tindak Lanjut
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-600">
            {total}
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Ibu binaan yang membutuhkan konfirmasi kehadiran atau penjadwalan ulang.
          </p>
        </Card>

        <Card>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Edukasi Bidan Pendamping
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            Bidan pendamping dapat menghubungi ibu hamil untuk menanyakan kendala
            kehadiran, mengatur ulang jadwal kunjungan, atau mencatat hasil pemeriksaan
            apabila ibu telah memeriksakan diri di fasilitas kesehatan lain.
          </p>
        </Card>
      </div>

      {/* List / Table */}
      <Card>
        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Memuat daftar jadwal belum dikonfirmasi...
          </div>
        ) : isError ? (
          <div className="py-12 text-center text-xs text-red-500">
            Gagal memuat daftar.{" "}
            <button
              type="button"
              onClick={() => refetch()}
              className="font-semibold underline ml-1"
            >
              Coba lagi
            </button>
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            message="Semua jadwal ANC ibu binaan telah dikonfirmasi hadir atau belum melewati tanggal kunjungannya."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-bold uppercase text-slate-400">
                  <th className="py-3 pr-4">Nama Ibu</th>
                  <th className="py-3 px-4">Tanggal Terjadwal</th>
                  <th className="py-3 px-4">Keterlambatan</th>
                  <th className="py-3 px-4">Jenis Kunjungan</th>
                  <th className="py-3 px-4">Fasilitas</th>
                  <th className="py-3 pl-4 text-right">Tindak Lanjut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item) => (
                  <tr key={item.publicId} className="hover:bg-slate-50/50">
                    <td className="py-3 pr-4 font-semibold text-slate-800">
                      <Link
                        to={`/my-mothers/${item.mother.publicId}`}
                        className="text-pfram-primary hover:underline"
                      >
                        {item.mother.fullName}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {formatAncDateTime(item.scheduledAt)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                        Lewat {item.daysOverdue} hari
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {item.visitType === "DOCTOR_ANC"
                        ? "Pemeriksaan Dokter"
                        : "Pemeriksaan Rutin"}
                      {item.doctorRequired && " (Wajib Dokter)"}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {item.facility?.name ?? "-"}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <Link
                        to={`/my-mothers/${item.mother.publicId}`}
                        className="rounded-lg bg-pfram-primary px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-pfram-text"
                      >
                        Kelola Jadwal →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
