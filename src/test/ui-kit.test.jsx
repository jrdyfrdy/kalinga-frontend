import { describe, it, expect, beforeEach } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { Button, Field, Input, StatusBadge, statusTone, ConfirmProvider, useConfirm } from "@/components/ui";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";

describe("Button", () => {
  it("defaults to type=button and disables while loading", () => {
    render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("type", "button");
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });
});

describe("Field", () => {
  it("wires label, hint and error to the control", () => {
    const { rerender } = render(
      <Field label="Email" hint="We never share it." required>
        <Input />
      </Field>,
    );
    const input = screen.getByLabelText(/Email/);
    expect(input).toBeRequired();
    expect(input).toHaveAccessibleDescription("We never share it.");
    expect(input).not.toHaveAttribute("aria-invalid");

    rerender(
      <Field label="Email" hint="We never share it." error="Enter a valid email.">
        <Input />
      </Field>,
    );
    const invalid = screen.getByLabelText(/Email/);
    expect(invalid).toHaveAttribute("aria-invalid", "true");
    expect(invalid).toHaveAccessibleDescription("Enter a valid email.");
  });
});

describe("StatusBadge", () => {
  it("maps domain values to tones regardless of casing/separators", () => {
    expect(statusTone("En Route")).toBe("info");
    expect(statusTone("en-route")).toBe("info");
    expect(statusTone("CRITICAL")).toBe("critical");
    expect(statusTone("resolved")).toBe("success");
    expect(statusTone("something-else")).toBe("neutral");
  });

  it("humanises the label", () => {
    render(<StatusBadge status="under_review" />);
    expect(screen.getByText("Under review")).toBeInTheDocument();
  });
});

describe("useConfirm", () => {
  function Harness({ onResult }) {
    const confirm = useConfirm();
    return <button onClick={async () => onResult(await confirm({ title: "Delete asset?", confirmLabel: "Delete" }))}>open</button>;
  }

  it("resolves true on confirm and false on cancel", async () => {
    const results = [];
    render(
      <ConfirmProvider>
        <Harness onResult={(r) => results.push(r)} />
      </ConfirmProvider>,
    );
    fireEvent.click(screen.getByText("open"));
    expect(await screen.findByRole("alertdialog")).toHaveTextContent("Delete asset?");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Delete" })));
    fireEvent.click(screen.getByText("open"));
    await screen.findByRole("alertdialog");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Cancel" })));
    expect(results).toEqual([true, false]);
  });
});

describe("ThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  function Probe() {
    const { theme, resolvedTheme, setTheme } = useTheme();
    return (
      <>
        <span data-testid="state">{`${theme}/${resolvedTheme}`}</span>
        <button onClick={() => setTheme("dark")}>dark</button>
      </>
    );
  }

  it("applies and persists the chosen theme", () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("state")).toHaveTextContent("system/light");
    fireEvent.click(screen.getByText("dark"));
    expect(screen.getByTestId("state")).toHaveTextContent("dark/dark");
    expect(document.documentElement).toHaveClass("dark");
    expect(localStorage.getItem("theme")).toBe("dark");
  });
});
