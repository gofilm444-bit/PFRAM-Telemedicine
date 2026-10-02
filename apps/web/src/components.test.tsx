import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  Button,
  ErrorState,
  Input,
  MetricCard,
  PasswordInput,
  StatusBadge,
  formatAssignmentStatus,
  formatAuditAction,
  formatAuditResult,
  formatFacilityType,
  formatRegionLevel,
  formatUserRole,
  formatUserStatus,
  navigationForRole,
} from "./components";
import { afterEach, describe, it, expect } from "vitest";

afterEach(cleanup);

describe("komponen fondasi", () => {
  it("menampilkan error input yang aksesibel", () => {
    render(<Input id="phone" label="Nomor HP" error="Tidak valid" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Tidak valid");
  });

  it("menampilkan error state", () => {
    render(
      <MemoryRouter>
        <ErrorState message="Gagal memuat" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat");
  });

  it("menampilkan dan menyembunyikan kata sandi", () => {
    render(<PasswordInput id="password" label="Kata sandi" />);
    const input = screen.getByLabelText("Kata sandi");
    expect(input).toHaveAttribute("type", "password");
    fireEvent.click(
      screen.getByRole("button", { name: "Tampilkan kata sandi" }),
    );
    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Sembunyikan kata sandi" }),
    ).toBeInTheDocument();
  });

  it("menu admin sesuai peran dan tidak tampil untuk bidan", () => {
    const adminLabels = navigationForRole("ADMIN").map((item) => item[1]);
    const midwifeLabels = navigationForRole("MIDWIFE").map((item) => item[1]);

    expect(adminLabels).toContain("Penugasan Bidan");
    expect(adminLabels).toContain("Materi Edukasi");
    expect(midwifeLabels).not.toContain("Penugasan Bidan");
    expect(midwifeLabels).not.toContain("Materi Edukasi");
    expect(midwifeLabels).toContain("Ibu Binaan");
    expect(midwifeLabels).toContain("Perlu Tindak Lanjut");
    expect(midwifeLabels).toContain("Jadwal Belum Hadir");
    expect(midwifeLabels).toContain("Konsultasi");
    expect(midwifeLabels).toContain("Profil Bidan");
  });
});

describe("Button variants & accessibility", () => {
  it("merender primary button dengan kelas styling yang sesuai", () => {
    render(<Button variant="primary">Simpan</Button>);
    const btn = screen.getByRole("button", { name: "Simpan" });
    expect(btn).toHaveClass("bg-pfram-primary");
    expect(btn).toHaveClass("text-white");
  });

  it("merender outline button tanpa text-white yang saling menimpa", () => {
    render(<Button variant="outline">Keluar</Button>);
    const btn = screen.getByRole("button", { name: "Keluar" });
    expect(btn).toHaveClass("bg-white");
    expect(btn).toHaveClass("text-pfram-primary");
    expect(btn).not.toHaveClass("text-white");
  });

  it("merender secondary button dengan background hijau lembut", () => {
    render(<Button variant="secondary">Detail</Button>);
    const btn = screen.getByRole("button", { name: "Detail" });
    expect(btn).toHaveClass("bg-emerald-50");
    expect(btn).toHaveClass("text-pfram-text");
  });

  it("merender danger button dengan warna merah yang tegas", () => {
    render(<Button variant="danger">Hapus</Button>);
    const btn = screen.getByRole("button", { name: "Hapus" });
    expect(btn).toHaveClass("bg-rose-600");
    expect(btn).toHaveClass("text-white");
  });

  it("merender ghost button dengan teks gelap transparan", () => {
    render(<Button variant="ghost">Batal</Button>);
    const btn = screen.getByRole("button", { name: "Batal" });
    expect(btn).toHaveClass("bg-transparent");
    expect(btn).toHaveClass("text-slate-700");
  });

  it("menangani tombol legasi dengan bg-white secara aman tanpa text-white", () => {
    render(<Button className="bg-white text-pfram-primary">Aktifkan</Button>);
    const btn = screen.getByRole("button", { name: "Aktifkan" });
    expect(btn).toHaveClass("text-pfram-primary");
    expect(btn).not.toHaveClass("text-white");
  });
});

describe("Human-readable formatters", () => {
  it("memetakan peran pengguna ke Bahasa Indonesia", () => {
    expect(formatUserRole("ADMIN")).toBe("Administrator");
    expect(formatUserRole("MIDWIFE")).toBe("Bidan");
    expect(formatUserRole("MOTHER")).toBe("Ibu Hamil");
    expect(formatUserRole(undefined)).toBe("-");
  });

  it("memetakan status akun ke Bahasa Indonesia", () => {
    expect(formatUserStatus("ACTIVE")).toBe("Aktif");
    expect(formatUserStatus("INACTIVE")).toBe("Nonaktif");
    expect(formatUserStatus(undefined)).toBe("-");
  });

  it("memetakan status penugasan beserta varian badge semantik", () => {
    expect(formatAssignmentStatus("ACTIVE")).toEqual({
      label: "Aktif",
      variant: "success",
    });
    expect(formatAssignmentStatus("REPLACED")).toEqual({
      label: "Diganti",
      variant: "warning",
    });
    expect(formatAssignmentStatus("COMPLETED")).toEqual({
      label: "Selesai",
      variant: "info",
    });
    expect(formatAssignmentStatus("CANCELLED")).toEqual({
      label: "Dibatalkan",
      variant: "neutral",
    });
  });

  it("memetakan tingkat wilayah ke Bahasa Indonesia", () => {
    expect(formatRegionLevel("PROVINCE")).toBe("Provinsi");
    expect(formatRegionLevel("REGENCY")).toBe("Kabupaten/Kota");
    expect(formatRegionLevel("DISTRICT")).toBe("Kecamatan");
    expect(formatRegionLevel("VILLAGE")).toBe("Kelurahan/Desa");
  });

  it("memetakan jenis fasilitas kesehatan ke Bahasa Indonesia", () => {
    expect(formatFacilityType("PUSKESMAS")).toBe("Puskesmas");
    expect(formatFacilityType("HOSPITAL")).toBe("Rumah Sakit");
    expect(formatFacilityType("CLINIC")).toBe("Klinik");
    expect(formatFacilityType("INDEPENDENT_MIDWIFE")).toBe(
      "Praktik Mandiri Bidan",
    );
    expect(formatFacilityType("REFERRAL_FACILITY")).toBe("Fasilitas Rujukan");
    expect(formatFacilityType("OTHER")).toBe("Lainnya");
  });

  it("memetakan kode audit teknis ke label Bahasa Indonesia yang mudah dipahami", () => {
    expect(formatAuditAction("LOGIN_SUCCESS")).toBe("Masuk Sistem Berhasil");
    expect(formatAuditAction("HOME_VISIT_UPDATED")).toBe(
      "Kunjungan Rumah Diperbarui",
    );
    expect(formatAuditAction("EDUCATION_ARTICLE_CREATED")).toBe(
      "Materi Edukasi Dibuat",
    );
    expect(formatAuditAction("ASSIGNMENT_REPLACED")).toBe(
      "Pergantian Bidan Ditugaskan",
    );
  });

  it("memetakan hasil audit ke status berhasil/gagal", () => {
    expect(formatAuditResult("SUCCESS")).toEqual({
      label: "Berhasil",
      isSuccess: true,
    });
    expect(formatAuditResult("FAILED")).toEqual({
      label: "Gagal",
      isSuccess: false,
    });
  });
});

describe("StatusBadge & MetricCard", () => {
  it("merender StatusBadge dengan teks dan indikator dot", () => {
    render(<StatusBadge variant="success">Sistem Siap</StatusBadge>);
    expect(screen.getByText("Sistem Siap")).toBeInTheDocument();
  });

  it("merender MetricCard dengan judul, nilai, dan deskripsi", () => {
    render(
      <MetricCard
        title="Fasilitas Kesehatan"
        value={15}
        description="Puskesmas dan RS aktif"
      />,
    );
    expect(screen.getByText("Fasilitas Kesehatan")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("Puskesmas dan RS aktif")).toBeInTheDocument();
  });
});
