import { describe, expect, it } from "vitest";
import { visiblePaymentReference } from "@/modules/finances/payment-reference";

describe("visiblePaymentReference", () => {
  it("hides the appointment id a consultation payment carries", () => {
    expect(
      visiblePaymentReference("mwm4wvpyngffvycy5", {
        id: "appointment-invoice-mwm4wvpyngffvycy5",
        appointmentId: "mwm4wvpyngffvycy5",
      })
    ).toBeNull();
  });

  it("hides it when only the invoice id names the appointment", () => {
    expect(
      visiblePaymentReference("mwm4wvpyngffvycy5", {
        id: "appointment-invoice-mwm4wvpyngffvycy5",
        appointmentId: null,
      })
    ).toBeNull();
  });

  it("keeps a reference typed by hand", () => {
    expect(
      visiblePaymentReference(" CHQ 004512 ", {
        id: "appointment-invoice-mwm4wvpyngffvycy5",
        appointmentId: "mwm4wvpyngffvycy5",
      })
    ).toBe("CHQ 004512");
    expect(
      visiblePaymentReference("VIR-2026-11", {
        id: "inv-1",
        appointmentId: null,
      })
    ).toBe("VIR-2026-11");
  });

  it("shows nothing for an empty reference", () => {
    expect(visiblePaymentReference(null, { id: "inv-1" })).toBeNull();
    expect(visiblePaymentReference("   ", { id: "inv-1" })).toBeNull();
  });
});
