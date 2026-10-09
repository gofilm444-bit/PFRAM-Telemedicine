import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MotherAppShell } from "../MotherAppShell";
import { Card, Button } from "../../components";
import {
  useMotherP4k,
  useUpdateMotherP4k,
  useMotherP4kChecklist,
  usePatchMotherP4kChecklist,
  useMotherReferralPlan,
  useUpdateMotherReferralPlan,
} from "../../p4k-queries";
import { formatIndonesianDate } from "../../monitoring-api";
import { useAuth } from "../../auth";
import { extractAndMapError } from "../../error-mapping";

type P4kTab = "birthPlan" | "referral" | "checklist";

export function MotherP4kPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<P4kTab>("birthPlan");

  // Queries
  const { data: p4kData, isLoading: loadingP4k } = useMotherP4k();
  const { data: referralData, isLoading: loadingReferral } = useMotherReferralPlan();
  const { data: checklistData, isLoading: loadingChecklist } = useMotherP4kChecklist();

  // Mutations
  const updateP4kMutation = useUpdateMotherP4k();
  const updateReferralMutation = useUpdateMotherReferralPlan();
  const patchChecklistMutation = usePatchMotherP4kChecklist();

  // Tab 1 (Birth Plan) Form State
  const [editingBirthPlan, setEditingBirthPlan] = useState(false);
  const [birthAttendant, setBirthAttendant] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [companionName, setCompanionName] = useState("");
  const [companionPhone, setCompanionPhone] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorBloodType, setDonorBloodType] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [birthPlanError, setBirthPlanError] = useState<string | null>(null);

  // Tab 2 (Referral Plan) Form State
  const [editingReferral, setEditingReferral] = useState(false);
  const [referralFacility, setReferralFacility] = useState("");
  const [seaTransportType, setSeaTransportType] = useState("");
  const [motorisContact, setMotorisContact] = useState("");
  const [rtkName, setRtkName] = useState("");
  const [travelMinutes, setTravelMinutes] = useState("");
  const [referralError, setReferralError] = useState<string | null>(null);

  // Sync initial birth plan values from server data
  useEffect(() => {
    if (p4kData) {
      setBirthAttendant(
        p4kData.deliveryAttendant ||
          (p4kData as unknown as Record<string, { birthAttendant?: string }>).deliveryPlan?.birthAttendant ||
          "",
      );
      setBirthPlace(
        p4kData.customDeliveryFacilityName ||
          p4kData.deliveryFacility?.name ||
          (p4kData as unknown as Record<string, { birthPlace?: string }>).deliveryPlan?.birthPlace ||
          "",
      );
      setCompanionName(
        p4kData.birthCompanionName ||
          (p4kData as unknown as Record<string, { birthCompanion?: string }>).deliveryPlan?.birthCompanion ||
          "",
      );
      setCompanionPhone(p4kData.birthCompanionPhone || "");

      const donors =
        p4kData.bloodDonors ||
        (p4kData as unknown as Record<string, { bloodDonors?: Array<{ name?: string; bloodType?: string; bloodGroup?: string; phone?: string; phoneNumber?: string }> }>).deliveryPlan?.bloodDonors;

      if (donors && donors.length > 0) {
        const first = donors[0] as unknown as Record<string, string>;
        if (first) {
          setDonorName(first.name || "");
          setDonorBloodType(first.bloodType || first.bloodGroup || "");
          setDonorPhone(first.phone || first.phoneNumber || "");
        }
      }
    }
  }, [p4kData]);

  // Sync initial referral plan values from server data
  useEffect(() => {
    if (referralData) {
      setReferralFacility(
        referralData.customDestinationFacilityName ||
          referralData.destinationFacility?.name ||
          (referralData as unknown as Record<string, string>).referralFacility ||
          "",
      );
      setSeaTransportType(
        referralData.transportType ||
          (referralData as unknown as Record<string, string>).seaTransportMode ||
          "Speedboat Ambulans",
      );
      setMotorisContact(
        referralData.transportContactNumber
          ? referralData.transportOperatorName
            ? `${referralData.transportContactNumber} (${referralData.transportOperatorName})`
            : referralData.transportContactNumber
          : referralData.transportOperatorName ||
            (referralData as unknown as Record<string, string>).boatDriverContact ||
            "",
      );
      setRtkName(
        referralData.rtkName ||
          ((referralData as unknown as Record<string, boolean>).transitHomeAvailable ? "Tersedia dekat RS Rujukan" : ""),
      );
      setTravelMinutes(
        referralData.estimatedTravelTimeMinutes
          ? String(referralData.estimatedTravelTimeMinutes)
          : "",
      );
    }
  }, [referralData]);

  const handleSaveBirthPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setBirthPlanError(null);
    try {
      const bloodDonors = donorName
        ? [
            {
              name: donorName,
              bloodType: donorBloodType || "O",
              phone: donorPhone,
            },
          ]
        : [];

      await updateP4kMutation.mutateAsync({
        deliveryAttendant: birthAttendant,
        customDeliveryFacilityName: birthPlace,
        birthCompanionName: companionName,
        birthCompanionPhone: companionPhone,
        bloodDonors,
      });
      setEditingBirthPlan(false);
    } catch (err) {
      const mapped = extractAndMapError(err);
      setBirthPlanError(
        mapped.fieldErrors && Object.keys(mapped.fieldErrors).length > 0
          ? mapped.message
          : "Gagal menyimpan rencana persalinan. Silakan coba kembali.",
      );
    }
  };

  const handleSaveReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    setReferralError(null);
    try {
      await updateReferralMutation.mutateAsync({
        customDestinationFacilityName: referralFacility,
        transportType: seaTransportType,
        transportContactNumber: motorisContact,
        rtkName: rtkName,
        estimatedTravelTimeMinutes: travelMinutes ? parseInt(travelMinutes, 10) : undefined,
      });
      setEditingReferral(false);
    } catch (err) {
      const mapped = extractAndMapError(err);
      setReferralError(
        mapped.fieldErrors && Object.keys(mapped.fieldErrors).length > 0
          ? mapped.message
          : "Gagal menyimpan rencana rujukan. Silakan coba kembali.",
      );
    }
  };

  const handleToggleChecklist = async (itemKey: string, currentChecked: boolean) => {
    try {
      await patchChecklistMutation.mutateAsync({
        items: [{ itemKey, checked: !currentChecked }],
      });
    } catch {
      // handled by mutation error
    }
  };

  const checklistItems = checklistData?.items ?? [];
  const checklistProgress = checklistData?.progress ?? {
    total: checklistItems.length,
    checked: checklistItems.filter((i) => i.checked).length,
    percentage:
      checklistItems.length > 0
        ? Math.round(
            (checklistItems.filter((i) => i.checked).length /
              checklistItems.length) *
              100,
          )
        : 0,
  };

  const p4kRecord = p4kData as unknown as
    | {
        deliveryPlan?: {
          birthAttendant?: string;
          birthPlace?: string;
          birthCompanion?: string;
          bloodDonors?: Array<{
            name?: string;
            bloodType?: string;
            bloodGroup?: string;
            phone?: string;
            phoneNumber?: string;
          }>;
        };
        targetDeliveryDate?: string;
      }
    | undefined;

  const refRecord = referralData as unknown as
    | {
        referralFacility?: string;
        seaTransportMode?: string;
        boatDriverContact?: string;
        transitHomeAvailable?: boolean;
        estimatedTravelTimeMinutes?: number;
      }
    | undefined;

  const hplDate =
    p4kData?.estimatedDueDate ||
    p4kRecord?.targetDeliveryDate ||
    user?.activePregnancy?.estimatedDueDate;

  const displayAttendant =
    p4kData?.deliveryAttendant ||
    p4kRecord?.deliveryPlan?.birthAttendant ||
    "Belum Ditentukan";

  const displayPlace =
    p4kData?.customDeliveryFacilityName ||
    p4kData?.deliveryFacility?.name ||
    p4kRecord?.deliveryPlan?.birthPlace ||
    "Belum Ditentukan";

  const displayCompanion =
    p4kData?.birthCompanionName ||
    p4kRecord?.deliveryPlan?.birthCompanion ||
    "Belum Ditentukan";

  const rawDonors =
    p4kData?.bloodDonors ||
    p4kRecord?.deliveryPlan?.bloodDonors;

  const displayRefFacility =
    referralData?.customDestinationFacilityName ||
    referralData?.destinationFacility?.name ||
    refRecord?.referralFacility ||
    "RSUD Dr. H. Chasan Boesoirie Ternate";

  const displayTransportType =
    referralData?.transportType ||
    refRecord?.seaTransportMode ||
    "Speedboat Ambulans";

  const displayDriverContact =
    referralData?.transportContactNumber ||
    referralData?.transportOperatorName ||
    refRecord?.boatDriverContact ||
    "08123444555 (Pak Ali)";

  const displayRtk =
    referralData?.rtkName ||
    (refRecord?.transitHomeAvailable ? "Tersedia dekat RS Rujukan" : "Tersedia dekat RS Rujukan");

  const displayTravelMinutes =
    referralData?.estimatedTravelTimeMinutes ??
    refRecord?.estimatedTravelTimeMinutes ??
    45;

  return (
    <MotherAppShell
      title="P4K & Rujukan"
      subtitle="Kesiagaan Persalinan Kepulauan"
      showBack={true}
      onBack={() => navigate("/m/home")}
    >
      <div className="space-y-4">
        {/* Routine Clinical Safety Note */}
        <div
          role="note"
          aria-label="Catatan Keselamatan Medis"
          className="rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-xs text-slate-700 shadow-xs"
        >
          <div className="flex items-start gap-2.5">
            <span className="text-sm shrink-0" aria-hidden="true">
              ℹ️
            </span>
            <div className="leading-snug">
              <span className="font-semibold text-slate-900">Catatan Medis: </span>
              <span>Bila mengalami komplikasi atau tanda bahaya persalinan, </span>
              <strong className="font-semibold text-slate-900">
                Segera menuju fasilitas kesehatan. Jangan menunggu balasan melalui aplikasi.
              </strong>
            </div>
          </div>
        </div>

        {/* Title Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Perencanaan Persalinan (P4K)</h1>
          <p className="mt-1 text-xs text-slate-500">
            Program Perencanaan Persalinan dan Pencegahan Komplikasi & Kesiagaan Rujukan Kepulauan
          </p>
        </div>

        {/* Status & HPL Card */}
        <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
              P4K Aktif
            </span>
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-800 ring-1 ring-sky-200">
              Transportasi Laut
            </span>
          </div>
          <div className="pt-1">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Taksiran Persalinan (HPL)
            </p>
            <p className="text-lg font-black text-slate-900 mt-0.5">
              {hplDate ? formatIndonesianDate(hplDate) : "Belum Ditentukan"}
            </p>
          </div>
        </Card>

        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("birthPlan")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "birthPlan"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rencana Persalinan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("referral")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "referral"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Rujukan & Laut
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("checklist")}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition-all ${
              activeTab === "checklist"
                ? "bg-white text-emerald-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Checklist
          </button>
        </div>

        {/* Tab 1: Rencana Persalinan */}
        {activeTab === "birthPlan" && (
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Rencana Persalinan Tersusun
              </h2>
              {!editingBirthPlan && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditingBirthPlan(true)}
                  className="text-xs font-semibold py-1 px-3 h-auto"
                >
                  Ubah Rencana Persalinan
                </Button>
              )}
            </div>

            {birthPlanError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold">
                {birthPlanError}
              </div>
            )}

            {editingBirthPlan ? (
              <form onSubmit={handleSaveBirthPlan} className="space-y-3.5">
                <div>
                  <label htmlFor="p4k-attendant" className="block text-xs font-semibold text-slate-700 mb-1">
                    Penolong Persalinan *
                  </label>
                  <input
                    id="p4k-attendant"
                    type="text"
                    value={birthAttendant}
                    onChange={(e) => setBirthAttendant(e.target.value)}
                    required
                    placeholder="Contoh: Bidan Siti"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="p4k-place" className="block text-xs font-semibold text-slate-700 mb-1">
                    Tempat Bersalin *
                  </label>
                  <input
                    id="p4k-place"
                    type="text"
                    value={birthPlace}
                    onChange={(e) => setBirthPlace(e.target.value)}
                    required
                    placeholder="Contoh: Puskesmas Kalumata"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="p4k-companion" className="block text-xs font-semibold text-slate-700 mb-1">
                    Pendamping Persalinan
                  </label>
                  <input
                    id="p4k-companion"
                    type="text"
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="Contoh: Suami (Budi)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="p4k-donor-name" className="block text-xs font-semibold text-slate-700 mb-1">
                    Calon Pendonor Darah
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      id="p4k-donor-name"
                      type="text"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      placeholder="Nama Donor"
                      className="col-span-2 rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={donorBloodType}
                      onChange={(e) => setDonorBloodType(e.target.value)}
                      placeholder="Gol (O)"
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setEditingBirthPlan(false);
                      setBirthPlanError(null);
                    }}
                    className="flex-1 text-xs font-semibold py-2"
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={updateP4kMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2"
                  >
                    {updateP4kMutation.isPending ? "Menyimpan..." : "Simpan Rencana"}
                  </Button>
                </div>
              </form>
            ) : loadingP4k ? (
              <p className="text-xs text-slate-500 text-center py-4">Memuat rencana persalinan...</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Penolong Persalinan:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {displayAttendant}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Tempat Persalinan:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {displayPlace}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Pendamping Persalinan:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {displayCompanion}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Calon Pendonor Darah:</span>
                  {rawDonors && rawDonors.length > 0 ? (
                    <div className="mt-1 space-y-1">
                      {rawDonors.map((donorItem, i) => {
                        const d = donorItem as unknown as Record<string, string>;
                        return (
                          <p key={i} className="text-xs font-semibold text-slate-800">
                            • {d.name} (Golongan Darah {d.bloodType || d.bloodGroup || "-"}) — {d.phone || d.phoneNumber || "-"}
                          </p>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-700 mt-0.5">Belum Terdaftar</p>
                  )}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Tab 2: Rujukan & Transportasi Laut */}
        {activeTab === "referral" && (
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                Kesiagaan Rujukan & Laut
              </h2>
              {!editingReferral && (
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setEditingReferral(true)}
                  className="text-xs font-semibold py-1 px-3 h-auto"
                >
                  Ubah Rencana Rujukan
                </Button>
              )}
            </div>

            {referralError && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs text-rose-700 font-semibold">
                {referralError}
              </div>
            )}

            {editingReferral ? (
              <form onSubmit={handleSaveReferral} className="space-y-3.5">
                <div>
                  <label htmlFor="ref-facility" className="block text-xs font-semibold text-slate-700 mb-1">
                    Fasilitas Rujukan Tujuan *
                  </label>
                  <input
                    id="ref-facility"
                    type="text"
                    value={referralFacility}
                    onChange={(e) => setReferralFacility(e.target.value)}
                    required
                    placeholder="Contoh: RSUD Dr. H. Chasan Boesoirie Ternate"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ref-transport" className="block text-xs font-semibold text-slate-700 mb-1">
                    Moda Transportasi Laut *
                  </label>
                  <input
                    id="ref-transport"
                    type="text"
                    value={seaTransportType}
                    onChange={(e) => setSeaTransportType(e.target.value)}
                    required
                    placeholder="Contoh: Speedboat Ambulans / Perahu Motor"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ref-motoris" className="block text-xs font-semibold text-slate-700 mb-1">
                    Kontak Motoris / Sopir Ambulans Laut
                  </label>
                  <input
                    id="ref-motoris"
                    type="text"
                    value={motorisContact}
                    onChange={(e) => setMotorisContact(e.target.value)}
                    placeholder="Contoh: 08123444555 (Pak Ali)"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ref-rtk" className="block text-xs font-semibold text-slate-700 mb-1">
                    Rumah Tunggu Kelahiran (RTK)
                  </label>
                  <input
                    id="ref-rtk"
                    type="text"
                    value={rtkName}
                    onChange={(e) => setRtkName(e.target.value)}
                    placeholder="Contoh: RTK Kota Ternate"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="ref-travel-time" className="block text-xs font-semibold text-slate-700 mb-1">
                    Perkiraan Waktu Tempuh Laut (Menit)
                  </label>
                  <input
                    id="ref-travel-time"
                    type="number"
                    value={travelMinutes}
                    onChange={(e) => setTravelMinutes(e.target.value)}
                    placeholder="45"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      setEditingReferral(false);
                      setReferralError(null);
                    }}
                    className="flex-1 text-xs font-semibold py-2"
                  >
                    Batal
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="submit"
                    disabled={updateReferralMutation.isPending}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2"
                  >
                    {updateReferralMutation.isPending ? "Menyimpan..." : "Simpan Rencana Rujukan"}
                  </Button>
                </div>
              </form>
            ) : loadingReferral ? (
              <p className="text-xs text-slate-500 text-center py-4">Memuat rencana rujukan...</p>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-500">Fasilitas Rujukan Tujuan:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    {displayRefFacility}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Transportasi Laut:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    🚢 {displayTransportType}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Kontak Motoris / Pengemudi:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    📞 {displayDriverContact}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Rumah Tunggu Kelahiran (RTK):</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    🏡 {displayRtk}
                  </p>
                </div>

                <div>
                  <span className="text-slate-500">Perkiraan Waktu Tempuh Laut:</span>
                  <p className="text-sm font-bold text-slate-900 mt-0.5">
                    ⏱️ {displayTravelMinutes} Menit
                  </p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Checklist */}
        {activeTab === "checklist" && (
          <Card className="border border-slate-200/90 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                  Daftar Kesiapan (Checklist)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {checklistProgress.checked} dari {checklistProgress.total} selesai ({checklistProgress.percentage}%)
                </p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200">
                {checklistProgress.percentage}%
              </span>
            </div>

            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${checklistProgress.percentage}%` }}
              />
            </div>

            {loadingChecklist ? (
              <p className="text-xs text-slate-500 text-center py-4">Memuat daftar checklist...</p>
            ) : checklistItems.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">Daftar kesiapan belum tersedia.</p>
            ) : (
              <div className="space-y-2 pt-1">
                {checklistItems.map((item) => (
                  <label
                    key={item.itemKey}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 transition-colors hover:bg-slate-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => handleToggleChecklist(item.itemKey, item.checked)}
                      disabled={patchChecklistMutation.isPending}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs font-bold ${
                          item.checked ? "text-slate-400 line-through" : "text-slate-800"
                        }`}
                      >
                        {item.title}
                      </p>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                        {item.category}
                      </span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </MotherAppShell>
  );
}
