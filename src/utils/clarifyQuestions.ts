// ─── Rule-based clarifying questions ─────────────────────────────────────────
// Parses extracted process flow text and generates context-specific
// multiple-choice questions. No API call needed — purely keyword/pattern based.

export interface ClarifyOption {
  label: string;
  description: string;
  value: string;
}

export interface ClarifyQuestion {
  id: string;
  title: string;
  description: string;
  options: ClarifyOption[];
  multiSelect?: boolean;
}

export interface ClarifyAnswers {
  [questionId: string]: string | string[];
}

// ─── Detection helpers ───────────────────────────────────────────────────────

const SYSTEM_KEYWORDS: Record<string, string[]> = {
  SAP: ["sap", "s/4hana", "s4hana"],
  ERP: ["erp", "enterprise resource"],
  Veeva: ["veeva", "veeva crm", "veeva vault"],
  "Oracle": ["oracle", "oracle crm"],
  "Microsoft Dynamics": ["dynamics 365", "dynamics crm", "d365"],
  "NetSuite": ["netsuite"],
  "ServiceNow": ["servicenow", "snow"],
  "Marketo": ["marketo"],
  "HubSpot": ["hubspot"],
  "SharePoint": ["sharepoint"],
  "Power BI": ["power bi", "powerbi"],
  "Tableau": ["tableau"],
  "JIRA": ["jira"],
  "DocuSign": ["docusign"],
  "CPQ": ["cpq", "configure price quote"],
  "EDI": ["edi", "electronic data interchange"],
};

const PERSONA_KEYWORDS: Record<string, string[]> = {
  "Sales Representative": ["sales rep", "sales representative", "field rep", "account executive", "ae"],
  "Sales Manager": ["sales manager", "regional manager", "area manager", "district manager"],
  "Marketing": ["marketing", "campaign manager", "marketing manager"],
  "Customer Service": ["customer service", "service agent", "support rep", "case manager"],
  "Operations": ["operations", "ops manager", "supply chain"],
  "Finance": ["finance", "billing", "accounts receivable", "ar"],
  "CRM Administrator": ["crm admin", "system admin", "administrator", "admin"],
  "Veterinarian": ["veterinarian", "vet", "dvm", "veterinary"],
  "Distributor": ["distributor", "distribution partner", "channel partner"],
  "Key Account Manager": ["key account", "kam", "strategic account"],
};

function detectKeywords(text: string, keywordMap: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [name, keywords] of Object.entries(keywordMap)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      found.push(name);
    }
  }
  return found;
}

function hasDecisionLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = ["decision", "approve", "reject", "yes/no", "if ", "branch", "condition", "criteria met", "threshold"];
  return patterns.some((p) => lower.includes(p));
}

function hasNotificationLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = ["notify", "notification", "email", "alert", "send message", "in-app", "reminder", "escalat"];
  return patterns.some((p) => lower.includes(p));
}

function hasIntegrationLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = ["integration", "interface", "api", "sync", "data transfer", "inbound", "outbound", "middleware", "batch", "real-time", "real time"];
  return patterns.some((p) => lower.includes(p));
}

function hasApprovalLanguage(text: string): boolean {
  const lower = text.toLowerCase();
  const patterns = ["approval", "approve", "approver", "sign-off", "signoff", "authorize", "authorisation", "authorization"];
  return patterns.some((p) => lower.includes(p));
}

function estimateProcessComplexity(text: string): "simple" | "moderate" | "complex" {
  const lines = text.split("\n").filter((l) => l.trim().length > 0).length;
  const systems = detectKeywords(text, SYSTEM_KEYWORDS).length;
  if (lines > 80 || systems > 3) return "complex";
  if (lines > 30 || systems > 1) return "moderate";
  return "simple";
}

// ─── Question generators ─────────────────────────────────────────────────────

export function generateClarifyQuestions(extractedText: string): ClarifyQuestion[] {
  const questions: ClarifyQuestion[] = [];
  const detectedSystems = detectKeywords(extractedText, SYSTEM_KEYWORDS);
  const detectedPersonas = detectKeywords(extractedText, PERSONA_KEYWORDS);
  // Complexity detection reserved for future use
  void estimateProcessComplexity(extractedText);
  const hasDecisions = hasDecisionLanguage(extractedText);
  const hasNotifications = hasNotificationLanguage(extractedText);
  const hasIntegrations = hasIntegrationLanguage(extractedText);
  const hasApprovals = hasApprovalLanguage(extractedText);

  // 1. Implementation approach
  questions.push({
    id: "implementation_approach",
    title: "Implementation Approach",
    description: "Is this a new build or replacing an existing system?",
    options: [
      { label: "Greenfield", description: "New implementation — no existing system to migrate from", value: "greenfield" },
      { label: "Migration", description: "Replacing an existing CRM or system (e.g., Veeva → Salesforce)", value: "migration" },
      { label: "Enhancement", description: "Adding new capabilities to an existing Salesforce org", value: "enhancement" },
    ],
  });

  // 2. Detected personas
  if (detectedPersonas.length > 0) {
    questions.push({
      id: "personas",
      title: "Detected Personas",
      description: `Found ${detectedPersonas.length} persona(s) in the process flow. Select all that apply.`,
      multiSelect: true,
      options: [
        ...detectedPersonas.map((p) => ({
          label: p,
          description: "Detected in process flow",
          value: p,
        })),
        { label: "Other personas exist", description: "AI will infer additional roles from context", value: "_other" },
      ],
    });
  } else {
    questions.push({
      id: "personas",
      title: "Primary Personas",
      description: "No specific personas detected. Who are the main users?",
      multiSelect: true,
      options: [
        { label: "Sales Representatives", description: "Field or inside sales team", value: "Sales Representative" },
        { label: "Sales Managers", description: "Team leads, regional/area managers", value: "Sales Manager" },
        { label: "CRM Administrators", description: "System admins and config owners", value: "CRM Administrator" },
        { label: "Let AI infer", description: "AI will determine personas from the process flow", value: "_infer" },
      ],
    });
  }

  // 3. Integration scope (only if integrations detected or complex)
  if (hasIntegrations || detectedSystems.length > 0) {
    const sysOptions: ClarifyOption[] = detectedSystems.map((s) => ({
      label: s,
      description: "Detected in process flow",
      value: s,
    }));
    questions.push({
      id: "integrations",
      title: "Integration Systems",
      description: `Found references to ${detectedSystems.length} external system(s). Select which need integration stories.`,
      multiSelect: true,
      options: [
        ...sysOptions,
        { label: "All detected systems", description: "Generate integration stories for each", value: "_all" },
        { label: "Skip integration stories", description: "Only generate core CRM stories", value: "_skip" },
      ],
    });
  }

  // 4. Story depth / granularity
  questions.push({
    id: "story_depth",
    title: "Story Depth",
    description: "How granular should the generated stories be?",
    options: [
      { label: "Detailed", description: "One story per distinct action — more stories, finer control", value: "detailed" },
      { label: "Standard", description: "Balanced decomposition — group closely related steps", value: "standard" },
      { label: "High-level", description: "Fewer, broader stories — good for early discovery", value: "high_level" },
    ],
  });

  // 5. Approval workflow (only if approvals detected)
  if (hasApprovals) {
    questions.push({
      id: "approval_detail",
      title: "Approval Workflows",
      description: "Approval steps detected. How should they be handled?",
      options: [
        { label: "Separate stories", description: "Each approval gate gets its own user story", value: "separate" },
        { label: "As acceptance criteria", description: "Include approval steps as AC on the parent story", value: "as_ac" },
        { label: "Both", description: "Separate stories for complex approvals, AC for simple ones", value: "both" },
      ],
    });
  }

  // 6. Notification handling (only if notifications detected)
  if (hasNotifications) {
    questions.push({
      id: "notification_detail",
      title: "Notifications",
      description: "Notification triggers detected. Generate separate notification stories?",
      options: [
        { label: "Yes — separate stories", description: "Each notification type gets its own story with example text", value: "separate" },
        { label: "As acceptance criteria", description: "Include notification details in the triggering story's AC", value: "as_ac" },
      ],
    });
  }

  // 7. Decision branches (only if detected)
  if (hasDecisions) {
    questions.push({
      id: "decision_handling",
      title: "Decision Branches",
      description: "Decision points detected. How should branches be decomposed?",
      options: [
        { label: "Separate stories per path", description: "Each decision outcome gets its own story", value: "separate" },
        { label: "Combined with AC", description: "One story with each branch as acceptance criteria", value: "combined" },
        { label: "AI decides", description: "Let AI apply decomposition rules based on complexity", value: "auto" },
      ],
    });
  }

  // 8. Known business rules
  questions.push({
    id: "business_rules",
    title: "Business Rules",
    description: "Are there specific business rules not shown in the process flow?",
    options: [
      { label: "None — use process flow only", description: "Generate stories strictly from the uploaded document", value: "none" },
      { label: "Standard CRM rules", description: "Include common CRM validation rules (required fields, deduplication, etc.)", value: "standard" },
      { label: "Will provide separately", description: "Placeholder stories for rules to be added later", value: "placeholder" },
    ],
  });

  return questions;
}

// ─── Format answers into prompt context ──────────────────────────────────────

export function formatAnswersForPrompt(answers: ClarifyAnswers): string {
  const lines: string[] = ["USER CLARIFICATIONS (apply these preferences when generating stories):"];

  if (answers.implementation_approach) {
    const val = answers.implementation_approach as string;
    if (val === "greenfield") lines.push("- This is a GREENFIELD implementation — no legacy migration considerations.");
    else if (val === "migration") lines.push("- This is a MIGRATION from an existing system — include data migration and change management considerations where relevant.");
    else if (val === "enhancement") lines.push("- This ENHANCES an existing Salesforce org — reference existing configuration where logical.");
  }

  if (answers.personas) {
    const vals = answers.personas as string[];
    const named = vals.filter((v) => !v.startsWith("_"));
    if (named.length > 0) {
      lines.push(`- Confirmed personas: ${named.join(", ")}. Use these as the primary actors.`);
    }
    if (vals.includes("_other") || vals.includes("_infer")) {
      lines.push("- Additional personas may exist — infer from the process flow context.");
    }
  }

  if (answers.integrations) {
    const vals = answers.integrations as string[];
    if (vals.includes("_skip")) {
      lines.push("- SKIP integration stories — focus only on core CRM functionality.");
    } else if (vals.includes("_all")) {
      lines.push("- Generate integration stories for ALL detected external systems.");
    } else {
      const named = vals.filter((v) => !v.startsWith("_"));
      if (named.length > 0) {
        lines.push(`- Generate integration stories for: ${named.join(", ")}.`);
      }
    }
  }

  if (answers.story_depth) {
    const val = answers.story_depth as string;
    if (val === "detailed") lines.push("- DETAILED decomposition: create one story per distinct user action. Err on the side of more granular stories. However, STILL consolidate decision branches into single stories with complex AC — do not create separate stories for each decision outcome path unless different actors are involved.");
    else if (val === "standard") lines.push("- STANDARD decomposition: group closely related steps into single stories. Consolidate decision branches, approval outcomes, and sequential micro-steps (e.g., click → display → edit → save) into single stories with rich acceptance criteria. Only separate stories when actors change or business rules are genuinely distinct.");
    else if (val === "high_level") lines.push("- HIGH-LEVEL stories: create broader epics-style stories. Aggressively group related steps, decision branches, and sequential workflows into single stories. Use acceptance criteria to capture variant paths and edge cases.");
  }

  if (answers.approval_detail) {
    const val = answers.approval_detail as string;
    if (val === "separate") lines.push("- Each approval gate should be its OWN user story.");
    else if (val === "as_ac") lines.push("- Include approval steps as acceptance criteria on the parent story.");
    else if (val === "both") lines.push("- Complex multi-step approvals get separate stories; simple approvals go into AC.");
  }

  if (answers.notification_detail) {
    const val = answers.notification_detail as string;
    if (val === "separate") lines.push("- Each notification type gets its OWN user story with example notification text (subject, body).");
    else if (val === "as_ac") lines.push("- Include notification details as acceptance criteria on the triggering story.");
  }

  if (answers.decision_handling) {
    const val = answers.decision_handling as string;
    if (val === "separate") lines.push("- Each decision branch outcome gets its OWN user story.");
    else if (val === "combined") lines.push("- Combine decision branches into one story with each outcome as acceptance criteria.");
    else if (val === "auto") lines.push("- Apply decomposition rules to decide how to handle decision branches based on complexity.");
  }

  if (answers.business_rules) {
    const val = answers.business_rules as string;
    if (val === "none") lines.push("- Generate stories STRICTLY from the uploaded process flow. Do not add business rules not in the document.");
    else if (val === "standard") lines.push("- Include standard CRM validation rules (required fields, deduplication, data quality) where logical.");
    else if (val === "placeholder") lines.push("- Where business rules are implied but not specified, add placeholder acceptance criteria marked [BUSINESS RULE TBD — CONFIRM WITH CLIENT].");
  }

  return lines.join("\n");
}
