// BF_PORTAL_v870_CRM_DATA_MODEL - Settings > Properties, the record panel (validation), list filters, CSV columns, contrast.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";

const h = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock("@/api", () => ({ api: { get: h.get, post: h.post, put: h.put, patch: h.patch } }));

import PropertiesSettings, { errorBox, okBox, primary } from "../PropertiesSettings";
import CustomFieldsPanel from "../CustomFieldsPanel";
import CustomFieldFilters from "../CustomFieldFilters";
import { checkValue, describeFilter, displayValue, filterParams, rowsWithCustomFields, type CustomField } from "../customFieldsApi";
import { ApiError } from "@/api/http";
import { contrast } from "./contrast";

const field = (over: Partial<CustomField>): CustomField => ({
  id: "f1", object_type: "contact", name: "tier", label: "Tier", field_type: "text", options: [], required: false, group_name: null,
  description: null, sort_order: 10, archived_at: null, ...over,
});
const tier = field({ id: "f1", name: "tier", label: "Tier", field_type: "single_select", options: [{ value: "gold", label: "Gold" }, { value: "silver", label: "Silver" }], group_name: "Broker" });
const licence = field({ id: "f2", name: "licence", label: "Licence", required: true });
const renews = field({ id: "f3", name: "renews", label: "Renews", field_type: "date" });

beforeEach(() => {
  h.get.mockReset(); h.post.mockReset(); h.put.mockReset(); h.patch.mockReset();
  vi.spyOn(window, "confirm").mockReturnValue(true);
});

describe("Settings > Properties", () => {
  it("lists the fields of each record type and creates one with a derived internal name", async () => {
    h.get.mockResolvedValue({ fields: [tier, field({ id: "f9", name: "old", label: "Old field", archived_at: "2026-01-01" })] });
    h.post.mockResolvedValueOnce({ field: field({ id: "f4", name: "broker_licence", label: "Broker licence" }) });
    render(<PropertiesSettings />);
    expect(await screen.findByTestId("cf-row-tier")).toHaveTextContent("Dropdown (pick one) (2)");
    expect(screen.queryByTestId("cf-row-old")).toBeNull(); // archived hidden until asked
    fireEvent.click(screen.getByLabelText("Show archived"));
    expect(screen.getByTestId("cf-row-old")).toHaveTextContent("Archived");
    fireEvent.click(screen.getByTestId("cf-new"));
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Broker licence #" } });
    expect(screen.getByLabelText("Internal name")).toHaveValue("broker_licence");
    fireEvent.click(screen.getByRole("button", { name: "Create field" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/custom-fields/contact", expect.objectContaining({ label: "Broker licence #", name: "broker_licence", field_type: "text" })));
    expect(await screen.findByText('"Broker licence" saved.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Companies" }));
    await waitFor(() => expect(h.get).toHaveBeenLastCalledWith("/api/custom-fields/company", { params: { include_archived: 1 } }));
  });

  it("needs options for a dropdown and shows the server's refusal", async () => {
    h.get.mockResolvedValue({ fields: [] });
    h.post.mockRejectedValueOnce(new Error('A field with the internal name "tier" already exists (it may be archived).'));
    render(<PropertiesSettings />);
    fireEvent.click(await screen.findByTestId("cf-new"));
    fireEvent.change(screen.getByLabelText("Label"), { target: { value: "Tier" } });
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "single_select" } });
    fireEvent.click(screen.getByRole("button", { name: "Create field" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Add at least one option");
    fireEvent.change(screen.getByLabelText("Options (one per line)"), { target: { value: "Gold\nSilver" } });
    fireEvent.click(screen.getByRole("button", { name: "Create field" }));
    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    expect(h.post).toHaveBeenCalledWith("/api/custom-fields/contact", expect.objectContaining({ options: ["Gold", "Silver"] }));
  });

  it("archives (never deletes) and keeps option values when renaming", async () => {
    h.get.mockResolvedValue({ fields: [tier] });
    h.post.mockResolvedValue({ field: { ...tier, archived_at: "2026-11-03" } });
    h.patch.mockResolvedValue({ field: tier });
    render(<PropertiesSettings />);
    const row = await screen.findByTestId("cf-row-tier");
    expect(within(row).queryByRole("button", { name: /delete/i })).toBeNull();
    fireEvent.click(within(row).getByRole("button", { name: "Archive" }));
    await waitFor(() => expect(h.post).toHaveBeenCalledWith("/api/custom-fields/contact/f1/archive"));
    fireEvent.click(within(row).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Options (one per line)"), { target: { value: "Gold+\nSilver\nBronze" } });
    fireEvent.click(screen.getByRole("button", { name: "Save field" }));
    await waitFor(() => expect(h.patch).toHaveBeenCalledWith("/api/custom-fields/contact/f1", expect.objectContaining({
      options: [{ value: "gold", label: "Gold+" }, { value: "silver", label: "Silver" }, "Bronze"],
    })));
  });
});

describe("record panel", () => {
  it("shows values by group, validates while editing and saves", async () => {
    h.get.mockResolvedValueOnce({ fields: [tier, licence, renews, field({ id: "f5", name: "gone", label: "Gone", archived_at: "2026-01-01" })], values: { tier: "gold", gone: "kept" } });
    h.put.mockResolvedValueOnce({ values: { tier: "silver", licence: "AB-1" } });
    render(<CustomFieldsPanel object="contact" recordId="c1" />);
    const panel = await screen.findByTestId("custom-fields-panel");
    expect(panel).toHaveTextContent("Broker");
    expect(panel).toHaveTextContent("Gold");
    expect(panel).toHaveTextContent("Gone (archived)");
    fireEvent.click(within(panel).getByRole("button", { name: "Edit" }));
    expect(screen.queryByLabelText(/Gone/)).toBeNull(); // archived fields are read-only
    fireEvent.change(screen.getByLabelText("Renews"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Licence is required.")).toBeInTheDocument();
    expect(h.put).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Licence *"), { target: { value: "AB-1" } });
    fireEvent.change(screen.getByLabelText("Tier"), { target: { value: "silver" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(h.put).toHaveBeenCalledWith("/api/custom-fields/contact/records/c1", { values: { tier: "silver", licence: "AB-1", renews: null } }));
    expect(await screen.findByText("Silver")).toBeInTheDocument();
  });

  it("shows the server's field errors next to the fields", async () => {
    h.get.mockResolvedValueOnce({ fields: [renews], values: {} });
    h.put.mockRejectedValueOnce(new ApiError({ status: 400, message: "Renews: enter a date as YYYY-MM-DD.", details: { errors: [{ field: "renews", error: "Renews: enter a date as YYYY-MM-DD." }] } }));
    render(<CustomFieldsPanel object="application" recordId="a1" />);
    fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Renews"), { target: { value: "2026-02-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findAllByText("Renews: enter a date as YYYY-MM-DD.")).toHaveLength(2);
    expect(screen.getByLabelText("Renews")).toHaveAttribute("aria-invalid", "true");
  });

  it("renders nothing when the brokerage has no custom fields", async () => {
    h.get.mockResolvedValueOnce({ fields: [], values: {} });
    const { container } = render(<CustomFieldsPanel object="company" recordId="co1" />);
    await waitFor(() => expect(h.get).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe("list filters and exports", () => {
  it("adds a filter that fits the field type and removes it again", () => {
    const onChange = vi.fn();
    const { rerender } = render(<CustomFieldFilters fields={[tier, renews]} value={[]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Filter by field"), { target: { value: "tier" } });
    fireEvent.change(screen.getByLabelText("Value"), { target: { value: "gold" } });
    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
    expect(onChange).toHaveBeenCalledWith([{ name: "tier", value: "gold" }]);
    fireEvent.change(screen.getByLabelText("Filter by field"), { target: { value: "renews" } });
    expect(screen.getByLabelText("From")).toHaveAttribute("type", "date");
    rerender(<CustomFieldFilters fields={[tier, renews]} value={[{ name: "tier", value: "gold" }]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove filter Tier is Gold" }));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("builds the server's cf_ parameters and readable chips", () => {
    expect(filterParams([{ name: "tier", value: "gold" }, { name: "fleet", min: "5", max: "10" }])).toEqual({ cf_tier: "gold", cf_fleet_min: "5", cf_fleet_max: "10" });
    expect(describeFilter(renews, { name: "renews", min: "2026-01-01" })).toBe("Renews from 2026-01-01");
    expect(describeFilter(licence, { name: "licence", value: "AB" })).toBe('Licence contains "AB"');
  });

  it("exports one labelled column per custom field", () => {
    const rows = rowsWithCustomFields([{ id: "c1", name: "Jo", custom_fields: { tier: "gold", licence: "AB-1" } }], [tier, licence]);
    expect(rows).toEqual([{ id: "c1", name: "Jo", Tier: "Gold", Licence: "AB-1" }]);
    expect(displayValue(field({ field_type: "multi_select", options: [{ value: "a", label: "A" }, { value: "b", label: "B" }] }), ["a", "b"])).toBe("A; B");
    expect(displayValue(field({ field_type: "checkbox" }), false)).toBe("No");
    expect(checkValue(field({ label: "Email", field_type: "email" }), "nope")).toBe("Email: enter an email address.");
  });

  it("keeps text readable: status colours meet WCAG AA contrast", () => {
    expect(contrast(String(errorBox.color), String(errorBox.background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(String(okBox.color), String(okBox.background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(String(primary.color), String(primary.background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#1e3a8a", "#e0e7ff")).toBeGreaterThanOrEqual(4.5); // filter chips
    expect(contrast("#b91c1c", "#ffffff")).toBeGreaterThanOrEqual(4.5); // field errors
  });
});
