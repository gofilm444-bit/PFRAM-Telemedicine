import React, { useState } from "react";
import {
  useMidwifeMotherP4k,
  useMidwifeMotherReferralPlan,
  useUpdateMidwifeMotherP4k,
  useUpdateMidwifeMotherReferralPlan,
} from "./p4k-queries";

interface Props {
  motherPublicId: string;
}

export function MidwifeP4kSection({ motherPublicId }: Props) {
  const [activeSubTab, setActiveSubTab] = useState<"p4k" | "referral">("p4k");
  const [showP4kModal, setShowP4kModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);
  const [actionError, setActionError] = useState("");

  const p4kQuery = useMidwifeMotherP4k(motherPublicId);
  const referralQuery = useMidwifeMotherReferralPlan(motherPublicId);

  const updateP4kMutation = useUpdateMidwifeMotherP4k(motherPublicId);
  const updateReferralMutation = useUpdateMidwifeMotherReferralPlan(motherPublicId);

  const p4k = p4kQuery.data;
  const referral = referralQuery.data;
  const checklist = p4k?.checklistItems ?? [];
  const progress = p4k?.checklistProgress ?? { total: 9, checked: 0, percentage: 0 };

  // Form states for P4K
  const [deliveryAttendant, setDeliveryAttendant] = useState("");
  const [birthCompanionName, setBirthCompanionName] = useState("");
  const [birthCompanionPhone, setBirthCompanionPhone] = useState("");
  const [transportation, setTransportation] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");

  // Form states for Referral
  const [transportType, setTransportType] = useState("");
  const [transportOperatorName, setTransportOperatorName] = useState("");
  const [transportContactNumber, setTransportContactNumber] = useState("");
  const [estimatedTravelTimeMinutes, setEstimatedTravelTimeMinutes] = useState("");
  const [manualDepartureSchedule, setManualDepartureSchedule] = useState("");
  const [departurePoint, setDeparturePoint] = useState("");
  const [companions, setCompanions] = useState("");
  const [rtkName, setRtkName] = useState("");
  const [rtkAddress, setRtkAddress] = useState("");
  const [rtkPhone, setRtkPhone] = useState("");
  const [alternativeNotes, setAlternativeNotes] = useState("");

  const openEditP4k = () => {
    if (p4k) {
      setDeliveryAttendant(p4k.deliveryAttendant || "BIDAN");
      setBirthCompanionName(p4k.birthCompanionName || "");
      setBirthCompanionPhone(p4k.birthCompanionPhone || "");
      setTransportation(p4k.transportation || "AMBULANS");
      setFundingSource(p4k.fundingSource || "BPJS");
      setBpjsNumber(p4k.bpjsNumber || "");
      setEmergencyContactName(p4k.emergencyContactName || "");
      setEmergencyContactPhone(p4k.emergencyContactPhone || "");
      setPreparationNotes(p4k.preparationNotes || "");
    }
    setActionError("");
    setShowP4kModal(true);
  };

  const handleSaveP4k = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    try {
      await updateP4kMutation.mutateAsync({
        deliveryAttendant: deliveryAttendant.trim() || "BIDAN",
        birthCompanionName: birthCompanionName.trim() || null,
        birthCompanionPhone: birthCompanionPhone.trim() || null,
        transportation: transportation.trim() || null,
        fundingSource: fundingSource.trim() || null,
        bpjsNumber: bpjsNumber.trim() || null,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        preparationNotes: preparationNotes.trim() || null,
      });
      setShowP4kModal(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal memperbarui data P4K");
    }
  };

  const openEditReferral = () => {
    if (referral) {
      setTransportType(referral.transportType || "AMBULANCE");
      setTransportOperatorName(referral.transportOperatorName || "");
      setTransportContactNumber(referral.transportContactNumber || "");
      setEstimatedTravelTimeMinutes(
        referral.estimatedTravelTimeMinutes ? String(referral.estimatedTravelTimeMinutes) : "",
      );
      setManualDepartureSchedule(referral.manualDepartureSchedule || "");
      setDeparturePoint(referral.departurePoint || "");
      setCompanions(referral.companions || "");
      setRtkName(referral.rtkName || "");
      setRtkAddress(referral.rtkAddress || "");
      setRtkPhone(referral.rtkPhone || "");
      setAlternativeNotes(referral.alternativeNotes || "");
    }
    setActionError("");
    setShowReferralModal(true);
  };

  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    try {
      await updateReferralMutation.mutateAsync({
        transportType: transportType.trim() || "AMBULANCE",
        transportOperatorName: transportOperatorName.trim() || null,
        transportContactNumber: transportContactNumber.trim() || null,
        estimatedTravelTimeMinutes: estimatedTravelTimeMinutes.trim()
          ? parseInt(estimatedTravelTimeMinutes, 10)
          : null,
        manualDepartureSchedule: manualDepartureSchedule.trim() || null,
        departurePoint: departurePoint.trim() || null,
        companions: companions.trim() || null,
        rtkName: rtkName.trim() || null,
        rtkAddress: rtkAddress.trim() || null,
        rtkPhone: rtkPhone.trim() || null,
        alternativeNotes: alternativeNotes.trim() || null,
      });
      setShowReferralModal(false);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Gagal memperbarui rencana rujukan");
    }
  };

  if (p4kQuery.isLoading || referralQuery.isLoading) {
    return (
      <div className="p-8 text-center text-slate-500">
        <p>Memuat data P4K dan rencana rujukan...</p>
      </div>
    );
  }

  if (p4kQuery.isError) {
    return (
      <div className="rounded-lg bg-amber-50 p-6 text-amber-900 border border-amber-200">
        <h3 className="font-semibold text-base mb-1">Data Perencanaan Belum Siap</h3>
        <p className="text-sm">
          Ibu hamil ini belum memiliki data kehamilan aktif atau profil belum lengkap untuk menyusun P4K.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex border-b border-slate-200 gap-4" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "p4k"}
          onClick={() => setActiveSubTab("p4k")}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeSubTab === "p4k"
              ? "border-teal-600 text-teal-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Perencanaan Persalinan (P4K) & Tas Siaga
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === "referral"}
          onClick={() => setActiveSubTab("referral")}
          className={`py-2 px-4 border-b-2 font-medium text-sm transition-colors ${
            activeSubTab === "referral"
              ? "border-teal-600 text-teal-700 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Rencana Rujukan Wilayah Kepulauan
        </button>
      </div>

      {activeSubTab === "p4k" ? (
        <div className="space-y-6">
          {/* Progress Banner */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-emerald-900 text-sm">
                Progres Kesiapan Tas Perlengkapan Persalinan
              </h4>
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                {progress.checked} dari {progress.total} item siap ({progress.percentage}%)
              </span>
            </div>
            <div className="w-full bg-emerald-100 rounded-full h-2.5 mb-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <p className="text-xs text-emerald-700 italic">
              *Progres administratif perlengkapan mandiri ibu, bukan evaluasi klinis keselamatan.
            </p>
          </div>

          {/* P4K Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">Perencanaan Persalinan (P4K)</h3>
                <p className="text-xs text-slate-500">
                  Data kesiapan penolong, tempat, transportasi, dan donor darah
                </p>
              </div>
              <button
                type="button"
                onClick={openEditP4k}
                className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 border border-teal-200"
              >
                âœ Perbarui Data P4K
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block text-xs font-medium">Perkiraan Lahir (HPL):</span>
                <span className="font-semibold text-slate-800">
                  {p4k?.estimatedDueDate || "Belum ditentukan"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Tempat Bersalin:</span>
                <span className="font-semibold text-slate-800">
                  {p4k?.deliveryFacility?.name || p4k?.customDeliveryFacilityName || "Puskesmas / Faskes Terdekat"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Tenaga Penolong:</span>
                <span className="font-semibold text-slate-800">{p4k?.deliveryAttendant || "BIDAN"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Pendamping Persalinan:</span>
                <span className="font-semibold text-slate-800">
                  {p4k?.birthCompanionName
                    ? `${p4k.birthCompanionName} (${p4k.birthCompanionPhone || "-"})`
                    : "Belum dicatat"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Transportasi ke Faskes:</span>
                <span className="font-semibold text-slate-800">{p4k?.transportation || "AMBULANS"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Pembiayaan / JKN:</span>
                <span className="font-semibold text-slate-800">
                  {p4k?.fundingSource || "BPJS"}
                  {p4k?.bpjsNumber ? ` â€¢ No: ${p4k.bpjsNumber}` : ""}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Calon Donor Darah Siaga:</span>
                <span className="font-semibold text-slate-800">
                  {p4k?.bloodDonors && p4k.bloodDonors.length > 0
                    ? p4k.bloodDonors.map((d) => `${d.name} (${d.bloodType}) â€¢ ${d.phone}`).join(", ")
                    : "Belum disiapkan"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Kontak Darurat:</span>
                <span className="font-semibold text-slate-800">
                  {p4k?.emergencyContactName
                    ? `${p4k.emergencyContactName} (${p4k.emergencyContactPhone || "-"})`
                    : "Belum dicatat"}
                </span>
              </div>
            </div>

            {p4k?.preparationNotes && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 border-l-4 border-teal-500 text-xs text-slate-700">
                <span className="font-bold block mb-1">Catatan Persiapan Tambahan:</span>
                {p4k.preparationNotes}
              </div>
            )}
          </div>

          {/* Checklist Items Table */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h4 className="font-bold text-base text-slate-900 mb-3">Item Perlengkapan Bersalin</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Perlengkapan</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-600">Kategori</th>
                    <th className="px-4 py-2 text-center font-medium text-slate-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {checklist.map((item) => (
                    <tr key={item.itemKey} className={item.checked ? "bg-emerald-50/30" : ""}>
                      <td className="px-4 py-3 font-medium text-slate-800">{item.title}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{item.category}</td>
                      <td className="px-4 py-3 text-center">
                        {item.checked ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
                            âœ“ Siap
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            Belum
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* TAB 2: Referral Plan */
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  Rencana Rujukan Wilayah Kepulauan
                </h3>
                <p className="text-xs text-slate-500">
                  Jalur laut & darat, waktu tempuh, operator kapal, dan Rumah Tunggu Kelahiran (RTK)
                </p>
              </div>
              <button
                type="button"
                onClick={openEditReferral}
                className="rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-100 border border-teal-200"
              >
                âœ Perbarui Rencana Rujukan
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block text-xs font-medium">Fasilitas Asal:</span>
                <span className="font-semibold text-slate-800">
                  {referral?.sourceFacility?.name || referral?.customSourceFacilityName || "Puskesmas Asal"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Fasilitas Tujuan Rujukan:</span>
                <span className="font-semibold text-slate-800">
                  {referral?.destinationFacility?.name || referral?.customDestinationFacilityName || "RSUD / Faskes Lanjutan"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Moda Transportasi Rujukan:</span>
                <span className="font-semibold text-slate-800">{referral?.transportType || "AMBULANCE"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Operator / Nahkoda:</span>
                <span className="font-semibold text-slate-800">
                  {referral?.transportOperatorName
                    ? `${referral.transportOperatorName} (${referral.transportContactNumber || "-"})`
                    : "Belum dicatat"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Estimasi Waktu Tempuh:</span>
                <span className="font-semibold text-slate-800">
                  {referral?.estimatedTravelTimeMinutes ? `${referral.estimatedTravelTimeMinutes} Menit` : "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Jadwal Keberangkatan Manual:</span>
                <span className="font-semibold text-slate-800">
                  {referral?.manualDepartureSchedule || "Standby Panggilan Darurat"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Titik Kumpul / Dermaga:</span>
                <span className="font-semibold text-slate-800">{referral?.departurePoint || "-"}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-xs font-medium">Pendamping Rujukan:</span>
                <span className="font-semibold text-slate-800">
                  {referral?.companions || "Keluarga & Nakes"}
                </span>
              </div>
            </div>

            {/* RTK Info */}
            <div className="mt-6 rounded-lg border border-blue-100 bg-blue-50/50 p-4">
              <h4 className="font-semibold text-blue-900 text-sm mb-1">
                Rumah Tunggu Kelahiran (RTK)
              </h4>
              <p className="text-xs text-blue-700 mb-3">
                Tempat singgah sementara ibu hamil di dekat rumah sakit sebelum waktu persalinan tiba.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-blue-600 block font-medium">Nama RTK:</span>
                  <span className="font-semibold text-slate-800">{referral?.rtkName || "Belum dicatat"}</span>
                </div>
                <div>
                  <span className="text-blue-600 block font-medium">Alamat:</span>
                  <span className="font-semibold text-slate-800">{referral?.rtkAddress || "-"}</span>
                </div>
                <div>
                  <span className="text-blue-600 block font-medium">Telepon / PIC:</span>
                  <span className="font-semibold text-slate-800">{referral?.rtkPhone || "-"}</span>
                </div>
              </div>
            </div>

            {referral?.alternativeNotes && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 border-l-4 border-amber-500 text-xs text-amber-900">
                <span className="font-bold block mb-1">Rencana Alternatif Cuaca Buruk / Ombak Tinggi:</span>
                {referral.alternativeNotes}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Edit P4K */}
      {showP4kModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Perbarui Perencanaan Persalinan (P4K)</h3>
            {actionError && (
              <div className="mb-4 rounded bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
                {actionError}
              </div>
            )}
            <form onSubmit={handleSaveP4k} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Penolong Persalinan
                </label>
                <input
                  type="text"
                  value={deliveryAttendant}
                  onChange={(e) => setDeliveryAttendant(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: BIDAN / DOKTER_SPESIALIS"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Pendamping
                </label>
                <input
                  type="text"
                  value={birthCompanionName}
                  onChange={(e) => setBirthCompanionName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Nama suami / keluarga"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon Pendamping
                </label>
                <input
                  type="text"
                  value={birthCompanionPhone}
                  onChange={(e) => setBirthCompanionPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Nomor HP pendamping"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transportasi Menuju Faskes
                </label>
                <input
                  type="text"
                  value={transportation}
                  onChange={(e) => setTransportation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: SPEEDBOAT / AMBULANS / LAINNYA"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Sumber Pembiayaan
                </label>
                <input
                  type="text"
                  value={fundingSource}
                  onChange={(e) => setFundingSource(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: BPJS / PRIBADI / JAMPERSAL"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Kartu BPJS / JKN
                </label>
                <input
                  type="text"
                  value={bpjsNumber}
                  onChange={(e) => setBpjsNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kontak Darurat
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Nama kontak darurat"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nomor Telepon Darurat
                </label>
                <input
                  type="text"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Nomor telepon darurat"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Catatan Persiapan
                </label>
                <textarea
                  rows={2}
                  value={preparationNotes}
                  onChange={(e) => setPreparationNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Catatan jadwal kapal, ketersediaan BBM, dll."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowP4kModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateP4kMutation.isPending}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {updateP4kMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit Referral */}
      {showReferralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-900 mb-4">Perbarui Rencana Rujukan Kepulauan</h3>
            {actionError && (
              <div className="mb-4 rounded bg-rose-50 p-2 text-xs text-rose-700 border border-rose-200">
                {actionError}
              </div>
            )}
            <form onSubmit={handleSaveReferral} className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jenis Transportasi
                </label>
                <input
                  type="text"
                  value={transportType}
                  onChange={(e) => setTransportType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: SPEEDBOAT / AMBULANCE / KAPAL"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Operator / Nahkoda
                </label>
                <input
                  type="text"
                  value={transportOperatorName}
                  onChange={(e) => setTransportOperatorName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Nama pengemudi / nahkoda"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Kontak Operator
                </label>
                <input
                  type="text"
                  value={transportContactNumber}
                  onChange={(e) => setTransportContactNumber(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Nomor HP operator"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estimasi Waktu Tempuh (Menit)
                </label>
                <input
                  type="number"
                  value={estimatedTravelTimeMinutes}
                  onChange={(e) => setEstimatedTravelTimeMinutes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: 60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Jadwal Keberangkatan Manual
                </label>
                <input
                  type="text"
                  value={manualDepartureSchedule}
                  onChange={(e) => setManualDepartureSchedule(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: Pagi 07:00 jika laut teduh"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Titik Kumpul / Dermaga
                </label>
                <input
                  type="text"
                  value={departurePoint}
                  onChange={(e) => setDeparturePoint(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Contoh: Dermaga Sebatik"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pendamping Rujukan
                </label>
                <input
                  type="text"
                  value={companions}
                  onChange={(e) => setCompanions(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Suami & Bidan Desa"
                />
              </div>

              <div className="border-t border-slate-200 pt-2">
                <span className="text-xs font-bold text-slate-900 block mb-2">Rumah Tunggu Kelahiran (RTK)</span>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={rtkName}
                    onChange={(e) => setRtkName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    placeholder="Nama RTK"
                  />
                  <input
                    type="text"
                    value={rtkAddress}
                    onChange={(e) => setRtkAddress(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    placeholder="Alamat RTK"
                  />
                  <input
                    type="text"
                    value={rtkPhone}
                    onChange={(e) => setRtkPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                    placeholder="Kontak RTK"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rencana Alternatif Cuaca Buruk / Gelombang
                </label>
                <textarea
                  rows={2}
                  value={alternativeNotes}
                  onChange={(e) => setAlternativeNotes(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  placeholder="Opsi jalur alternatif bila kapal cepat tidak beroperasi"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowReferralModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updateReferralMutation.isPending}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {updateReferralMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
