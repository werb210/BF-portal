import { createCompany, createContact, createContactApplication, linkContactCompany } from "@/api/crm";
export const submitReferral = async (payload) => {
    const [contact, company] = await Promise.all([
        createContact({
            name: payload.contactName,
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
