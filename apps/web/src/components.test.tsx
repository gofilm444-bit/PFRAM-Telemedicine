import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  ErrorState,
  Input,
  PasswordInput,
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
    expect(navigationForRole("ADMIN").map((item) => item[1])).toContain(
      "Penugasan Bidan",
    );
    expect(navigationForRole("MIDWIFE").map((item) => item[1])).not.toContain(
      "Penugasan Bidan",
    );
    expect(navigationForRole("MIDWIFE").map((item) => item[1])).toContain(
      "Ibu Binaan",
    );
  });
});
