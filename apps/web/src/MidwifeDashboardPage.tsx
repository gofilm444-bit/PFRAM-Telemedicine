import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "./auth";
import { PageHeader, Card, ErrorState } from "./components";
import type {
  MidwifeAttentionItem,
  MidwifeDashboardSummary,
  MidwifeTodayScheduleItem,
} from "@pfram/shared-types";

export function MidwifeDashboardPage() {
  const { request } = useAuth();
  const [summary, setSummary] = useState<MidwifeDashboardSummary | null>(null);
  const [attention, setAttention] = useState<MidwifeAttentionItem[]>([]);
  const [schedule, setSchedule] = useState<MidwifeTodayScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        const [sumRes, attRes, schRes] = await Promise.all([
          request<MidwifeDashboardSummary>("/midwife/dashboard/summary"),
          request<{ items: MidwifeAttentionItem[]; total: number }>(
            "/midwife/dashboard/attention",
          ),
          request<{ items: MidwifeTodayScheduleItem[]; total: number }>(
            "/midwife/dashboard/schedule/today",
          ),
        ]);
        if (isMounted) {
          setSummary(sumRes);
          setAttention(attRes.items);
          setSchedule(schRes.items);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Gagal memuat data dashboard bidan",
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    void loadDashboard();
    return () => {
      isMounted = false;
    };
  }, [request]);

  const cards = [
    {
      title: "Ibu Binaan Aktif",
      count: summary?.activeMothersCount ?? 0,
      link: "/my-mothers",
      color: "text-pfram-primary",
    },
    {
      title: "Pemantauan Hari Ini",
      count: summary?.todayMonitoringCount ?? 0,
      link: "/my-mothers",
      color: "text-slate-800",
    },
    {
      title: "ANC Hari Ini",
      count: summary?.todayAncCount ?? 0,
      link: "/my-mothers",
      color: "text-slate-800",
    },
    {
      title: "ANC Belum Dikonfirmasi",
      count: summary?.unconfirmedAncCount ?? 0,
      link: "/anc-missed",
      color: (summary?.unconfirmedAncCount ?? 0) > 0 ? "text-amber-600" : "text-slate-800",
    },
    {
      title: "Skrining Perlu Tindak Lanjut",
      count: summary?.pendingDangerScreeningCount ?? 0,
      link: "/danger-follow-ups",
      color: (summary?.pendingDangerScreeningCount ?? 0) > 0 ? "text-red-600" : "text-slate-800",
    },
    {
      title: "Konsultasi Belum Dibaca",
      count: summary?.unreadConsultationCount ?? 0,
      link: "/consultations",
      color: (summary?.unreadConsultationCount ?? 0) > 0 ? "text-amber-600" : "text-slate-800",
    },
    {
      title: "Video Call Hari Ini",
      count: summary?.todayVideoCallCount ?? 0,
      link: "/consultations",
      color: "text-slate-800",
    },
    {
      title: "Kunjungan Rumah Hari Ini",
      count: summary?.todayHomeVisitCount ?? 0,
      link: "/my-mothers",
      color: "text-slate-800",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard Bidan Pendamping"
        description="Ringkasan operasional pemantauan kesehatan ibu binaan dan jadwal hari ini."
      />

      {error && <ErrorState message={error} />}

      {/* 8 Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.title}
            to={c.link}
            className="group block transition hover:-translate-y-0.5"
          >
            <Card className="h-full border border-slate-200 group-hover:border-pfram-primary/50 group-hover:shadow-md">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {c.title}
              </div>
              <div className={`mt-2 text-3xl font-extrabold ${c.color}`}>
                {loading ? "-" : c.count}
              </div>
              <div className="mt-3 text-xs font-medium text-slate-400 group-hover:text-pfram-primary">
                Lihat rincian →
              </div>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section: Prioritas Tindak Lanjut */}
        <Card className="border border-slate-200">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-slate-800">Perlu Ditindaklanjuti</h2>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
              {attention.length} Tugas
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Memuat prioritas...
              </div>
            ) : attention.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                ✓ Semua tugas administratif dan tindak lanjut telah diselesaikan.
              </div>
            ) : (
              attention.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50"
                >
                  <div>
                    <span className="inline-block rounded-md bg-white px-2 py-0.5 text-[11px] font-bold text-slate-700 shadow-sm">
                      {item.type}
                    </span>
                    <h3 className="mt-1 text-sm font-semibold text-slate-800">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {item.motherName} • {item.description}
                    </p>
                  </div>
                  {item.actionUrl && (
                    <Link
                      to={item.actionUrl}
                      className="shrink-0 text-xs font-bold text-pfram-primary hover:underline"
                    >
                      Buka →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Section: Jadwal Hari Ini */}
        <Card className="border border-slate-200">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-bold text-slate-800">Jadwal Hari Ini</h2>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
              {schedule.length} Kegiatan
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Memuat jadwal...
              </div>
            ) : schedule.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Tidak ada agenda ANC, video call, atau kunjungan rumah hari ini.
              </div>
            ) : (
              schedule.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-3 hover:bg-slate-50"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        ⏰ {item.time}
                      </span>
                      <span className="rounded bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-600 shadow-sm">
                        {item.type}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {item.motherName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {item.title} {item.locationOrLink ? `• ${item.locationOrLink}` : ""}
                    </p>
                  </div>
                  {item.actionUrl && (
                    <Link
                      to={item.actionUrl}
                      className="text-xs font-bold text-pfram-primary hover:underline"
                    >
                      Detail →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
