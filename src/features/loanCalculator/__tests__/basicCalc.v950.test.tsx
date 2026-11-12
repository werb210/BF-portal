// BF_PORTAL_v950_BASIC_CALCULATOR
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CALC_START, press } from "../basicCalc";
import CalculatorButton from "../CalculatorButton";

const run = (keys: string[]) => keys.reduce(press, CALC_START).display;

describe("regular calculator", () => {
  it("adds, subtracts, multiplies and divides", () => {
    expect(run(["1", "2", "+", "7", "="])).toBe("19");
    expect(run(["9", "-", "1", "0", "="])).toBe("-1");
    expect(run(["2", "5", "0", "0", "0", "0", "*", ".", "0", "2", "="])).toBe("5000");
    expect(run(["1", "/", "4", "="])).toBe("0.25");
  });
  it("chains operations left to right and has no floating-point dust", () => {
    expect(run(["2", "+", "3", "*", "4", "="])).toBe("20");
    expect(run([".", "1", "+", ".", "2", "="])).toBe("0.3");
  });
  it("percent of the running amount, sign change, delete and clear", () => {
    expect(run(["2", "0", "0", "+", "1", "0", "%", "="])).toBe("220");
    expect(run(["5", "0", "%"])).toBe("0.5");
    expect(run(["8", "+/-"])).toBe("-8");
    expect(run(["1", "2", "3", "back"])).toBe("12");
    expect(run(["9", "9", "C"])).toBe("0");
  });
  it("dividing by zero shows Error and the next digit starts again", () => {
    expect(run(["5", "/", "0", "="])).toBe("Error");
    expect(run(["5", "/", "0", "=", "7"])).toBe("7");
  });
  it("the Calculator dialog offers both, and switching back keeps the loan figures", () => {
    render(<CalculatorButton requestedAmount={250000} title="Acme" />);
    fireEvent.click(screen.getByTestId("open-calculator"));
    expect(screen.queryByTestId("basic-calculator")).toBeNull();
    fireEvent.click(screen.getByTestId("calculator-mode-basic"));
    fireEvent.click(screen.getByTestId("calc-key-6"));
    fireEvent.click(screen.getByTestId("calc-key-*"));
    fireEvent.click(screen.getByTestId("calc-key-7"));
    fireEvent.click(screen.getByTestId("calc-key-="));
    expect(screen.getByTestId("basic-calc-display").textContent).toBe("42");
    fireEvent.click(screen.getByTestId("calculator-mode-loan"));
    expect(screen.queryByTestId("basic-calculator")).toBeNull();
    expect(screen.getByDisplayValue("250000")).toBeTruthy();
  });
});
