import { useCallback, useEffect, useState, type FormEvent } from "react";
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
  const list = useList<Mother>(midwife ? "/midwife/mothers" : "/admin/mothers");
  return (
    <>
      <PageHeader
        title={midwife ? "Ibu Binaan" : "Ibu Hamil"}
        description={
          midwife
            ? "Hanya ibu dengan penugasan aktif kepada Anda."
            : "Daftar ringkas tanpa rincian kesehatan sensitif."
        }
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
              Usia {v.age ?? "-"} ·{" "}
              {v.facility?.name ?? "Belum memilih fasilitas"} ·{" "}
              {v.activePregnancy?.gestationalAge
                ? `${v.activePregnancy.gestationalAge.weeks} minggu ${v.activePregnancy.gestationalAge.days} hari · Trimester ${v.activePregnancy.trimester}`
                : "Profil kehamilan belum lengkap"}
            </p>
          </div>
        ))}
      </Card>
    </>
  );
}
export function AssignmentsPage() {
  const list = useList<Assignment>("/admin/assignments");
  return (
    <>
      <PageHeader
        title="Penugasan Bidan"
        description="Tetapkan dan pertahankan riwayat pendampingan ibu."
      />
      <Card>
        <State
          loading={!list.data}
          error={list.error}
          empty={list.data?.items.length === 0}
        />
        {list.data?.items.map((v) => (
          <div className="border-b py-3" key={v.publicId}>
            <b>{v.mother.fullName}</b>
            <p className="text-sm text-slate-600">
              {v.midwife.fullName} · {v.facility.name} · {v.status}
            </p>
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
  useEffect(() => {
    request<typeof data>("/midwife/profile")
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal memuat"));
  }, [request]);
  return (
    <>
      <PageHeader
        title="Profil Bidan"
        description="Informasi layanan dan penugasan Anda."
      />
      {error && <ErrorState message={error} />}
      {!data ? (
        <LoadingSkeleton />
      ) : (
        <Card>
          <b>{data.fullName}</b>
          <p>Nama panggilan: {data.preferredName ?? "-"}</p>
          <p>WhatsApp: {data.whatsappNumber ?? "-"}</p>
          <p>Fasilitas: {data.primaryFacility?.name ?? "-"}</p>
          <p>Status: {data.active ? "Aktif" : "Nonaktif"}</p>
        </Card>
      )}
    </>
  );
}
