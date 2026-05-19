import type { BusinessUnit } from "@/types/businessUnit";

export const BUSINESS_UNIT_CONFIG: Record<
  BusinessUnit,
  {
    allowClientComms: boolean;
    allowLenderSend: boolean;
    showCommissionModule: boolean;
    showSettings: boolean;
    name: string;
    logoUrl: string;
  }
> = {
  BF: {
    allowClientComms: true,
    allowLenderSend: true,
    showCommissionModule: true,
    showSettings: true,
    name: "Boreal Financial",
    logoUrl: "/images/Header.png"
  },
  BI: {
    allowClientComms: true,
    allowLenderSend: true,
    showCommissionModule: true,
    showSettings: false,
    name: "Boreal Insurance",
    logoUrl: "/images/Header.png"
  },
  SLF: {
    allowClientComms: false,
    allowLenderSend: false,
    showCommissionModule: true,
    showSettings: true,
    name: "Site Level Financial",
    logoUrl: "/images/Header.png"
  }
};
