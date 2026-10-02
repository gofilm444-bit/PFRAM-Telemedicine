import { Text } from "react-native";
import { router } from "expo-router";
import {
  AppButton,
  AppCard,
  AppHeader,
  ScreenContainer,
  StatusBadge,
} from "../../components/ui";
import { useAuth } from "../../lib/auth";
import {
  useMotherAdherenceSummary,
  useMotherReminders,
  useMotherUpcomingAnc,
} from "../../lib/anc-queries";
import {
  AdherenceSummaryCard,
  DailyIronTabletCard,
  UpcomingAncCard,
} from "../../components/anc";

export default function Home() {
  const { user } = useAuth();
  const upcomingAncQuery = useMotherUpcomingAnc();
  const remindersQuery = useMotherReminders({ type: "IRON_TABLET" });
  const adherenceQuery = useMotherAdherenceSummary();

  const todayTtdReminder = remindersQuery.data?.items?.[0] ?? null;

  return (
    <ScreenContainer>
      <AppHeader
        title={`Halo, ${user?.displayName ?? "Ibu"}`}
        subtitle="Pantau Kehamilan, Lindungi Ibu dan Bayi"
      />
      <StatusBadge label="Fondasi aktif" />

      {/* Pregnancy Summary */}
      <AppCard>
        <Text>
          Usia kehamilan:{" "}
          {user?.activePregnancy?.gestationalAge
            ? `${user.activePregnancy.gestationalAge.weeks} minggu ${user.activePregnancy.gestationalAge.days} hari`
            : "Belum tersedia"}
        </Text>
        <Text>Trimester: {user?.activePregnancy?.trimester ?? "-"}</Text>
        <Text>
          Perkiraan persalinan: {user?.activePregnancy?.estimatedDueDate ?? "-"}
        </Text>
        <Text>
          Fasilitas: {user?.selectedFacility?.name ?? "Belum dipilih"}
        </Text>
        <Text>
          Bidan pendamping:{" "}
          {user?.activeMidwifeAssignment?.midwife.fullName ??
            "Bidan pendamping belum ditetapkan"}
        </Text>
      </AppCard>

      {/* 1. Daily Iron Tablet Reminder */}
      <DailyIronTabletCard
        reminder={todayTtdReminder}
        isLoading={remindersQuery.isLoading}
      />

      {/* 2. Upcoming ANC Visit Card */}
      <UpcomingAncCard
        schedule={upcomingAncQuery.data}
        isLoading={upcomingAncQuery.isLoading}
      />

      {/* 3. Adherence Summary */}
      <AdherenceSummaryCard
        adherence={adherenceQuery.data}
        isLoading={adherenceQuery.isLoading}
      />

      {/* 4. P4K & Rencana Rujukan Persalinan */}
      <AppCard>
        <Text style={{ fontSize: 16, fontWeight: "bold", color: "#1e293b", marginBottom: 4 }}>
          P4K & Rencana Rujukan Kepulauan
        </Text>
        <Text style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          Perencanaan penolong, transportasi air/darat, donor darah, checklist tas persalinan, dan Rumah Tunggu Kelahiran (RTK).
        </Text>
        <AppButton
          title="Buka Rencana P4K & Rujukan"
          onPress={() =>
            router.push(
              "/mother/p4k" as unknown as Parameters<typeof router.push>[0],
            )
          }
        />
      </AppCard>

      {/* Advisory Card */}
      <AppCard>
        <Text>
          Pengingat dan rekap kepatuhan ini bersifat suportif dan non-diagnostik.
          Konsultasikan selalu kondisi kehamilan Ibu kepada Bidan atau Dokter
          pendamping.
        </Text>
      </AppCard>
    </ScreenContainer>
  );
}
