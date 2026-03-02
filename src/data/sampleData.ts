export interface ProcessStep {
  id: string;
  name: string;
  actor: string;
  description: string;
}

export interface UserStory {
  id: string;
  processStepId: string;
  processStepName: string;
  title: string;
  actor: string;
  action: string;
  benefit: string;
  fullStory: string;
  acceptanceCriteria: string[];
  primarySystem: string;
  secondarySystem: string;
  priority: "High" | "Medium" | "Low";
  status: "Draft" | "In Review" | "Approved" | "Needs Revision";
}

export const SAMPLE_PROCESS_STEPS: ProcessStep[] = [
  {
    id: "1.1",
    name: "Lead Capture & Entry",
    actor: "Inside Sales Rep",
    description:
      "Sales rep or automated system captures inbound lead information from web forms, events, referrals, and direct outreach.",
  },
  {
    id: "1.2",
    name: "Lead Deduplication Check",
    actor: "System / Sales Ops",
    description:
      "System automatically checks for existing Lead, Contact, or Account records to prevent duplicates from being created.",
  },
  {
    id: "1.3",
    name: "Lead Assignment & Routing",
    actor: "System / Sales Ops Admin",
    description:
      "Lead is routed to the appropriate sales rep or queue based on territory, product interest, company size, or segment rules.",
  },
  {
    id: "1.4",
    name: "Lead Qualification (BANT)",
    actor: "Inside Sales Rep",
    description:
      "Sales rep evaluates the lead against qualification criteria (Budget, Authority, Need, Timeline) to determine sales readiness.",
  },
  {
    id: "1.5",
    name: "Lead Nurturing",
    actor: "Marketing / Inside Sales",
    description:
      "Unqualified leads are enrolled in automated nurture programs; marketing tracks engagement and re-qualifies over time.",
  },
  {
    id: "1.6",
    name: "Lead Conversion",
    actor: "Inside Sales Rep",
    description:
      "Qualified lead is converted to Account, Contact, and Opportunity records within Salesforce in a single workflow.",
  },
  {
    id: "2.1",
    name: "Opportunity Creation",
    actor: "Account Executive",
    description:
      "Opportunity record is created with key fields: stage, amount, close date, product line, and primary contact.",
  },
  {
    id: "2.2",
    name: "Discovery & Qualification",
    actor: "Account Executive",
    description:
      "AE documents discovery findings, maps stakeholders, validates budget and timeline, and updates opportunity details.",
  },
  {
    id: "2.3",
    name: "Quote Generation",
    actor: "Account Executive",
    description:
      "AE generates a formal, branded quote from the Opportunity using CPQ product catalog and approved pricing.",
  },
  {
    id: "2.4",
    name: "Discount Approval Workflow",
    actor: "Account Executive / Sales Manager",
    description:
      "Discounts exceeding authorization thresholds trigger multi-level approval routing to sales managers or finance.",
  },
];

export const SAMPLE_USER_STORIES: UserStory[] = [
  {
    id: "US-001",
    processStepId: "1.1",
    processStepName: "1.1 - Lead Capture & Entry",
    title: "Capture Web-to-Lead Form Submissions Automatically",
    actor: "Inside Sales Representative",
    action:
      "automatically receive inbound web form submissions as Lead records in Salesforce with all relevant fields pre-populated",
    benefit:
      "I can prioritize and respond to new prospects quickly without manual data re-entry",
    fullStory:
      "As an Inside Sales Representative, I want to automatically receive inbound web form submissions as Lead records in Salesforce with all relevant fields pre-populated, so that I can prioritize and respond to new prospects quickly without manual data re-entry.",
    acceptanceCriteria: [
      "Web-to-Lead form submissions create a Lead record with all mapped fields populated (name, company, email, phone, lead source, product interest)",
      "Lead Source is automatically set to 'Web – Inbound' upon creation",
      "Lead is assigned to the correct queue or rep via assignment rules within 2 minutes of submission",
      "System runs duplicate detection on Lead creation and surfaces any matching records for rep review",
      "Auto-response confirmation email is sent to the prospect within 5 minutes of submission",
      "New Lead appears in the rep's 'My Open Leads' list view immediately upon assignment",
    ],
    primarySystem: "Salesforce Sales Cloud",
    secondarySystem: "External Website / Marketing Cloud",
    priority: "High",
    status: "Draft",
  },
  {
    id: "US-002",
    processStepId: "1.2",
    processStepName: "1.2 - Lead Deduplication Check",
    title: "Flag and Prevent Duplicate Lead Record Creation",
    actor: "Sales Operations Administrator",
    action:
      "configure duplicate rules that automatically detect and flag matching Lead, Contact, or Account records upon Lead creation or edit",
    benefit:
      "data integrity is maintained across the CRM and reps avoid working conflicting or redundant records",
    fullStory:
      "As a Sales Operations Administrator, I want to configure duplicate rules that automatically detect and flag matching Lead, Contact, or Account records upon Lead creation or edit, so that data integrity is maintained across the CRM and reps avoid working conflicting or redundant records.",
    acceptanceCriteria: [
      "Duplicate rules check for matching records based on email address, phone number, and company name (fuzzy matching supported)",
      "When a duplicate is detected, a warning banner appears with a direct link to the potentially matching record",
      "Rep can choose to merge, associate to existing record, or override the warning with a documented reason",
      "All duplicate override actions are logged with user, timestamp, and reason for audit purposes",
      "Admin can configure and modify matching rules via the UI without code changes or deployment",
      "Bulk deduplication report is available in Reports for Sales Ops to action on existing data",
    ],
    primarySystem: "Salesforce Sales Cloud",
    secondarySystem: "Data Enrichment Tool (e.g., ZoomInfo, D&B)",
    priority: "High",
    status: "Draft",
  },
  {
    id: "US-003",
    processStepId: "1.3",
    processStepName: "1.3 - Lead Assignment & Routing",
    title: "Auto-Route Leads to Reps via Configurable Assignment Rules",
    actor: "Inside Sales Representative",
    action:
      "have Leads automatically assigned to my queue or record based on territory, product line, or lead source criteria",
    benefit:
      "I receive only the leads relevant to my coverage without requiring manual Sales Ops intervention",
    fullStory:
      "As an Inside Sales Representative, I want to have Leads automatically assigned to my queue or record based on territory, product line, or lead source criteria, so that I receive only the leads relevant to my coverage without requiring manual Sales Ops intervention.",
    acceptanceCriteria: [
      "Lead assignment rules route Leads based on configurable criteria including geography, product interest, company size, and lead source",
      "Leads that do not match any routing rule are placed in an 'Unassigned – Review' queue visible to Sales Ops",
      "Assigned rep receives both an in-app notification and email upon Lead assignment",
      "Round-robin assignment is supported within queues to ensure even workload distribution",
      "Sales Ops admin can update routing rules without a code deployment",
      "Lead list view displays 'Lead Age' (time since creation) to prompt timely follow-up",
    ],
    primarySystem: "Salesforce Sales Cloud",
    secondarySystem: "N/A",
    priority: "High",
    status: "Draft",
  },
  {
    id: "US-004",
    processStepId: "1.4",
    processStepName: "1.4 - Lead Qualification (BANT)",
    title: "Capture BANT Qualification Data on Lead Record",
    actor: "Inside Sales Representative",
    action:
      "capture and update BANT qualification fields (Budget, Authority, Need, Timeline) directly on the Lead record",
    benefit:
      "I can objectively assess lead quality, prioritize my pipeline, and make consistent conversion decisions",
    fullStory:
      "As an Inside Sales Representative, I want to capture and update BANT qualification fields (Budget, Authority, Need, Timeline) directly on the Lead record, so that I can objectively assess lead quality, prioritize my pipeline, and make consistent conversion decisions.",
    acceptanceCriteria: [
      "Lead page layout includes dedicated BANT fields: Estimated Budget Range, Is Decision Maker (Y/N), Identified Need / Pain Point (text), and Target Purchase Timeline (picklist)",
      "Lead Rating field auto-calculates or updates based on BANT field completion (e.g., fully qualified = Hot)",
      "Leads with all BANT fields completed are flagged with a visual indicator on the Lead list view",
      "Sales manager has access to a dashboard showing leads by rating and BANT completeness across the team",
      "BANT field data maps to corresponding Opportunity fields upon Lead conversion to prevent re-entry",
      "Required fields are enforced on the 'Mark as Sales Qualified' status transition via validation rules",
    ],
    primarySystem: "Salesforce Sales Cloud",
    secondarySystem: "N/A",
    priority: "High",
    status: "Draft",
  },
  {
    id: "US-005",
    processStepId: "1.6",
    processStepName: "1.6 - Lead Conversion",
    title: "Convert Qualified Lead to Account, Contact & Opportunity",
    actor: "Inside Sales Representative",
    action:
      "convert a qualified Lead into Account, Contact, and Opportunity records in a single guided workflow",
    benefit:
      "I eliminate manual re-entry of data and ensure full lead context is preserved on the resulting records",
    fullStory:
      "As an Inside Sales Representative, I want to convert a qualified Lead into Account, Contact, and Opportunity records in a single guided workflow, so that I eliminate manual re-entry of data and ensure full lead context is preserved on the resulting records.",
    acceptanceCriteria: [
      "Lead Conversion screen allows rep to create new Account/Contact/Opportunity or match and merge to existing Salesforce records",
      "All custom Lead fields are mapped to corresponding Account, Contact, and Opportunity fields automatically upon conversion",
      "Converted Lead record is locked from editing, marked as 'Converted,' and displays links to the resulting records",
      "Opportunity created from conversion auto-populates Stage (e.g., Needs Analysis), Close Date (default +90 days), and Lead Source",
      "Activity history (calls, emails, tasks, notes) from the Lead transfers to and is visible on the Opportunity record",
      "Sales manager receives an in-app notification when a Lead within their territory is converted",
    ],
    primarySystem: "Salesforce Sales Cloud",
    secondarySystem: "N/A",
    priority: "High",
    status: "Draft",
  },
  {
    id: "US-006",
    processStepId: "2.3",
    processStepName: "2.3 - Quote Generation",
    title: "Generate Branded Quote PDF Directly from Opportunity",
    actor: "Account Executive",
    action:
      "generate a formatted, branded quote PDF from the Opportunity record using live product catalog and approved pricing",
    benefit:
      "I can deliver professional proposals to prospects in minutes without switching to external tools or manually formatting documents",
    fullStory:
      "As an Account Executive, I want to generate a formatted, branded quote PDF from the Opportunity record using live product catalog and approved pricing, so that I can deliver professional proposals to prospects in minutes without switching to external tools or manually formatting documents.",
    acceptanceCriteria: [
      "Quoting tool is accessible directly from the Opportunity record via a clearly labeled 'Generate Quote' button",
      "Product catalog with standard list pricing is available for selection within the quoting workflow",
      "Rep can apply line-item discounts up to their authorized threshold; discounts above threshold trigger approval workflow",
      "Generated quote PDF reflects current brand standards, includes all required legal disclaimers, and is version-stamped",
      "All quote versions are saved to the Opportunity record; previous versions are accessible but clearly marked as superseded",
      "Quote can be sent to prospect contacts via email directly from Salesforce with open/click tracking enabled",
    ],
    primarySystem: "Salesforce CPQ / Revenue Cloud",
    secondarySystem: "Salesforce Sales Cloud",
    priority: "High",
    status: "Draft",
  },
  {
    id: "US-007",
    processStepId: "2.4",
    processStepName: "2.4 - Discount Approval Workflow",
    title: "Route Above-Threshold Discounts for Multi-Level Approval",
    actor: "Account Executive",
    action:
      "submit Opportunities with discounts exceeding my authorization threshold for multi-level approval routing within Salesforce",
    benefit:
      "I can maintain deal momentum without leaving the CRM to chase approvals through email or Slack",
    fullStory:
      "As an Account Executive, I want to submit Opportunities with discounts exceeding my authorization threshold for multi-level approval routing within Salesforce, so that I can maintain deal momentum without leaving the CRM to chase approvals through email or Slack.",
    acceptanceCriteria: [
      "Approval process triggers automatically when total discount percentage exceeds the rep's configured authorization threshold",
      "Approver receives an in-app notification, email notification, and (if configured) Chatter/Slack message with context",
      "Approver can approve or reject the request with mandatory comments from within Salesforce (desktop or mobile)",
      "Full approval history is logged on the Opportunity including approver name, decision, timestamp, and comments",
      "SLA tracking alerts the approver after 24 hours of inactivity and escalates to their manager after 48 hours",
      "Rejected submissions return the Opportunity to Editable status with the rejection reason prominently displayed for the rep",
    ],
    primarySystem: "Salesforce Sales Cloud",
    secondarySystem: "Salesforce CPQ / Revenue Cloud",
    priority: "High",
    status: "Draft",
  },
];

export const SYSTEM_OPTIONS = [
  "Salesforce Sales Cloud",
  "Salesforce CPQ / Revenue Cloud",
  "Salesforce Service Cloud",
  "Salesforce Marketing Cloud",
  "Salesforce Experience Cloud",
  "Salesforce Field Service",
  "SAP / ERP System",
  "External Website",
  "Marketing Automation Platform",
  "Data Enrichment Tool",
  "Email Platform",
  "N/A",
  "Other",
];

export const STATUS_OPTIONS: UserStory["status"][] = [
  "Draft",
  "In Review",
  "Approved",
  "Needs Revision",
];
