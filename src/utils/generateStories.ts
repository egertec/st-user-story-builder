import type { UserStory } from "@/data/sampleData";
import { BASE_SYSTEM_PROMPT, SALESFORCE_CLOUDS } from "@/data/cloudContext";
import {
  DEFAULT_GUIDE_TEXT,
  DEFAULT_GUIDE_NAME,
  DEFAULT_EXAMPLES_TEXT,
  DEFAULT_EXAMPLES_NAME,
  DEFAULT_PRACTICES_TEXT,
  DEFAULT_PRACTICES_NAME,
} from "@/data/defaultReferences";

export interface ProcessFlow {
  name: string;
  text: string;
}

export interface GenerateOptions {
  processText: string;
  cloudKey: string;
  apiKey: string;
  clarifyContext?: string;
  onProgress?: (message: string) => void;
}

// Builds the combined prompt to paste into claude.ai
// Supports single flow (processText) or multiple flows (processFlows[])
// When multiple flows are provided, adds cross-flow deduplication instructions
export function buildCopyablePrompt(processText: string, cloudKey: string, clarifyContext?: string, processFlows?: ProcessFlow[]): string {
  const cloud = SALESFORCE_CLOUDS.find((c) => c.key === cloudKey);
  const cloudName = cloud?.name ?? "Salesforce";
  const systemPrompt = buildSystemPrompt(cloudKey, clarifyContext);
  const isMultiFlow = processFlows && processFlows.length > 1;
  const userMessage = isMultiFlow
    ? buildMultiFlowUserMessage(processFlows, cloudName)
    : buildUserMessage(processText, cloudName);
  return `${systemPrompt}\n\n---\n\n${userMessage}`;
}

// Parses raw JSON text pasted back from claude.ai into UserStory[]
export function parseStoriesFromJSON(raw: string): UserStory[] {
  const cleaned = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  let parsed: unknown[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Could not find a valid JSON array in the pasted text. Make sure you copied the full response from Claude.");
    }
  }
  let counter = 1;
  return (parsed as Record<string, unknown>[]).map((raw) => ({
    id: `US-${String(counter++).padStart(3, "0")}`,
    processStepId: String(raw.processStepId ?? ""),
    processStepName: String(raw.processStepName ?? ""),
    title: String(raw.title ?? "Untitled Story"),
    actor: String(raw.actor ?? ""),
    action: String(raw.action ?? ""),
    benefit: String(raw.benefit ?? ""),
    fullStory: String(raw.fullStory ?? ""),
    acceptanceCriteria: Array.isArray(raw.acceptanceCriteria)
      ? (raw.acceptanceCriteria as string[]).map(String)
      : ["Acceptance criteria to be defined"],
    primarySystem: String(raw.primarySystem ?? "Salesforce"),
    secondarySystem: String(raw.secondarySystem ?? "N/A"),
    priority: (["High", "Medium", "Low"].includes(String(raw.priority))
      ? raw.priority : "Medium") as UserStory["priority"],
    status: "Draft" as const,
  }));
}

export function buildSystemPrompt(cloudKey: string, clarifyContext?: string): string {
  const cloud = SALESFORCE_CLOUDS.find((c) => c.key === cloudKey);
  const cloudAddition = cloud?.systemPromptAddition ?? "";

  // Inject reference context from localStorage if available
  const refContext = loadReferenceContext();
  const refSection = refContext ? `\n\n${refContext}` : "";

  // Inject user clarifications if provided
  const clarifySection = clarifyContext ? `\n\n${clarifyContext}` : "";

  return BASE_SYSTEM_PROMPT + "\n\n" + cloudAddition + refSection + clarifySection;
}

function buildUserMessage(processText: string, cloudName: string): string {
  return `Analyze the following process flow document and generate a comprehensive set of Salesforce user stories for a ${cloudName} implementation.

IMPORTANT: You have been provided a User Story Quality Guide and a Process-to-Story Mapping Guide in the system prompt above. Use the Quality Guide for structural standards (personas, AC format, story quality). Use the Mapping Guide's decomposition rules to systematically analyze the process flow below — identify actor changes, system boundary crossings, decision branches, approval gates, notifications, and exception paths. Apply the Pattern Library (Patterns A-G) to each identified step. Do NOT copy the worked examples; apply the decomposition REASONING to this new process flow.

DECISION PATH CONSOLIDATION RULE:
When a process step contains a decision point with multiple outcomes (e.g., duplicate found vs not found, approved vs rejected, valid vs invalid), DO NOT create separate user stories for each outcome path. Instead, create ONE story for the decision workflow milestone and express each outcome as separate acceptance criteria within that story. Only split into separate stories if the alternate paths involve DIFFERENT actors or have DISTINCT business rules requiring independent estimation.

Example — WRONG approach (over-decomposed):
  Story 1: "Review Duplicate Results" / Story 2: "Confirm Duplicate Decision" / Story 3: "Delete Duplicate Account"

Example — CORRECT approach (consolidated):
  Story: "Review and Resolve Duplicate Accounts"
  AC: User can view list of potential duplicates with key details (name, address, owner)
  AC: User can select a duplicate to view its full record
  AC: User can choose to proceed with creating the new account
  AC: User can choose to navigate to an existing duplicate instead
  AC: User can flag the account for Master Data Team review if unsure
  AC: System navigates to the appropriate record based on user's choice

ACTOR / PERSONA RULE (CRITICAL — follow strictly):
The actor in every user story should be a HUMAN persona that reflects who BENEFITS from or INITIATES the action — even for automated steps. The persona should align to the process flow swimlane that the step belongs to. For example, if a step is in the "Sales Representative" swimlane and the system automatically assigns a territory, the actor is still "Sales Representative" because they are the beneficiary: "As a Sales Representative, I want the system to automatically assign territory based on account attributes, so that I can begin outreach without manual territory lookup."

"System" as an actor is an EDGE CASE reserved ONLY for stories where:
- There is genuinely NO human persona who benefits (e.g., a nightly batch job with no user-facing outcome)
- The step is purely infrastructure/technical with no business user context
- No swimlane or persona can be reasonably inferred

In ALL other cases — including automated triggers, system notifications, auto-assignments, validation rules, and integration syncs — frame the story from the perspective of the human user who benefits from the automation. The pattern is: "As a [Persona from swimlane], I want [the system to perform automated action], so that [business benefit to that persona]."

For each distinct process step or subprocess identified, create one or more user stories covering:
1. The primary actor performing or benefiting from the step (use the persona that matches the process swimlane — e.g., "Sales Representative", "CRM Administrator", "Marketing Manager")
2. Any secondary actors or approvers involved
3. Visibility/reporting needs for managers or supervisors
4. Exception handling or error conditions where clearly implied
5. System integration touchpoints where the process involves multiple systems

Process Flow Document:
---
${processText.slice(0, 80000)}
---

Return ONLY a valid JSON array of user story objects as specified. No other text.`;
}

function buildMultiFlowUserMessage(flows: ProcessFlow[], cloudName: string): string {
  // Build the flow sections
  const flowSections = flows.map((flow, i) => {
    return `PROCESS FLOW ${i + 1}: ${flow.name}
---
${flow.text.slice(0, Math.floor(160000 / flows.length))}
---`;
  }).join("\n\n");

  return `Analyze the following ${flows.length} process flow documents and generate a UNIFIED, DEDUPLICATED set of Salesforce user stories for a ${cloudName} implementation.

IMPORTANT: You have been provided a User Story Quality Guide and a Process-to-Story Mapping Guide in the system prompt above. Use the Quality Guide for structural standards (personas, AC format, story quality). Use the Mapping Guide's decomposition rules to systematically analyze each process flow — identify actor changes, system boundary crossings, decision branches, approval gates, notifications, and exception paths.

CRITICAL — CROSS-FLOW DEDUPLICATION RULES:
You are receiving MULTIPLE process flows that are variants or related processes within the same system. Many steps will be identical or near-identical across flows (e.g., duplicate detection, MDT approval, account status setting, notification workflows). You MUST deduplicate:

1. IDENTIFY SHARED STEPS: Before generating stories, scan all flows and identify process steps that appear in multiple flows (same actor, same action, same business logic). Common shared steps include: duplicate detection/handling, approval workflows, status transitions, notification triggers, data enrichment, and record validation.

2. CREATE SHARED STORIES ONCE: For steps that are identical or near-identical across flows, create the story ONLY ONCE. Tag it with a "processStepName" that indicates it is shared, e.g., "SHARED — Duplicate Detection and Resolution" or "SHARED — MDT Account Approval".

3. VARIANT-SPECIFIC STORIES ONLY FOR DIFFERENCES: Only create separate per-flow stories when the logic, actor, fields, or business rules genuinely differ between flows. If Flow A requires field X but Flow B doesn't, that's a variant-specific story. If both flows do the same duplicate check, that's shared.

4. TAG EACH STORY WITH APPLICABLE FLOWS: In the "processStepName" field, prefix shared stories with "SHARED — " and variant-specific stories with the flow identifier (e.g., "2.4A — Manual Field Entry" or "2.4B — List Import Mapping").

5. REFERENCE CROSS-FLOW STEPS: If a step in Flow B says "follow same process as Flow A step X", do NOT create a duplicate story. Instead, note in the shared story's AC that it applies to both flows.

DECISION PATH CONSOLIDATION RULE:
When a process step contains a decision point with multiple outcomes (e.g., duplicate found vs not found, approved vs rejected), DO NOT create separate stories for each path. Create ONE story for the decision milestone with each outcome as acceptance criteria. Only split if alternate paths involve DIFFERENT actors or DISTINCT business rules.

ACTOR / PERSONA RULE (CRITICAL — follow strictly):
The actor in every user story should be a HUMAN persona that reflects who BENEFITS from or INITIATES the action — even for automated steps. The persona should align to the process flow swimlane that the step belongs to. "System" as an actor is an EDGE CASE reserved ONLY for stories where there is genuinely NO human persona who benefits (e.g., nightly batch jobs with no user-facing outcome). For automated triggers, notifications, auto-assignments, and integration syncs, frame the story from the perspective of the human user who benefits: "As a [Persona from swimlane], I want [the system to perform automated action], so that [business benefit to that persona]."

For each distinct process step or subprocess, create user stories covering:
1. The primary actor performing or benefiting from the step (use the persona that matches the process swimlane)
2. Secondary actors or approvers
3. Visibility/reporting needs
4. Exception handling
5. System integration touchpoints — for each downstream system, create BOTH an outbound story (notify/sync TO external system) and an inbound story (receive/process response FROM external system)

${flowSections}

Return ONLY a valid JSON array of user story objects as specified. No other text.`;
}

// ─── Reference Context (Guide + Example Stories) ──────────────────────────────

const REFS_KEY = "storyforge_references";

export interface ReferenceContext {
  guideText?: string;
  guideName?: string;
  examplesText?: string;
  examplesName?: string;
  fieldCatalogueText?: string;
  fieldCatalogueName?: string;
  practicesText?: string;
  practicesName?: string;
  savedAt: number;
}

export function saveReferenceContext(ctx: Omit<ReferenceContext, "savedAt">): void {
  const toStore: ReferenceContext = { ...ctx, savedAt: Date.now() };
  try {
    localStorage.setItem(REFS_KEY, JSON.stringify(toStore));
  } catch {
    // localStorage quota exceeded — silently skip
  }
}

export function loadReferenceContext(): string | null {
  try {
    // Try localStorage first (user overrides), fall back to built-in defaults
    let guideText = DEFAULT_GUIDE_TEXT;
    let examplesText = DEFAULT_EXAMPLES_TEXT;
    let practicesText = DEFAULT_PRACTICES_TEXT;
    let fieldCatalogueText = "";

    const raw = localStorage.getItem(REFS_KEY);
    if (raw) {
      const ctx: ReferenceContext = JSON.parse(raw);
      if (ctx.guideText) guideText = ctx.guideText;
      if (ctx.examplesText) examplesText = ctx.examplesText;
      if (ctx.practicesText) practicesText = ctx.practicesText;
      if (ctx.fieldCatalogueText) fieldCatalogueText = ctx.fieldCatalogueText;
    }

    const parts: string[] = [];

    parts.push(`USER STORY QUALITY GUIDE (reference — follow these structural standards strictly):
---
${guideText.slice(0, 8000)}
---`);

    parts.push(`PROCESS-TO-STORY MAPPING GUIDE (reference — apply these decomposition rules and patterns when analyzing the process flow):
---
${examplesText.slice(0, 6000)}
---`);

    if (practicesText) {
      parts.push(`SALESFORCE LEADING PRACTICES (reference — use these as guidance when making design decisions in user stories):
---
${practicesText.slice(0, 6000)}
---`);
    }

    if (fieldCatalogueText) {
      parts.push(`FIELD CATALOGUE / DATA DICTIONARY (reference — use these field names and object mappings when writing acceptance criteria):
---
${fieldCatalogueText.slice(0, 8000)}
---`);
    }

    parts.push(`REFERENCE USAGE INSTRUCTIONS:
- The Quality Guide defines structural standards: persona conventions, acceptance criteria format, and what makes a good vs. bad story. Follow it.
- The Mapping Guide teaches HOW to decompose process flows into stories. Apply its 10 decomposition rules systematically:
  Rule 1: Actor change = new story. Rule 2: System boundary crossing = integration story. Rule 3: Decision branch = separate stories or AC depending on user impact. Rule 4: Notification = visibility story with example text. Rule 5: Approval gate = separate story. Rule 6: Error/exception path = separate story or rich AC. Rule 7: Multiple verbs = evaluate splitting. Rule 8: Configurable rules = admin companion story. Rule 9: Unknown fields = use placeholder [FIELD NAMES TBD — CONFIRM WITH CLIENT]. Rule 10: User-provided key overrides default assumptions.
- The Mapping Guide also contains worked examples showing process flow excerpts and the reasoning behind each story. Use the REASONING APPROACH (not the specific stories) when analyzing new process flows.
- The Pattern Library (Patterns A-G) provides templates for common scenarios: CRUD operations, outbound/inbound integrations, approvals, notifications, status transitions, and cascades. Match each process step to the relevant pattern(s).
- The Leading Practices document provides Salesforce-specific best practices by capability area. When writing acceptance criteria or recommending an approach, reference these practices to ensure stories align with proven implementation patterns. CRITICAL: If the process flow references a capability NOT covered in the Leading Practices document, apply your knowledge of that capability's best practices and mark the relevant AC with [PRACTICE SOURCE: AI-INFERRED — VALIDATE WITH SOLUTION ARCHITECT].
- FIELD NAMING: If a Field Catalogue has been provided, use the exact object and field names from that catalogue when writing acceptance criteria. If NO Field Catalogue is provided, default to standard out-of-the-box Salesforce field names (e.g., Account.Name, Opportunity.Amount, Lead.Status). Only reference custom fields when the process flow explicitly names a field that does not exist in OOB Salesforce.
- Every generated story MUST use functional group personas (e.g., "Sales Representative", "CRM Administrator") — never job titles.
- Acceptance criteria should be specific, testable, and cover the happy path plus key edge cases. Do not limit to a fixed number, but a single criterion is never sufficient.
- Prioritize out-of-the-box Salesforce functionality. Only reference custom development when OOB clearly cannot support the requirement.`);

    return parts.join("\n\n");
  } catch {
    return null;
  }
}

export function getReferenceContextMeta(): ReferenceContext | null {
  try {
    const raw = localStorage.getItem(REFS_KEY);
    if (raw) return JSON.parse(raw);
    // Return defaults so the UI shows pre-loaded state
    return {
      guideName: DEFAULT_GUIDE_NAME,
      examplesName: DEFAULT_EXAMPLES_NAME,
      practicesName: DEFAULT_PRACTICES_NAME,
      savedAt: 0, // 0 signals "built-in defaults"
    };
  } catch {
    return null;
  }
}

export function clearReferenceContext(): void {
  localStorage.removeItem(REFS_KEY);
}

// ─── API-based generation (unchanged except story points removed) ─────────────

export async function generateStoriesFromText(
  options: GenerateOptions
): Promise<UserStory[]> {
  const { processText, cloudKey, apiKey, clarifyContext, onProgress } = options;

  const cloud = SALESFORCE_CLOUDS.find((c) => c.key === cloudKey);
  const cloudName = cloud?.name ?? "Salesforce";

  onProgress?.("Preparing process flow for analysis...");

  const systemPrompt = buildSystemPrompt(cloudKey, clarifyContext);
  const userMessage = buildUserMessage(processText, cloudName);

  onProgress?.("Calling Claude API to generate user stories...");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-5-20251101",
      max_tokens: 8000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    if (response.status === 401) throw new Error("Invalid API key. Please check your Anthropic API key and try again.");
    if (response.status === 429) throw new Error("Rate limit exceeded. Please wait a moment and try again.");
    throw new Error(`API error (${response.status}): ${err.slice(0, 200)}`);
  }

  onProgress?.("Processing Claude response...");

  const data = await response.json();
  const rawText: string = data.content?.[0]?.text ?? "";
  const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

  let parsed: unknown[];
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) {
      parsed = JSON.parse(match[0]);
    } else {
      throw new Error("Could not parse user stories from Claude response. The response may not have been valid JSON.");
    }
  }

  onProgress?.("Finalizing and numbering stories...");

  let counter = 1;
  const stories: UserStory[] = (parsed as Record<string, unknown>[]).map((raw) => ({
    id: `US-${String(counter++).padStart(3, "0")}`,
    processStepId: String(raw.processStepId ?? ""),
    processStepName: String(raw.processStepName ?? ""),
    title: String(raw.title ?? "Untitled Story"),
    actor: String(raw.actor ?? ""),
    action: String(raw.action ?? ""),
    benefit: String(raw.benefit ?? ""),
    fullStory: String(raw.fullStory ?? ""),
    acceptanceCriteria: Array.isArray(raw.acceptanceCriteria)
      ? (raw.acceptanceCriteria as string[]).map(String)
      : ["Acceptance criteria to be defined"],
    primarySystem: String(raw.primarySystem ?? cloudName),
    secondarySystem: String(raw.secondarySystem ?? "N/A"),
    priority: (["High", "Medium", "Low"].includes(String(raw.priority))
      ? raw.priority : "Medium") as UserStory["priority"],
    status: "Draft" as const,
  }));

  return stories;
}
