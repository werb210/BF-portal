import { useContext } from "react";
import BusinessUnitContext from "@/context/BusinessUnitContext";
import SiloContext from "@/context/SiloContext";
import { DEFAULT_BUSINESS_UNIT, type BusinessUnit } from "@/types/businessUnit";

const TEST_BUSINESS_UNIT_STUB = {
  activeBusinessUnit: DEFAULT_BUSINESS_UNIT,
  businessUnits: [DEFAULT_BUSINESS_UNIT],
  setActiveBusinessUnit: () => undefined
};

const siloToBusinessUnit = (silo: string): BusinessUnit => {
  switch (silo) {
    case "bf":
      return "BF";
    case "bi":
      return "BI";
    case "slf":
      return "SLF";
    default:
      return DEFAULT_BUSINESS_UNIT;
  }
};

const businessUnitToSilo = (businessUnit: BusinessUnit): "bf" | "bi" | "slf" => {
  switch (businessUnit) {
    case "BF":
      return "bf";
    case "BI":
      return "bi";
    case "SLF":
      return "slf";
  }
};

export const useBusinessUnit = () => {
  const context = useContext(BusinessUnitContext);
  if (context) {
    return context;
  }

  const legacySiloContext = useContext(SiloContext);
  if (legacySiloContext) {
    const businessUnit = siloToBusinessUnit(legacySiloContext.silo);
    return {
      activeBusinessUnit: businessUnit,
      businessUnits: [businessUnit],
      setActiveBusinessUnit: (nextBusinessUnit: BusinessUnit) => {
        legacySiloContext.setSilo(businessUnitToSilo(nextBusinessUnit));
      }
    };
  }

  if (process.env.NODE_ENV === "test") {
    return TEST_BUSINESS_UNIT_STUB;
  }

  throw new Error("useBusinessUnit must be used within a BusinessUnitProvider");
};
