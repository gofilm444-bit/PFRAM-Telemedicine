import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, type Href } from "expo-router";
import { colors, radius, spacing } from "@pfram/design-tokens";
import type { MonitoringQuery } from "@pfram/shared-types";
import {
  AppButton,
  AppHeader,
  EmptyState,
  ErrorState,
  LoadingState,
  ScreenContainer,
} from "../../components/ui";
import { MonitoringHistoryItem } from "../../components/monitoring";
import { useMonitoringList } from "../../lib/monitoring-queries";

type FilterType = "all" | "weight" | "blood_pressure";

const FILTERS: Array<{ id: FilterType; label: string }> = [
  { id: "all", label: "Semua" },
  { id: "weight", label: "Berat Badan" },
  { id: "blood_pressure", label: "Tekanan Darah" },
];

export default function MonitoringHistoryScreen() {
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [page, setPage] = useState<number>(1);
  const limit = 10;

  const query: MonitoringQuery = {
    type: filterType,
    page,
    limit,
    sort: "desc",
  };

  const { data, isLoading, isError, refetch } = useMonitoringList(query);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <ScreenContainer>
      <AppHeader
        title="Riwayat Pemantauan"
        subtitle="Daftar catatan kondisi fisik Anda"
      />

      {/* Filter Tabs */}
      <View style={s.filterRow}>
        {FILTERS.map((f) => {
          const isActive = filterType === f.id;
          return (
            <Pressable
              key={f.id}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                setFilterType(f.id);
                setPage(1);
              }}
              style={[s.filterChip, isActive && s.filterChipActive]}
            >
              <Text
                style={[s.filterText, isActive && s.filterTextActive]}
              >
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Content states */}
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState
          message="Terdapat masalah saat memuat data."
          retryTitle="Coba Lagi"
          onRetry={() => refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          message="Belum ada catatan pemantauan."
          actionTitle="Tambah Catatan"
          onAction={() => router.push("/monitoring/new")}
        />
      ) : (
        <View style={s.listContainer}>
          {items.map((item) => (
            <MonitoringHistoryItem
              key={item.publicId}
              item={item}
              onPress={() =>
                router.push(`/monitoring/${item.publicId}` as Href)
              }
            />
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <View style={s.paginationRow}>
              <AppButton
                title="Sebelumnya"
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
              />
              <Text style={s.pageText}>
                Halaman {page} dari {totalPages}
              </Text>
              <AppButton
                title="Selanjutnya"
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </View>
          )}
        </View>
      )}

      <View style={s.footerActions}>
        <AppButton
          title="+ Tambah Catatan"
          onPress={() => router.push("/monitoring/new")}
        />
        <AppButton title="Kembali" onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}

const s = StyleSheet.create({
  filterRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  filterChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#C7D8D2",
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContainer: {
    gap: spacing.md,
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  pageText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: "600",
  },
  footerActions: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
});
