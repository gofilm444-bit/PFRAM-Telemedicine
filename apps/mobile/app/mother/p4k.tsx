import React, { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  colors,
  minimumTouchTarget,
  radius,
  spacing,
} from "@pfram/design-tokens";
import { AppHeader, ScreenContainer } from "../../components/ui";
import {
  useMotherP4k,
  useMotherP4kChecklist,
  useMotherReferralPlan,
  usePatchMotherP4kChecklist,
  useUpdateMotherP4k,
  useUpdateMotherReferralPlan,
} from "../../lib/p4k-queries";

export default function MotherP4kScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"p4k" | "checklist" | "referral">("p4k");
  const [showP4kModal, setShowP4kModal] = useState(false);
  const [showReferralModal, setShowReferralModal] = useState(false);

  // Queries
  const p4kQuery = useMotherP4k();
  const checklistQuery = useMotherP4kChecklist();
  const referralQuery = useMotherReferralPlan();

  // Mutations
  const updateP4kMutation = useUpdateMotherP4k();
  const patchChecklistMutation = usePatchMotherP4kChecklist();
  const updateReferralMutation = useUpdateMotherReferralPlan();

  const p4k = p4kQuery.data;
  const checklist = checklistQuery.data?.items ?? p4k?.checklistItems ?? [];
  const progress = checklistQuery.data?.progress ?? p4k?.checklistProgress ?? {
    total: checklist.length,
    checked: checklist.filter((i) => i.checked).length,
    percentage: 0,
  };
  const referral = referralQuery.data;

  // P4K Form State
  const [deliveryAttendant, setDeliveryAttendant] = useState("");
  const [birthCompanionName, setBirthCompanionName] = useState("");
  const [birthCompanionPhone, setBirthCompanionPhone] = useState("");
  const [transportation, setTransportation] = useState("");
  const [fundingSource, setFundingSource] = useState("");
  const [bpjsNumber, setBpjsNumber] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorBloodType, setDonorBloodType] = useState("");
  const [donorPhone, setDonorPhone] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [preparationNotes, setPreparationNotes] = useState("");

  // Referral Form State
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

  const openP4kEdit = () => {
    if (p4k) {
      setDeliveryAttendant(p4k.deliveryAttendant || "BIDAN");
      setBirthCompanionName(p4k.birthCompanionName || "");
      setBirthCompanionPhone(p4k.birthCompanionPhone || "");
      setTransportation(p4k.transportation || "AMBULANS");
      setFundingSource(p4k.fundingSource || "BPJS");
      setBpjsNumber(p4k.bpjsNumber || "");
      const firstDonor = p4k.bloodDonors?.[0];
      if (firstDonor) {
        setDonorName(firstDonor.name || "");
        setDonorBloodType(firstDonor.bloodType || "");
        setDonorPhone(firstDonor.phone || "");
      } else {
        setDonorName("");
        setDonorBloodType("");
        setDonorPhone("");
      }
      setEmergencyContactName(p4k.emergencyContactName || "");
      setEmergencyContactPhone(p4k.emergencyContactPhone || "");
      setPreparationNotes(p4k.preparationNotes || "");
    }
    setShowP4kModal(true);
  };

  const handleSaveP4k = async () => {
    try {
      const bloodDonors = donorName.trim()
        ? [{ name: donorName.trim(), bloodType: donorBloodType.trim() || "O", phone: donorPhone.trim() }]
        : [];

      await updateP4kMutation.mutateAsync({
        deliveryAttendant: deliveryAttendant.trim() || "BIDAN",
        birthCompanionName: birthCompanionName.trim() || null,
        birthCompanionPhone: birthCompanionPhone.trim() || null,
        transportation: transportation.trim() || null,
        fundingSource: fundingSource.trim() || null,
        bpjsNumber: bpjsNumber.trim() || null,
        bloodDonors,
        emergencyContactName: emergencyContactName.trim() || null,
        emergencyContactPhone: emergencyContactPhone.trim() || null,
        preparationNotes: preparationNotes.trim() || null,
      });
      setShowP4kModal(false);
    } catch (e) {
      console.warn("Failed to update P4K", e);
    }
  };

  const openReferralEdit = () => {
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
    setShowReferralModal(true);
  };

  const handleSaveReferral = async () => {
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
    } catch (e) {
      console.warn("Failed to update referral plan", e);
    }
  };

  const handleToggleChecklist = (itemKey: string, currentChecked: boolean) => {
    patchChecklistMutation.mutate({
      items: [{ itemKey, checked: !currentChecked }],
    });
  };

  const isLoading = p4kQuery.isLoading || checklistQuery.isLoading || referralQuery.isLoading;

  return (
    <ScreenContainer scroll={false}>
      {/* Top Navigation */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          style={styles.backBtn}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>â† Kembali</Text>
        </Pressable>
      </View>

      <AppHeader
        title="P4K & Rujukan Digital"
        subtitle="Program Perencanaan Persalinan dan Pencegahan Komplikasi di Wilayah Kepulauan."
      />

      {/* Navigation Tabs */}
      <View style={styles.tabRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tab Rencana P4K"
          style={[styles.tabBtn, activeTab === "p4k" && styles.tabBtnActive]}
          onPress={() => setActiveTab("p4k")}
        >
          <Text style={[styles.tabBtnText, activeTab === "p4k" && styles.tabBtnTextActive]}>
            Perencanaan
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tab Tas Persalinan"
          style={[styles.tabBtn, activeTab === "checklist" && styles.tabBtnActive]}
          onPress={() => setActiveTab("checklist")}
        >
          <Text style={[styles.tabBtnText, activeTab === "checklist" && styles.tabBtnTextActive]}>
            Tas Persalinan ({progress.checked}/{progress.total})
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tab Rujukan Kepulauan"
          style={[styles.tabBtn, activeTab === "referral" && styles.tabBtnActive]}
          onPress={() => setActiveTab("referral")}
        >
          <Text style={[styles.tabBtnText, activeTab === "referral" && styles.tabBtnTextActive]}>
            Rujukan Laut
          </Text>
        </Pressable>
      </View>

      {/* Main Content Area */}
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.mutedText}>Memuat data perencanaan...</Text>
          </View>
        ) : activeTab === "p4k" ? (
          /* TAB 1: P4K Plan */
          <View>
            {/* Progress summary banner */}
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Kesiapan Perlengkapan Persalinan</Text>
                <Text style={styles.progressBadge}>
                  {progress.checked} dari {progress.total} item ({progress.percentage}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
              </View>
              <Text style={styles.progressHint}>
                *Catatan administratif kesiapan perlengkapan, bukan penilaian klinis atau risiko medis.
              </Text>
            </View>

            {/* P4K Details Card */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Data Perencanaan Persalinan (P4K)</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit P4K"
                  style={styles.editBtn}
                  onPress={openP4kEdit}
                >
                  <Text style={styles.editBtnText}>âœ Edit</Text>
                </Pressable>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Perkiraan Lahir (HPL):</Text>
                <Text style={styles.fieldValue}>{p4k?.estimatedDueDate || "Belum ditentukan"}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Tempat Persalinan:</Text>
                <Text style={styles.fieldValue}>
                  {p4k?.deliveryFacility?.name || p4k?.customDeliveryFacilityName || "Puskesmas / Faskes Terdekat"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Penolong Persalinan:</Text>
                <Text style={styles.fieldValue}>{p4k?.deliveryAttendant || "BIDAN"}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Pendamping Persalinan:</Text>
                <Text style={styles.fieldValue}>
                  {p4k?.birthCompanionName ? `${p4k.birthCompanionName} (${p4k.birthCompanionPhone || "-"})` : "Belum diisi"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Transportasi ke Faskes:</Text>
                <Text style={styles.fieldValue}>{p4k?.transportation || "AMBULANS"}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Sumber Pembiayaan:</Text>
                <Text style={styles.fieldValue}>
                  {p4k?.fundingSource || "BPJS"}{p4k?.bpjsNumber ? ` (No: ${p4k.bpjsNumber})` : ""}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Calon Donor Darah:</Text>
                <Text style={styles.fieldValue}>
                  {p4k?.bloodDonors && p4k.bloodDonors.length > 0
                    ? p4k.bloodDonors.map((d) => `${d.name} (${d.bloodType}) â€¢ ${d.phone}`).join(", ")
                    : "Belum disiapkan"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Kontak Darurat:</Text>
                <Text style={styles.fieldValue}>
                  {p4k?.emergencyContactName
                    ? `${p4k.emergencyContactName} (${p4k.emergencyContactPhone || "-"})`
                    : "Belum diisi"}
                </Text>
              </View>

              {p4k?.preparationNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Catatan Khusus Persiapan:</Text>
                  <Text style={styles.notesText}>{p4k.preparationNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : activeTab === "checklist" ? (
          /* TAB 2: Checklist Tas Persalinan */
          <View>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Tas Persalinan & Kebutuhan Ibu-Bayi</Text>
                <Text style={styles.progressBadge}>
                  {progress.checked} dari {progress.total} siap ({progress.percentage}%)
                </Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${progress.percentage}%` }]} />
              </View>
              <Text style={styles.progressHint}>
                Centang setiap perlengkapan yang sudah dimasukkan ke dalam tas siaga persalinan.
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Daftar Item Kesiapan</Text>
              {checklist.map((item) => (
                <Pressable
                  key={item.itemKey}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.checked }}
                  accessibilityLabel={`Tandai ${item.title}`}
                  style={styles.checkItemRow}
                  onPress={() => handleToggleChecklist(item.itemKey, item.checked)}
                >
                  <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                    {item.checked ? <Text style={styles.checkboxCheckmark}>âœ“</Text> : null}
                  </View>
                  <View style={styles.checkItemContent}>
                    <Text style={[styles.checkItemTitle, item.checked && styles.checkItemTitleChecked]}>
                      {item.title}
                    </Text>
                    <Text style={styles.checkItemCategory}>Kategori: {item.category}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          /* TAB 3: Rujukan Kepulauan */
          <View>
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Rencana Rujukan Wilayah Kepulauan</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit Rencana Rujukan"
                  style={styles.editBtn}
                  onPress={openReferralEdit}
                >
                  <Text style={styles.editBtnText}>âœ Edit</Text>
                </Pressable>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Fasilitas Asal:</Text>
                <Text style={styles.fieldValue}>
                  {referral?.sourceFacility?.name || referral?.customSourceFacilityName || "Puskesmas Asal"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Fasilitas Rujukan Tujuan:</Text>
                <Text style={styles.fieldValue}>
                  {referral?.destinationFacility?.name || referral?.customDestinationFacilityName || "RSUD Rujukan / Faskes Lanjutan"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Moda Transportasi Rujukan:</Text>
                <Text style={styles.fieldValue}>{referral?.transportType || "AMBULANCE"}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Operator / Pengemudi:</Text>
                <Text style={styles.fieldValue}>
                  {referral?.transportOperatorName
                    ? `${referral.transportOperatorName} (${referral.transportContactNumber || "-"})`
                    : "Belum disiapkan"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Estimasi Waktu Tempuh:</Text>
                <Text style={styles.fieldValue}>
                  {referral?.estimatedTravelTimeMinutes ? `${referral.estimatedTravelTimeMinutes} Menit` : "-"}
                </Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Jadwal / Jam Operasional:</Text>
                <Text style={styles.fieldValue}>{referral?.manualDepartureSchedule || "Standby 24 Jam Darurat"}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Titik Berangkat / Dermaga:</Text>
                <Text style={styles.fieldValue}>{referral?.departurePoint || "-"}</Text>
              </View>

              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Pendamping Rujukan:</Text>
                <Text style={styles.fieldValue}>{referral?.companions || "Keluarga & Bidan Desa"}</Text>
              </View>

              {/* RTK Section */}
              <View style={styles.rtkSection}>
                <Text style={styles.rtkHeader}>Rumah Tunggu Kelahiran (RTK)</Text>
                <Text style={styles.rtkDesc}>
                  Fasilitas singgah ibu hamil dekat RSUD rujukan untuk menunggu waktu bersalin.
                </Text>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Nama RTK:</Text>
                  <Text style={styles.fieldValue}>{referral?.rtkName || "Belum dicatat"}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Alamat RTK:</Text>
                  <Text style={styles.fieldValue}>{referral?.rtkAddress || "-"}</Text>
                </View>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Kontak RTK:</Text>
                  <Text style={styles.fieldValue}>{referral?.rtkPhone || "-"}</Text>
                </View>
              </View>

              {/* Alternative Notes */}
              {referral?.alternativeNotes ? (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Rencana Alternatif Cuaca Buruk / Gelombang:</Text>
                  <Text style={styles.notesText}>{referral.alternativeNotes}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modal Edit P4K */}
      <Modal visible={showP4kModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Perencanaan Persalinan (P4K)</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Penolong Persalinan (Bidan / Dokter / Nakes)</Text>
              <TextInput
                style={styles.textInput}
                value={deliveryAttendant}
                onChangeText={setDeliveryAttendant}
                placeholder="Contoh: BIDAN atau DOKTER_SPESIALIS"
              />

              <Text style={styles.inputLabel}>Nama Pendamping Persalinan</Text>
              <TextInput
                style={styles.textInput}
                value={birthCompanionName}
                onChangeText={setBirthCompanionName}
                placeholder="Nama suami / anggota keluarga"
              />

              <Text style={styles.inputLabel}>Nomor Kontak Pendamping</Text>
              <TextInput
                style={styles.textInput}
                value={birthCompanionPhone}
                onChangeText={setBirthCompanionPhone}
                placeholder="Contoh: 081234567890"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Transportasi Menuju Faskes</Text>
              <TextInput
                style={styles.textInput}
                value={transportation}
                onChangeText={setTransportation}
                placeholder="Contoh: SPEEDBOAT / AMBULANS / LAINNYA"
              />

              <Text style={styles.inputLabel}>Sumber Dana / Pembiayaan</Text>
              <TextInput
                style={styles.textInput}
                value={fundingSource}
                onChangeText={setFundingSource}
                placeholder="Contoh: BPJS / PRIBADI / JAMPERSAL"
              />

              <Text style={styles.inputLabel}>Nomor Kartu BPJS / JKN</Text>
              <TextInput
                style={styles.textInput}
                value={bpjsNumber}
                onChangeText={setBpjsNumber}
                placeholder="Nomor kartu kepesertaan"
              />

              <Text style={styles.inputLabel}>Calon Pendonor Darah (Nama & Golongan)</Text>
              <TextInput
                style={styles.textInput}
                value={donorName}
                onChangeText={setDonorName}
                placeholder="Nama pendonor darah siaga"
              />

              <Text style={styles.inputLabel}>Golongan Darah Pendonor (O / A / B / AB)</Text>
              <TextInput
                style={styles.textInput}
                value={donorBloodType}
                onChangeText={setDonorBloodType}
                placeholder="Golongan darah"
              />

              <Text style={styles.inputLabel}>Kontak Calon Pendonor</Text>
              <TextInput
                style={styles.textInput}
                value={donorPhone}
                onChangeText={setDonorPhone}
                placeholder="Nomor telepon pendonor"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Kontak Darurat Tambahan</Text>
              <TextInput
                style={styles.textInput}
                value={emergencyContactName}
                onChangeText={setEmergencyContactName}
                placeholder="Nama kontak darurat"
              />

              <Text style={styles.inputLabel}>Nomor Kontak Darurat</Text>
              <TextInput
                style={styles.textInput}
                value={emergencyContactPhone}
                onChangeText={setEmergencyContactPhone}
                placeholder="Nomor telepon darurat"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Catatan Persiapan Lainnya</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={preparationNotes}
                onChangeText={setPreparationNotes}
                placeholder="Catatan jadwal kapal, ketersediaan BBM, dll."
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Batal"
                style={styles.modalCancelBtn}
                onPress={() => setShowP4kModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Simpan P4K"
                style={styles.modalSaveBtn}
                onPress={handleSaveP4k}
              >
                <Text style={styles.modalSaveBtnText}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Edit Referral Plan */}
      <Modal visible={showReferralModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Rencana Rujukan Kepulauan</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.inputLabel}>Moda Transportasi (SPEEDBOAT / BOAT / AMBULANCE / LAINNYA)</Text>
              <TextInput
                style={styles.textInput}
                value={transportType}
                onChangeText={setTransportType}
                placeholder="Contoh: SPEEDBOAT"
              />

              <Text style={styles.inputLabel}>Nama Operator / Nahkoda / Sopir</Text>
              <TextInput
                style={styles.textInput}
                value={transportOperatorName}
                onChangeText={setTransportOperatorName}
                placeholder="Nama nahkoda atau operator"
              />

              <Text style={styles.inputLabel}>Nomor Kontak Operator Transportasi</Text>
              <TextInput
                style={styles.textInput}
                value={transportContactNumber}
                onChangeText={setTransportContactNumber}
                placeholder="Nomor telepon operator"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Estimasi Waktu Tempuh (Menit)</Text>
              <TextInput
                style={styles.textInput}
                value={estimatedTravelTimeMinutes}
                onChangeText={setEstimatedTravelTimeMinutes}
                placeholder="Contoh: 60"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Jadwal Keberangkatan Manual</Text>
              <TextInput
                style={styles.textInput}
                value={manualDepartureSchedule}
                onChangeText={setManualDepartureSchedule}
                placeholder="Contoh: Berangkat pagi pukul 07:00 jika gelombang tenang"
              />

              <Text style={styles.inputLabel}>Titik Berangkat / Titik Kumpul</Text>
              <TextInput
                style={styles.textInput}
                value={departurePoint}
                onChangeText={setDeparturePoint}
                placeholder="Contoh: Dermaga Pulau Sebatik"
              />

              <Text style={styles.inputLabel}>Pendamping Rujukan</Text>
              <TextInput
                style={styles.textInput}
                value={companions}
                onChangeText={setCompanions}
                placeholder="Contoh: Suami & Bidan Desa"
              />

              <Text style={styles.inputLabel}>Nama Rumah Tunggu Kelahiran (RTK)</Text>
              <TextInput
                style={styles.textInput}
                value={rtkName}
                onChangeText={setRtkName}
                placeholder="Nama RTK dekat rumah sakit tujuan"
              />

              <Text style={styles.inputLabel}>Alamat RTK</Text>
              <TextInput
                style={styles.textInput}
                value={rtkAddress}
                onChangeText={setRtkAddress}
                placeholder="Alamat lengkap RTK"
              />

              <Text style={styles.inputLabel}>Kontak Telepon RTK</Text>
              <TextInput
                style={styles.textInput}
                value={rtkPhone}
                onChangeText={setRtkPhone}
                placeholder="Nomor telepon pengelola RTK"
                keyboardType="phone-pad"
              />

              <Text style={styles.inputLabel}>Rencana Alternatif Cuaca Buruk / Gelombang</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={alternativeNotes}
                onChangeText={setAlternativeNotes}
                placeholder="Contoh: Bila gelombang di atas 2m, beralih ke kapal ASDP atau lapor Basarnas"
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Batal"
                style={styles.modalCancelBtn}
                onPress={() => setShowReferralModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Simpan Rencana Rujukan"
                style={styles.modalSaveBtn}
                onPress={handleSaveReferral}
              >
                <Text style={styles.modalSaveBtnText}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  backBtn: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  backBtnText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  tabRow: {
    flexDirection: "row",
    backgroundColor: "#e2e8f0",
    borderRadius: radius.md,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabBtn: {
    flex: 1,
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
  },
  tabBtnActive: {
    backgroundColor: "#ffffff",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
  },
  tabBtnTextActive: {
    color: colors.primary,
  },
  contentContainer: {
    paddingBottom: spacing.xxl,
  },
  progressCard: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#bbf7d0",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#166534",
  },
  progressBadge: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#dcfce7",
    borderRadius: 4,
    overflow: "hidden",
    marginVertical: spacing.xs,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 4,
  },
  progressHint: {
    fontSize: 11,
    color: "#15803d",
    fontStyle: "italic",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: spacing.xs,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
  },
  editBtn: {
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.primary,
  },
  fieldRow: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  notesBox: {
    backgroundColor: "#f8fafc",
    padding: spacing.sm,
    borderRadius: radius.md,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 2,
  },
  notesText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
  },
  checkItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#f8fafc",
    minHeight: minimumTouchTarget,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: "#94a3b8",
    justifyContent: "center",
    alignItems: "center",
    marginRight: spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkboxCheckmark: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  checkItemContent: {
    flex: 1,
  },
  checkItemTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  checkItemTitleChecked: {
    textDecorationLine: "line-through",
    color: "#94a3b8",
  },
  checkItemCategory: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  rtkSection: {
    backgroundColor: "#eff6ff",
    borderRadius: radius.md,
    padding: spacing.sm,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  rtkHeader: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e40af",
    marginBottom: 2,
  },
  rtkDesc: {
    fontSize: 12,
    color: "#3b82f6",
    marginBottom: spacing.xs,
  },
  centerBox: {
    padding: spacing.xl,
    alignItems: "center",
    justifyContent: "center",
  },
  mutedText: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: "#64748b",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.md,
    maxHeight: "85%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: spacing.sm,
  },
  modalScroll: {
    marginBottom: spacing.sm,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: spacing.xs,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    minHeight: minimumTouchTarget,
    fontSize: 14,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: spacing.xs,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  modalCancelBtn: {
    flex: 1,
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: "#f1f5f9",
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#64748b",
  },
  modalSaveBtn: {
    flex: 1,
    minHeight: minimumTouchTarget,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  modalSaveBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
});
