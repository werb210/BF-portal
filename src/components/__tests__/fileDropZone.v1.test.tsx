// BF_PORTAL_DROPZONE_WIRE_v1
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";
import FileDropZone from "../FileDropZone";

function drop(node: Element, files: File[]) {
  fireEvent.drop(node, { dataTransfer: { files, types: ["Files"] } });
}

describe("file drop zone", () => {
  it("passes dropped files to the handler", () => {
    const onFiles = vi.fn();
    render(<FileDropZone onFiles={onFiles}><span>zone</span></FileDropZone>);
    const file = new File(["a,b"], "contacts.csv", { type: "text/csv" });
    drop(screen.getByText("zone").parentElement!, [file]);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });

  it("filters by extension so a dropped PDF is ignored", () => {
    const onFiles = vi.fn();
    render(<FileDropZone accept={[".csv"]} onFiles={onFiles}><span>zone</span></FileDropZone>);
    drop(screen.getByText("zone").parentElement!, [new File(["x"], "deck.pdf")]);
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("does not fire on an empty drop", () => {
    const onFiles = vi.fn();
    render(<FileDropZone onFiles={onFiles}><span>zone</span></FileDropZone>);
    drop(screen.getByText("zone").parentElement!, []);
    expect(onFiles).not.toHaveBeenCalled();
  });

  it("is matched to extension case-insensitively", () => {
    const onFiles = vi.fn();
    render(<FileDropZone accept={[".csv"]} onFiles={onFiles}><span>zone</span></FileDropZone>);
    const file = new File(["a"], "EXPORT.CSV");
    drop(screen.getByText("zone").parentElement!, [file]);
    expect(onFiles).toHaveBeenCalledWith([file]);
  });
});

describe("the drop zone is actually used", () => {
  // v640 shipped this component with no consumers; a component nothing renders
  // is not a feature.
  it("is wired into the contacts import", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../pages/crm/contacts/ImportContactsModal.tsx"), "utf8");
    expect(src).toContain("<FileDropZone");
  });

  it("keeps the button, for discoverability and keyboard use", () => {
    const src = fs.readFileSync(
      path.resolve(__dirname, "../../pages/crm/contacts/ImportContactsModal.tsx"), "utf8");
    expect(src).toContain("Choose CSV file…");
  });
});
