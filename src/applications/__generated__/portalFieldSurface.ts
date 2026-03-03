export const PORTAL_FIELD_SURFACE = {
  pipeline_card: [
    {
      key: "id",
      location: "pipeline_card",
      mode: "action",
      source: "application",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "businessName",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "productCategory",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "requestedAmount",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "updatedAt",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "createdAt",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "ocr_completed_at",
      location: "pipeline_card",
      mode: "read-only",
      source: "ocr",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "banking_completed_at",
      location: "pipeline_card",
      mode: "read-only",
      source: "banking",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "documents.required",
      location: "pipeline_card",
      mode: "read-only",
      source: "documents",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "documents.submitted",
      location: "pipeline_card",
      mode: "read-only",
      source: "documents",
      file: "src/core/engines/pipeline/PipelineCard.tsx"
    },
    {
      key: "contactName",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelinePage.tsx"
    },
    {
      key: "submissionMethod",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelinePage.tsx"
    },
    {
      key: "stage",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/core/engines/pipeline/PipelinePage.tsx"
    },
    {
      key: "applicantName",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/slf/SLFPipelineCard.tsx"
    },
    {
      key: "productType",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/slf/SLFPipelineCard.tsx"
    },
    {
      key: "country",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/slf/SLFPipelineCard.tsx"
    },
    {
      key: "receivedDate",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/slf/SLFPipelineCard.tsx"
    },
    {
      key: "assignedStaff",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/slf/SLFPipelineCard.tsx"
    },
    {
      key: "status",
      location: "pipeline_card",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/slf/SLFPipelineCard.tsx"
    }
  ],
  drawer_header: [
    {
      key: "applicant",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/drawer/DrawerHeader.tsx"
    },
    {
      key: "status",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/drawer/DrawerHeader.tsx"
    },
    {
      key: "ocr_completed_at",
      location: "drawer_header",
      mode: "read-only",
      source: "ocr",
      file: "src/pages/applications/drawer/DrawerHeader.tsx"
    },
    {
      key: "banking_completed_at",
      location: "drawer_header",
      mode: "read-only",
      source: "banking",
      file: "src/pages/applications/drawer/DrawerHeader.tsx"
    },
    {
      key: "businessName",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/ApplicationShellPage.tsx"
    },
    {
      key: "business_name",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/ApplicationShellPage.tsx"
    },
    {
      key: "business.name",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/ApplicationShellPage.tsx"
    },
    {
      key: "current_stage",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/ApplicationShellPage.tsx"
    },
    {
      key: "stage",
      location: "drawer_header",
      mode: "read-only",
      source: "application",
      file: "src/pages/applications/ApplicationShellPage.tsx"
    }
  ],
  drawer: {
    application: [
      {
        key: "business",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessDetails",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-business/BusinessDetailsTab.tsx"
      },
      {
        key: "business_details",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessInfo",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/slf/viewer/SLFTabApplication.tsx"
      },
      {
        key: "business_info",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operations",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operationsDetails",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operations_details",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operationsInfo",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operations_info",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "primaryContact",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "primary_contact",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contactInfo",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contact_info",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "applicantInfo",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-applicant/ApplicantDetailsTab.tsx"
      },
      {
        key: "legalName",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "legal_name",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessLegalName",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_legal_name",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessName",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_name",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operatingName",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "operating_name",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessOperatingName",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_operating_name",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "address",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessAddress",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_address",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "location",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessLocation",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "structure",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessStructure",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_structure",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "entityType",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "entity_type",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "industry",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "industryType",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "industry_type",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "websiteUrl",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "website_url",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "website",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "url",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessWebsite",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "startDate",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "start_date",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessStartDate",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_start_date",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "yearsInBusiness",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "years_in_business",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "businessYears",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "business_years",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "productCategory",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "product_category",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "category",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "useOfFunds",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "use_of_funds",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "fundsUse",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "funds_use",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "requestedAmount",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "requested_amount",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "amountRequested",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "amount_requested",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "name",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contactName",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contact_name",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "email",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contactEmail",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contact_email",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "phone",
        location: "drawer_application",
        mode: "action",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contactPhone",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "contact_phone",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "auditTimeline",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "audit_events",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "id",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "actor",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "createdAt",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-application/ApplicationTab.tsx"
      },
      {
        key: "applicantDetails",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-applicant/ApplicantDetailsTab.tsx"
      },
      {
        key: "kyc",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-applicant/ApplicantDetailsTab.tsx"
      },
      {
        key: "owners",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-business/BusinessDetailsTab.tsx"
      },
      {
        key: "financialProfile",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-financial-profile/FinancialProfileTab.tsx"
      },
      {
        key: "fundingRequest",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-financial-profile/FinancialProfileTab.tsx"
      },
      {
        key: "overview",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-overview/OverviewTab.tsx"
      },
      {
        key: "applicant",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-overview/OverviewTab.tsx"
      },
      {
        key: "status",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-overview/OverviewTab.tsx"
      },
      {
        key: "submittedAt",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-overview/OverviewTab.tsx"
      },
      {
        key: "stage",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-overview/OverviewTab.tsx"
      },
      {
        key: "rawPayload",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-overview/OverviewTab.tsx"
      },
      {
        key: "productFit",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-product-fit/ProductFitTab.tsx"
      },
      {
        key: "matchScores",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-product-fit/ProductFitTab.tsx"
      },
      {
        key: "productId",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-product-fit/ProductFitTab.tsx"
      },
      {
        key: "productName",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-product-fit/ProductFitTab.tsx"
      },
      {
        key: "matchPercentage",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-product-fit/ProductFitTab.tsx"
      },
      {
        key: "notes",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-product-fit/ProductFitTab.tsx"
      },
      {
        key: "detail",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-audit/AuditTimelineTab.tsx"
      },
      {
        key: "financialSnapshot",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/slf/viewer/SLFTabApplication.tsx"
      },
      {
        key: "contact",
        location: "drawer_application",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/slf/viewer/SLFTabApplication.tsx"
      }
    ],
    banking: [
      {
        key: "banking_completed_at",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "bankStatementCount",
        location: "drawer_banking",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "bank_statement_count",
        location: "drawer_banking",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "bankStatementsCount",
        location: "drawer_banking",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "bank_statements_count",
        location: "drawer_banking",
        mode: "read-only",
        source: "application",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "monthsDetected",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "monthGroups",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "monthsDetectedSummary",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "monthGroups.year",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "monthGroups.months",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "dateRange",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "bankCount",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "inflows.totalDeposits",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "inflows.averageMonthlyDeposits",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "inflows.topDepositSources",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "topDepositSources.name",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "topDepositSources.percentage",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "outflows.totalWithdrawals",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "outflows.averageMonthlyWithdrawals",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "outflows.topExpenseCategories",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "topExpenseCategories.name",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "topExpenseCategories.percentage",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "cashFlow.netCashFlowMonthlyAverage",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "cashFlow.volatility",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "balances.averageDailyBalance",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "balances.lowestBalance",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "balances.nsfOverdraftCount",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "riskFlags.irregularDeposits",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "riskFlags.revenueConcentration",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "riskFlags.decliningBalances",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      },
      {
        key: "riskFlags.nsfOverdraftEvents",
        location: "drawer_banking",
        mode: "read-only",
        source: "banking",
        file: "src/pages/applications/drawer/tab-banking/BankingTab.tsx"
      }
    ],
    financials: [
      {
        key: "ocr_completed_at",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "balanceSheet",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "incomeStatement",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "cashFlow",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "taxItems",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "contracts",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "invoices",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "required",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "title",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "fields",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "conflicts",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "conflicts.field",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      },
      {
        key: "conflicts.values",
        location: "drawer_financials",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-financial/FinancialTab.tsx"
      }
    ],
    documents: [
      {
        key: "ocr_completed_at",
        location: "drawer_documents",
        mode: "read-only",
        source: "ocr",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "category",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "required",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "requiredBy",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "id",
        location: "drawer_documents",
        mode: "action",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "name",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "uploadedBy",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "uploadedAt",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "status",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/drawer/tab-documents/DocumentsTab.tsx"
      },
      {
        key: "type",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/slf/viewer/SLFTabDocuments.tsx"
      },
      {
        key: "filename",
        location: "drawer_documents",
        mode: "read-only",
        source: "document",
        file: "src/pages/applications/slf/viewer/SLFTabDocuments.tsx"
      },
      {
        key: "downloadUrl",
        location: "drawer_documents",
        mode: "action",
        source: "document",
        file: "src/pages/applications/slf/viewer/SLFTabDocuments.tsx"
      },
      {
        key: "url",
        location: "drawer_documents",
        mode: "action",
        source: "document",
        file: "src/pages/applications/slf/viewer/SLFTabDocuments.tsx"
      }
    ],
    credit_summary: [
      {
        key: "businessOverview",
        location: "drawer_credit_summary",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      },
      {
        key: "industryOverview",
        location: "drawer_credit_summary",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      },
      {
        key: "financialOverview",
        location: "drawer_credit_summary",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      },
      {
        key: "riskAssessment",
        location: "drawer_credit_summary",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      },
      {
        key: "collateralOverview",
        location: "drawer_credit_summary",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      },
      {
        key: "termsSummary",
        location: "drawer_credit_summary",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      },
      {
        key: "pdfUrl",
        location: "drawer_credit_summary",
        mode: "action",
        source: "derived",
        file: "src/pages/applications/drawer/tab-credit-summary/CreditSummaryTab.tsx"
      }
    ],
    notes: [
      {
        key: "id",
        location: "drawer_notes",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-notes/NotesTab.tsx"
      },
      {
        key: "author",
        location: "drawer_notes",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-notes/NotesTab.tsx"
      },
      {
        key: "body",
        location: "drawer_notes",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-notes/NotesTab.tsx"
      },
      {
        key: "createdAt",
        location: "drawer_notes",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-notes/NotesTab.tsx"
      },
      {
        key: "text",
        location: "drawer_notes",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/slf/viewer/SLFTabNotes.tsx"
      }
    ],
    lenders: [
      {
        key: "id",
        location: "drawer_lenders",
        mode: "action",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "lenderName",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "productCategory",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "terms",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "requiredDocsStatus",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "matchPercentage",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "matchPercent",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "matchScore",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "status",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "lenderProductId",
        location: "drawer_lenders",
        mode: "action",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "submissionMethod",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "submission_method",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "submissionConfig.method",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "method",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "externalReference",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "transmissionId",
        location: "drawer_lenders",
        mode: "action",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "external_reference",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "updatedAt",
        location: "drawer_lenders",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/tab-lenders/LendersTab.tsx"
      },
      {
        key: "business.legal_name",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "business.dba_name",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "business.tax_id",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "application.amount",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "application.term",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "application.purpose",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "owner.first_name",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "owner.last_name",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "owner.email",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      },
      {
        key: "owner.phone",
        location: "drawer_lenders",
        mode: "action",
        source: "application",
        file: "src/components/lenders/GoogleSheetMappingEditor.tsx"
      }
    ],
    offers: [
      {
        key: "id",
        location: "drawer_offers",
        mode: "action",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "lenderName",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "status",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "amount",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "rate",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "term",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "fees",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "uploadedAt",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "fileName",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      },
      {
        key: "fileUrl",
        location: "drawer_offers",
        mode: "read-only",
        source: "derived",
        file: "src/pages/applications/drawer/OffersTab.tsx"
      }
    ]
  }
};
