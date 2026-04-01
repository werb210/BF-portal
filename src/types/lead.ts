export interface LeadPayload {
  name: string;
  email: string;
  phone: string;
  businessName?: string;
  productType?: string;
  message?: string;
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;

  industry: string;
  yearsInBusiness: string;
  annualRevenue: string;
  monthlyRevenue: string;
  arBalance: string;
  collateral: string;

  status: string;
  source: string;
}
