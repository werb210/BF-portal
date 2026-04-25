import {
  createCompany,
  createContact,
  createContactApplication,
  linkContactCompany,
  type Company,
  type Contact
} from "@/api/crm";

export type ReferralPayload = {
  businessName: string;
  contactName: string;
  website?: string;
  email: string;
  phone: string;
  referrerId: string;
  referrerName: string;
  silo: Contact["silo"];
};

export type ReferralResponse = {
  contact: Contact;
  company: Company;
  applicationId: string;
};

export const submitReferral = async (payload: ReferralPayload): Promise<ReferralResponse> => {
  const [firstNameRaw, ...lastNameParts] = payload.contactName.trim().split(/\s+/);
  const firstName = firstNameRaw ?? "";
  const lastName = lastNameParts.join(" ");

  const [contact, company] = await Promise.all([
    createContact({
      first_name: firstName,
      last_name: lastName,
      email: payload.email,
      phone: payload.phone,
      silo: payload.silo,
      owner: "Referrer Intake",
      tags: ["prospect"],
      referrerId: payload.referrerId,
      referrerName: payload.referrerName
    }),
    createCompany({
      name: payload.businessName,
      silo: payload.silo,
      industry: "Unspecified",
      website: payload.website,
      owner: "Referrer Intake",
      tags: ["prospect"],
      referrerId: payload.referrerId,
      referrerName: payload.referrerName
    })
  ]);

  await linkContactCompany(contact.id, company.id);
  const application = await createContactApplication({
    contactId: contact.id,
    stage: "Referred"
  });

  return {
    contact,
    company,
    applicationId: application.id
  };
};
