import { Link } from "react-router-dom";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { MidwifeEnrichedMotherItem, MidwifeMotherFilter } from "@pfram/shared-types";
import { useAuth } from "./auth";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Input,
  LoadingSkeleton,
  PageHeader,
} from "./components";

type Page<T> = { items: T[]; total: number; page: number; pageSize: number };
type Region = {
  publicId: string;
  name: string;
  level: string;
  active: boolean;
  parent?: { name: string } | null;
};
type Facility = {
  publicId: string;
  name: string;
  type: string;
  address: string;
  active: boolean;
  district: { name: string };
};
type Midwife = {
  publicId: string;
  fullName: string;
  professionalRegistrationNumber: string | null;
  primaryFacility: { name: string } | null;
  active: boolean;
  motherCount: number;
};
type Mother = {
  publicId: string;
  fullName: string;
  age: number | null;
  facility: { publicId: string; name: string } | null;
  activePregnancy: {
    publicId: string;
    gestationalAge: { weeks: number; days: number } | null;
    trimester: number | null;
  } | null;
};
type Assignment = {
  publicId: string;
  status: string;
  mother: { fullName: string };
  midwife: { fullName: string };
  facility: { name: string };
  startedAt: string;
};

function useList<T>(path: string) {
  const { request } = useAuth();
  const [data, setData] = useState<Page<T> | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const load = useCallback(() => {
    setError("");
    request<Page<T>>(`${path}?search=${encodeURIComponent(search)}&limit=50`)
      .then(setData)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Gagal memuat data"),
      );
  }, [path, request, search]);
  useEffect(load, [load]);
  return { data, error, search, setSearch, load };
}
function Search({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Input
      label="Pencarian"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Cari data…"
    />
  );
}
function State({
  loading,
  error,
  empty,
}: {
  loading: boolean;
  error: string;
  empty: boolean;
}) {
  if (error) return <ErrorState message={error} />;
  if (loading) return <LoadingSkeleton />;
  if (empty) return <EmptyState />;
  return null;
}

export function RegionsPage() {
  const { request } = useAuth();
  const list = useList<Region>("/admin/regions");
  const [message, setMessage] = useState("");
  const [parentOptions, setParentOptions] = useState<Region[]>([]);
  const [form, setForm] = useState({
    name: "",
    code: "",
    level: "PROVINCE",
    parentPublicId: "",
  });
  useEffect(() => {
    const parentLevel = {
      REGENCY: "PROVINCE",
      DISTRICT: "REGENCY",
      VILLAGE: "DISTRICT",
    }[form.level];
    if (!parentLevel) return setParentOptions([]);
    request<Page<Region>>(
      `/admin/regions?level=${parentLevel}&active=true&limit=100`,
    )
      .then((v) => setParentOptions(v.items))
      .catch(() => setParentOptions([]));
  }, [form.level, request]);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setMessage("");
    try {
      await request("/admin/regions", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          parentPublicId: form.parentPublicId || undefined,
        }),
      });
      setForm({ ...form, name: "", code: "" });
      setMessage("Wilayah berhasil disimpan.");
      list.load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };
  return (
    <>
      <PageHeader
        title="Wilayah"
        description="Kelola hierarki wilayah tanpa penghapusan permanen."
      />
      <Card>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => void submit(e)}
        >
          <Input
            label="Nama wilayah"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <Input
            label="Kode"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <label className="grid gap-1 text-sm font-medium">
            Tingkat
            <select
              className="min-h-11 rounded-xl border p-2"
              value={form.level}
              onChange={(e) =>
                setForm({ ...form, level: e.target.value, parentPublicId: "" })
              }
            >
              {["PROVINCE", "REGENCY", "DISTRICT", "VILLAGE"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {form.level !== "PROVINCE" && (
            <label className="grid gap-1 text-sm font-medium">
              Parent
              <select
                required
                className="min-h-11 rounded-xl border p-2"
                value={form.parentPublicId}
                onChange={(e) =>
                  setForm({ ...form, parentPublicId: e.target.value })
                }
              >
                <option value="">Pilih parent</option>
                {parentOptions.map((v) => (
                  <option value={v.publicId} key={v.publicId}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <Button className="md:col-span-2">Tambah wilayah</Button>
        </form>
        {message && (
          <p role="status" className="mt-3">
            {message}
          </p>
        )}
      </Card>
      <Card>
        <Search value={list.search} onChange={list.setSearch} />
        <State
          loading={!list.data}
          error={list.error}
          empty={list.data?.items.length === 0}
        />
        {list.data?.items.map((v) => (
          <div
            className="flex items-center justify-between border-b py-3"
            key={v.publicId}
          >
            <span>
              <b>{v.name}</b>
              <small className="block text-slate-500">
                {v.level}
                {v.parent ? ` · ${v.parent.name}` : ""}
              </small>
            </span>
            <Button
              className="bg-white text-pfram-primary ring-1 ring-pfram-primary"
              onClick={() =>
                void request(
                  `/admin/regions/${v.publicId}/${v.active ? "deactivate" : "activate"}`,
                  { method: "POST" },
                ).then(list.load)
              }
            >
              {v.active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        ))}
      </Card>
    </>
  );
}

function RegionChain({
  values,
  setValues,
}: {
  values: Record<string, string>;
  setValues: (value: Record<string, string>) => void;
}) {
  const { request } = useAuth();
  const levels = ["province", "regency", "district", "village"] as const;
  const [options, setOptions] = useState<Record<string, Region[]>>({});
  useEffect(() => {
    request<Page<Region>>("/reference/regions?level=PROVINCE&limit=100")
      .then((v) => setOptions((o) => ({ ...o, province: v.items })))
      .catch(() => undefined);
  }, [request]);
  useEffect(() => {
    const load = async (
      key: "regency" | "district" | "village",
      parent: string,
    ) => {
      if (!parent) return setOptions((o) => ({ ...o, [key]: [] }));
      const rows = await request<Region[]>(
        `/reference/regions/${parent}/children`,
      );
      setOptions((o) => ({ ...o, [key]: rows }));
    };
    void load("regency", values.province ?? "");
  }, [request, values.province]);
  useEffect(() => {
    if (values.regency)
      request<Region[]>(`/reference/regions/${values.regency}/children`)
        .then((v) => setOptions((o) => ({ ...o, district: v })))
        .catch(() => undefined);
  }, [request, values.regency]);
  useEffect(() => {
    if (values.district)
      request<Region[]>(`/reference/regions/${values.district}/children`)
        .then((v) => setOptions((o) => ({ ...o, village: v })))
        .catch(() => undefined);
  }, [request, values.district]);
  return (
    <>
      {levels.map((key, index) => (
        <label className="grid gap-1 text-sm font-medium" key={key}>
          {["Provinsi", "Kabupaten/Kota", "Kecamatan", "Kelurahan/Desa"][index]}
          <select
            required={key !== "village"}
            className="min-h-11 rounded-xl border p-2"
            value={values[key] ?? ""}
            onChange={(e) => {
              const next = { ...values, [key]: e.target.value };
              levels.slice(index + 1).forEach((k) => {
                next[k] = "";
              });
              setValues(next);
            }}
          >
            <option value="">Pilih</option>
            {options[key]?.map((v) => (
              <option key={v.publicId} value={v.publicId}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      ))}
    </>
  );
}

export function FacilitiesPage() {
  const { request } = useAuth();
  const list = useList<Facility>("/admin/facilities");
  const [form, setForm] = useState<Record<string, string>>({
    type: "PUSKESMAS",
  });
  const [message, setMessage] = useState("");
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await request("/admin/facilities", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          type: form.type,
          address: form.address,
          provincePublicId: form.province,
          regencyPublicId: form.regency,
          districtPublicId: form.district,
          villagePublicId: form.village || undefined,
          phoneNumber: form.phoneNumber || undefined,
          whatsappNumber: form.whatsappNumber || undefined,
          serviceInformation: form.serviceInformation || undefined,
        }),
      });
      setMessage("Fasilitas berhasil disimpan.");
      list.load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };
  return (
    <>
      <PageHeader
        title="Fasilitas Kesehatan"
        description="Kelola fasilitas aktif dan cakupan wilayahnya."
      />
      <Card>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(e) => void submit(e)}
        >
          <Input
            label="Nama fasilitas"
            required
            value={form.name ?? ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <label className="grid gap-1 text-sm font-medium">
            Jenis
            <select
              className="min-h-11 rounded-xl border p-2"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
            >
              {[
                "PUSKESMAS",
                "HOSPITAL",
                "CLINIC",
                "INDEPENDENT_MIDWIFE",
                "REFERRAL_FACILITY",
                "OTHER",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <Input
            label="Alamat"
            required
            value={form.address ?? ""}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
          <Input
            label="Nomor telepon"
            value={form.phoneNumber ?? ""}
            onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
          />
          <RegionChain values={form} setValues={setForm} />
          <Button className="md:col-span-2">Tambah fasilitas</Button>
        </form>
        {message && (
          <p role="status" className="mt-3">
            {message}
          </p>
        )}
      </Card>
      <Card>
        <Search value={list.search} onChange={list.setSearch} />
        <State
          loading={!list.data}
          error={list.error}
          empty={list.data?.items.length === 0}
        />
        {list.data?.items.map((v) => (
          <div
            className="flex items-center justify-between border-b py-3"
            key={v.publicId}
          >
            <span>
              <b>{v.name}</b>
              <small className="block text-slate-500">
                {v.type} · {v.district.name}
              </small>
            </span>
            <Button
              className="bg-white text-pfram-primary ring-1 ring-pfram-primary"
              onClick={() =>
                void request(
                  `/admin/facilities/${v.publicId}/${v.active ? "deactivate" : "activate"}`,
                  { method: "POST" },
                ).then(list.load)
              }
            >
              {v.active ? "Nonaktifkan" : "Aktifkan"}
            </Button>
          </div>
        ))}
      </Card>
    </>
  );
}

export function MidwivesPage() {
  const list = useList<Midwife>("/admin/midwives");
  return (
    <>
      <PageHeader
        title="Bidan"
        description="Profil, fasilitas, wilayah kerja, dan jumlah ibu binaan."
      />
      <Card>
        <Search value={list.search} onChange={list.setSearch} />
        <State
          loading={!list.data}
          error={list.error}
          empty={list.data?.items.length === 0}
        />
        {list.data?.items.map((v) => (
          <div className="border-b py-3" key={v.publicId}>
            <b>{v.fullName}</b>
            <p className="text-sm text-slate-600">
              {v.professionalRegistrationNumber ??
                "Nomor registrasi belum diisi"}{" "}
              · {v.primaryFacility?.name ?? "Belum ada fasilitas"} ·{" "}
              {v.motherCount} ibu binaan · {v.active ? "Aktif" : "Nonaktif"}
            </p>
          </div>
        ))}
      </Card>
    </>
  );
}
export function MothersPage({ midwife = false }: { midwife?: boolean }) {
  const { request } = useAuth();
  const [filter, setFilter] = useState<MidwifeMotherFilter>("ALL");
  const [search, setSearch] = useState("");
  const [enrichedData, setEnrichedData] = useState<{
    items: MidwifeEnrichedMotherItem[];
    total: number;
  } | null>(null);
  const [adminList, setAdminList] = useState<Page<Mother> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(() => {
    setLoading(true);
    setError("");
    if (midwife) {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      if (filter) q.set("filter", filter);
      q.set("limit", "50");
      request<{ items: MidwifeEnrichedMotherItem[]; total: number }>(
        "/midwife/enriched-mothers?" + q.toString(),
      )
        .then((res) => {
          setEnrichedData(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Gagal memuat data ibu binaan",
          );
          setLoading(false);
        });
    } else {
      const q = new URLSearchParams();
      if (search) q.set("search", search);
      q.set("limit", "50");
      request<Page<Mother>>("/admin/mothers?" + q.toString())
        .then((res) => {
          setAdminList(res);
          setLoading(false);
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : "Gagal memuat data ibu");
          setLoading(false);
        });
    }
  }, [midwife, search, filter, request]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filterTabs: { id: MidwifeMotherFilter; label: string }[] = [
    { id: "ALL", label: "Semua" },
    { id: "TRIMESTER_1", label: "Trimester 1" },
    { id: "TRIMESTER_2", label: "Trimester 2" },
    { id: "TRIMESTER_3", label: "Trimester 3" },
    { id: "HAS_FOLLOW_UP", label: "Ada Tindak Lanjut" },
    { id: "MISSED_ANC", label: "ANC Terlewat" },
  ];

  if (midwife) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Ibu Binaan"
          description="Daftar pemantauan klinis terpadu, jadwal ANC, status P4K, dan tindak lanjut ibu binaan aktif."
        />

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={
                "rounded-full px-3.5 py-1 text-xs font-semibold transition " +
                (filter === tab.id
                  ? "bg-pfram-primary text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Card>
          <Search value={search} onChange={setSearch} />
          <State
            loading={loading}
            error={error}
            empty={enrichedData?.items.length === 0}
          />
          {enrichedData?.items.map((v) => (
            <div
              className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
              key={v.publicId}
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <b className="text-base text-slate-900">{v.fullName}</b>
                  {v.activePregnancy?.gestationalAge && (
                    <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-200">
                      {v.activePregnancy.gestationalAge.weeks} mgg {v.activePregnancy.gestationalAge.days} hr (T{v.activePregnancy.trimester})
                    </span>
                  )}
                  {v.unreadMessagesCount > 0 && (
                    <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                      ✉️ {v.unreadMessagesCount} pesan baru
                    </span>
                  )}
                  {v.hasFollowUp && (
                    <span className="rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-200">
                      ⚠️ Tindak Lanjut
                    </span>
                  )}
                  {v.hasMissedAnc && (
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                      ANC Terlewat
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span>
                    <b>ANC Berikutnya:</b>{" "}
                    {v.nextAnc
                      ? new Date(v.nextAnc.scheduledAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                        }) + " (" + v.nextAnc.visitType + ")"
                      : "Belum terjadwal"}
                  </span>
                  <span>
                    <b>Monitoring Terakhir:</b>{" "}
                    {v.lastMonitoring
                      ? (v.lastMonitoring.systolicBp
                          ? "TD " + v.lastMonitoring.systolicBp + "/" + v.lastMonitoring.diastolicBp + " mmHg"
                          : "") +
                        (v.lastMonitoring.weightKg ? " · BB " + v.lastMonitoring.weightKg + " kg" : "")
                      : "Belum ada"}
                  </span>
                  {v.p4kStatus ? (
                    <span>
                      <b>Status P4K:</b>{" "}
                      <span
                        className={
                          v.p4kStatus.isComplete
                            ? "font-semibold text-emerald-700"
                            : "font-semibold text-amber-700"
                        }
                      >
                        {v.p4kStatus.isComplete
                          ? "Lengkap"
                          : "Belum Lengkap (" + v.p4kStatus.checkedCount + "/" + v.p4kStatus.totalCount + " checklist)"}
                      </span>
                    </span>
                  ) : null}
                </div>

                {(v.followUpReasons?.length ?? 0) > 0 && (
                  <p className="text-[11px] text-rose-600">
                    Alasan: {v.followUpReasons?.join(" · ")}
                  </p>
                )}
              </div>

              <div>
                <Link
                  to={"/my-mothers/" + v.publicId}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-semibold text-pfram-primary shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-pfram-primary/50"
                >
                  Lihat Detail & Pemantauan →
                </Link>
              </div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  // Admin view
  return (
    <>
      <PageHeader
        title="Ibu Hamil"
        description="Daftar ringkas tanpa rincian kesehatan sensitif."
      />
      <Card>
        <Search value={search} onChange={setSearch} />
        <State
          loading={loading}
          error={error}
          empty={adminList?.items.length === 0}
        />
        {adminList?.items.map((v) => (
          <div
            className="flex flex-wrap items-center justify-between border-b py-3"
            key={v.publicId}
          >
            <div>
              <b>{v.fullName}</b>
              <p className="text-sm text-slate-600">
                Usia {v.age ?? "-"} · {v.facility?.name ?? "Belum memilih fasilitas"}
              </p>
            </div>
          </div>
        ))}
      </Card>
    </>
  );
}
export function AssignmentsPage() {
  const { request } = useAuth();
  const list = useList<Assignment>("/admin/assignments");
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"replace" | "complete" | "cancel" | null>(null);
  const [replacementMidwifeId, setReplacementMidwifeId] = useState("");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [midwives, setMidwives] = useState<{ publicId: string; fullName: string }[]>([]);

  useEffect(() => {
    request<Page<{ publicId: string; fullName: string }>>("/admin/midwives?active=true&limit=100")
      .then((res) => setMidwives(res.items))
      .catch(() => setMidwives([]));
  }, [request]);

  const handleAction = async (e: FormEvent) => {
    e.preventDefault();
    if (!actionId || !actionType) return;
    setMessage("");
    try {
      if (actionType === "replace") {
        await request(`/admin/assignments/${actionId}/replace`, {
          method: "POST",
          body: JSON.stringify({ midwifePublicId: replacementMidwifeId, reason }),
        });
        setMessage("Bidan berhasil diganti.");
      } else {
        await request(`/admin/assignments/${actionId}/${actionType}`, {
          method: "POST",
          body: JSON.stringify({ reason: reason || undefined }),
        });
        setMessage(`Penugasan berhasil di-${actionType === "complete" ? "selesaikan" : "batalkan"}.`);
      }
      setActionId(null);
      setActionType(null);
      setReason("");
      setReplacementMidwifeId("");
      list.load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Aksi gagal diproses");
    }
  };

  return (
    <>
      <PageHeader
        title="Penugasan Bidan"
        description="Tetapkan, ganti, dan pantau riwayat pendampingan ibu hamil."
      />
      {message && <div className="rounded-xl bg-slate-100 p-3 text-sm font-medium">{message}</div>}
      <Card>
        <State
          loading={!list.data}
          error={list.error}
          empty={list.data?.items.length === 0}
        />
        {list.data?.items.map((v) => (
          <div className="border-b py-4" key={v.publicId}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <b className="text-base">{v.mother.fullName}</b>
                <p className="text-sm text-slate-600">
                  Bidan: {v.midwife.fullName} · {v.facility.name}
                </p>
                <p className="text-xs text-slate-500">Mulai: {new Date(v.startedAt).toLocaleDateString("id-ID")}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    v.status === "ACTIVE"
                      ? "bg-emerald-100 text-emerald-800"
                      : v.status === "COMPLETED"
                        ? "bg-blue-100 text-blue-800"
                        : v.status === "REPLACED"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-800"
                  }`}
                >
                  {v.status}
                </span>
                {v.status === "ACTIVE" && (
                  <>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                      onClick={() => {
                        setActionId(v.publicId);
                        setActionType("replace");
                        setReason("");
                      }}
                    >
                      Ganti Bidan
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium hover:bg-slate-100"
                      onClick={() => {
                        setActionId(v.publicId);
                        setActionType("complete");
                        setReason("");
                      }}
                    >
                      Selesai
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50"
                      onClick={() => {
                        setActionId(v.publicId);
                        setActionType("cancel");
                        setReason("");
                      }}
                    >
                      Batal
                    </button>
                  </>
                )}
              </div>
            </div>
            {actionId === v.publicId && actionType && (
              <form onSubmit={handleAction} className="mt-3 grid gap-3 rounded-xl bg-slate-50 p-4">
                <div className="font-semibold text-sm">
                  {actionType === "replace"
                    ? "Ganti Bidan Pendamping"
                    : actionType === "complete"
                      ? "Selesaikan Penugasan"
                      : "Batalkan Penugasan"}
                </div>
                {actionType === "replace" && (
                  <label className="grid gap-1 text-sm font-medium">
                    <span>Bidan Pengganti</span>
                    <select
                      className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-slate-900"
                      value={replacementMidwifeId}
                      onChange={(e) => setReplacementMidwifeId(e.target.value)}
                      required
                    >
                      <option value="">-- Pilih Bidan Pengganti --</option>
                      {midwives.map((m) => (
                        <option key={m.publicId} value={m.publicId}>
                          {m.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Input
                  label={actionType === "replace" ? "Alasan Pergantian (wajib)" : "Alasan (opsional)"}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={actionType === "replace" ? "Contoh: Bidan berpindah tugas" : "Catatan penyelesaian"}
                  required={actionType === "replace"}
                />
                <div className="flex gap-2">
                  <Button type="submit" className="min-h-9 text-xs">
                    Simpan
                  </Button>
                  <button
                    type="button"
                    className="rounded-xl border border-slate-300 px-3 py-1 text-xs"
                    onClick={() => {
                      setActionId(null);
                      setActionType(null);
                    }}
                  >
                    Batal
                  </button>
                </div>
              </form>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
export function MidwifeProfilePage() {
  const { request } = useAuth();
  const [data, setData] = useState<{
    fullName: string;
    preferredName: string | null;
    whatsappNumber: string | null;
    primaryFacility: { name: string } | null;
    active: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");

  const load = useCallback(() => {
    request<typeof data>("/midwife/profile")
      .then((res) => {
        setData(res);
        if (res) {
          setPreferredName(res.preferredName ?? "");
          setWhatsappNumber(res.whatsappNumber ?? "");
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat"));
  }, [request]);

  useEffect(load, [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await request("/midwife/profile", {
        method: "PATCH",
        body: JSON.stringify({
          preferredName: preferredName || undefined,
          whatsappNumber: whatsappNumber || undefined,
        }),
      });
      setSuccess("Profil berhasil diperbarui.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    }
  };

  return (
    <>
      <PageHeader
        title="Profil Bidan"
        description="Informasi layanan dan penugasan Anda."
      />
      {error && <ErrorState message={error} />}
      {success && <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 font-medium">{success}</div>}
      {!data ? (
        <LoadingSkeleton />
      ) : (
        <Card>
          <div className="mb-4">
            <h2 className="text-xl font-bold">{data.fullName}</h2>
            <p className="text-sm text-slate-600">Fasilitas Utama: {data.primaryFacility?.name ?? "Belum ada"}</p>
            <p className="text-xs text-slate-500 mt-1">Status: {data.active ? "Aktif" : "Nonaktif"}</p>
          </div>
          <form onSubmit={save} className="grid gap-4 border-t pt-4">
            <Input
              label="Nama Panggilan"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Nama sapaan"
            />
            <Input
              label="Nomor WhatsApp"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
              placeholder="08..."
            />
            <div>
              <Button type="submit">Simpan Perubahan</Button>
            </div>
          </form>
        </Card>
      )}
    </>
  );
}
