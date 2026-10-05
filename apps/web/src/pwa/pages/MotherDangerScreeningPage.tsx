import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MotherAppShell } from "../MotherAppShell";
import { Card, Button } from "../../components";
import {
  useMotherDangerSigns,
  useMotherDangerScreenings,
  useCreateMotherDangerScreening,
} from "../../danger-screening-queries";
import {
  formatScreeningDate,
  SCREENING_STATUS_BADGES,
  FOLLOW_UP_STATUS_BADGES,
} from "../../danger-screening-api";
import type { DangerScreening } from "@pfram/shared-types";
import { useAuth } from "../../auth";

export function MotherDangerScreeningPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: signsData, isLoading: loadingSigns, error: errorSigns } =
    useMotherDangerSigns();
  const { data: screeningsData, isLoading: loadingScreenings } =
    useMotherDangerScreenings();
  const createMutation = useCreateMotherDangerScreening();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, boolean>>({});
  const [validationError, setValidationError] = useState<string | null>(null);
  const [result, setResult] = useState<DangerScreening | null>(null);

  const rules = signsData?.rules ?? [];
  const currentRule = rules[currentIndex];
  const isLastQuestion = currentIndex === rules.length - 1;

  const handleSelectAnswer = (ruleCode: string, value: boolean) => {
    setAnswers((prev) => ({ ...prev, [ruleCode]: value }));
    setValidationError(null);
  };

  const handleNext = () => {
    if (!currentRule || answers[currentRule.code] === undefined) {
      setValidationError("Pilih salah satu jawaban untuk melanjutkan.");
      return;
    }
    setValidationError(null);
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    setValidationError(null);
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  const handleSubmit = async () => {
    if (!currentRule || answers[currentRule.code] === undefined) {
      setValidationError("Pilih salah satu jawaban untuk melanjutkan.");
      return;
    }

    // Ensure all rules are answered
    for (const rule of rules) {
      if (answers[rule.code] === undefined) {
        setValidationError("Semua pertanyaan wajib dijawab sebelum mengirim skrining.");
        return;
      }
    }

    setValidationError(null);
    try {
      const responses = Object.entries(answers).map(([ruleCode, answer]) => ({
        ruleCode,
        answer,
      }));

      const res = await createMutation.mutateAsync({
        ruleSetVersion: signsData?.ruleSet.version ?? "1.0",
        responses,
      });
      setResult(res);
    } catch {
      setValidationError("Gagal mengirim skrining tanda bahaya. Silakan coba kembali.");
    }
  };

  const handleReset = () => {
    setResult(null);
    setAnswers({});
    setCurrentIndex(0);
    setValidationError(null);
  };

  const pastScreenings = screeningsData?.items ?? [];

  const midwifePhone =
    user?.activeMidwifeAssignment?.midwife?.whatsappNumber ??
    (user as unknown as Record<string, { phoneNumber?: string }>)?.assignedMidwife?.phoneNumber ??
    "119";

  return (
    <MotherAppShell
      title="Tanda Bahaya"
      subtitle="Skrining Mandiri Kehamilan"
      showBack={true}
      onBack={() => navigate("/m/home")}
    >
      <div className="space-y-4">
        {/* Clinical Emergency Safety Advisory */}
        <div
          role="alert"
          className="rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-red-950 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <span className="text-xl" aria-hidden="true">
              🚨
            </span>
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-red-900">
                Peringatan Medis & Kedaruratan
              </p>
              <p className="text-sm font-semibold leading-snug text-red-950">
                Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.
              </p>
            </div>
          </div>
        </div>

        {/* Title Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Skrining Tanda Bahaya</h1>
          <p className="mt-1 text-xs text-slate-500">
            Pemeriksaan mandiri tanda bahaya kehamilan untuk keselamatan ibu dan janin
          </p>
        </div>

        {/* Interactive Screening Flow */}
        {result ? (
          /* Result Card */
          <section role="region" aria-label="Hasil Skrining">
            <Card
              className={`border-2 p-5 shadow-sm space-y-4 ${
                result.status === "REQUIRES_IMMEDIATE_CARE"
                  ? "border-red-500 bg-red-50/50"
                  : result.status === "DANGER_SIGN_REPORTED"
                  ? "border-amber-400 bg-amber-50/50"
                  : "border-emerald-400 bg-emerald-50/50"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Hasil Skrining
                  </span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {formatScreeningDate(result.screenedAt)}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    SCREENING_STATUS_BADGES[result.status]?.className ?? ""
                  }`}
                >
                  {SCREENING_STATUS_BADGES[result.status]?.label ?? result.status}
                </span>
              </div>

              {/* Guidance Content */}
              {result.status === "REQUIRES_IMMEDIATE_CARE" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-red-200 bg-red-100/70 p-3 text-red-950">
                    <p className="text-sm font-bold text-red-950">
                      Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.
                    </p>
                    <p className="text-xs text-red-900 mt-1">
                      Tanda yang Anda laporkan memerlukan penanganan medis langsung dari tenaga kesehatan di fasilitas terdekat.
                    </p>
                  </div>

                  <a
                    href={`tel:${midwifePhone}`}
                    className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 active:bg-red-800 transition-colors"
                  >
                    📞 Hubungi Faskes / Bidan Sekarang
                  </a>
                </div>
              ) : result.status === "DANGER_SIGN_REPORTED" ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-amber-200 bg-amber-100/70 p-3 text-amber-950">
                    <p className="text-sm font-bold text-amber-950">
                      Gejala terlaporkan memerlukan perhatian bidan.
                    </p>
                    <p className="text-xs text-amber-900 mt-1">
                      Bidan pendamping Anda akan meninjau catatan ini. Jika gejala memberat, segera kunjungi fasilitas kesehatan.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-100/60 p-3 text-emerald-950">
                    <p className="text-sm font-bold text-emerald-950">
                      Hasil skrining telah dicatat.
                    </p>
                    <p className="text-xs text-emerald-900 mt-1">
                      Tidak ada tanda bahaya yang Anda laporkan pada screening ini. Tetap waspada terhadap perubahan kondisi tubuh dan lakukan pemeriksaan sesuai jadwal.
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs font-semibold py-2.5"
                  onClick={handleReset}
                >
                  Mulai Skrining Baru
                </Button>
              </div>
            </Card>
          </section>
        ) : loadingSigns ? (
          <Card className="border border-slate-200/90 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Memuat daftar pertanyaan skrining...
          </Card>
        ) : errorSigns || rules.length === 0 ? (
          <Card className="border border-slate-200/90 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Daftar skrining tanda bahaya belum tersedia saat ini.
          </Card>
        ) : (
          /* Question Form */
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            {/* Progress Indicator */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700">
                  Pertanyaan {currentIndex + 1} dari {rules.length}
                </span>
                <span className="text-slate-500 font-medium">
                  {Math.round(((currentIndex + 1) / rules.length) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                  style={{
                    width: `${((currentIndex + 1) / rules.length) * 100}%`,
                  }}
                />
              </div>
            </div>

            {/* Current Question */}
            {currentRule && (
              <div className="space-y-3 pt-2">
                <p className="text-base font-bold text-slate-900 leading-snug">
                  {(currentRule as unknown as Record<string, string>).questionText ??
                    currentRule.question}
                </p>

                {validationError && (
                  <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-xs text-rose-700 font-semibold">
                    {validationError}
                  </div>
                )}

                {/* Yes / No Touch Targets (>= 48px) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSelectAnswer(currentRule.code, true)}
                    className={`flex min-h-[48px] items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                      answers[currentRule.code] === true
                        ? "border-red-600 bg-red-50 text-red-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 active:bg-slate-50"
                    }`}
                  >
                    Ya
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSelectAnswer(currentRule.code, false)}
                    className={`flex min-h-[48px] items-center justify-center rounded-xl border-2 px-4 py-3 text-sm font-bold transition-all ${
                      answers[currentRule.code] === false
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 active:bg-slate-50"
                    }`}
                  >
                    Tidak
                  </button>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={currentIndex === 0}
                onClick={handlePrev}
                className="text-xs font-semibold py-2 px-4"
              >
                Sebelumnya
              </Button>

              {isLastQuestion ? (
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={createMutation.isPending}
                  onClick={handleSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-5 min-h-[40px]"
                >
                  {createMutation.isPending ? "Mengirim..." : "Kirim Hasil Skrining"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-5 min-h-[40px]"
                >
                  Lanjut
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* Screening History */}
        <div className="space-y-3 pt-2">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">
            Riwayat Skrining
          </h2>

          {loadingScreenings ? (
            <Card className="border border-slate-200/90 bg-white p-5 text-center text-xs text-slate-500 shadow-sm">
              Memuat riwayat skrining...
            </Card>
          ) : pastScreenings.length === 0 ? (
            <Card className="border border-slate-200/90 bg-white p-6 text-center text-xs text-slate-500 shadow-sm">
              Belum ada riwayat skrining sebelumnya.
            </Card>
          ) : (
            <div className="space-y-2.5">
              {pastScreenings.map((screening) => {
                const statusBadge = SCREENING_STATUS_BADGES[screening.status] ?? {
                  label: screening.status,
                  className: "bg-slate-100 text-slate-700 border-slate-200",
                };
                const followUpStatus =
                  (screening as unknown as Record<string, string>).followUpStatus ?? "RESOLVED";
                const followUpBadge = (FOLLOW_UP_STATUS_BADGES as Record<string, { label: string; className: string }>)[followUpStatus] ?? {
                  label: followUpStatus,
                  className: "bg-slate-100 text-slate-700 border-slate-200",
                };

                return (
                  <Card
                    key={screening.publicId}
                    className="border border-slate-200/90 bg-white p-4 shadow-sm space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          {formatScreeningDate(screening.screenedAt)}
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Tanda terlaporkan: {screening.reportedSignsCount ?? 0}
                        </p>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusBadge.className}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-50">
                      <span>Tindak Lanjut:</span>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${followUpBadge.className}`}
                      >
                        {followUpBadge.label}
                      </span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </MotherAppShell>
  );
}
