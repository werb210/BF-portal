// CALL_TRANSCRIPT_SEARCH_v1
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import TranscriptSearch, { findMatches } from "../TranscriptSearch";

describe("call transcript search", () => {
  it("finds every case-insensitive match", () => {
    expect(findMatches("Tax credits and TAX incentives", "tax")).toEqual([0, 16]);
    expect(findMatches("anything", "  ")).toEqual([]);
  });

  it("searches only this transcript, highlights matches and steps through them", () => {
    render(<TranscriptSearch summary="Film budget of $500,000" text={"We discussed the budget.\nBudget again."} />);
    fireEvent.change(screen.getByLabelText("Search this transcript"), { target: { value: "budget" } });
    expect(screen.getAllByTestId("transcript-match")).toHaveLength(3);
    expect(screen.getByTestId("transcript-match-count").textContent).toBe("1 of 3");
    fireEvent.click(screen.getByLabelText("Next match"));
    expect(screen.getByTestId("transcript-match-count").textContent).toBe("2 of 3");
    fireEvent.click(screen.getByLabelText("Previous match"));
    fireEvent.click(screen.getByLabelText("Previous match"));
    expect(screen.getByTestId("transcript-match-count").textContent).toBe("3 of 3");
  });

  it("says when nothing matches", () => {
    render(<TranscriptSearch text="hello" />);
    fireEvent.change(screen.getByLabelText("Search this transcript"), { target: { value: "zzz" } });
    expect(screen.getByTestId("transcript-match-count").textContent).toBe("No matches");
  });
});
