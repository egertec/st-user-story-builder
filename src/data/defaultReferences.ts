export const DEFAULT_GUIDE_TEXT = `Sales Transformation

User Story Generator

The Complete Guide to

High-Quality User Stories

for Salesforce CRM Implementations

A practitioner's reference for Business Consultants, Solution Architects,

and Technical Delivery Teams working on Sales Transformation Programs

Table of Contents

1. Why User Stories Matter in CRM Transformations

User stories are the primary vehicle for translating business intent into buildable software. In a Salesforce CRM transformation, the quality of your user stories directly determines: how accurately the system is configured, how much rework occurs after UAT, whether the business accepts the solution, and how efficiently your delivery team works through sprints.

Poor user stories are one of the most consistent root causes of cost overruns and scope disagreements on CRM programs. "Vague requirements" and "hangover rework" routinely account for 20–40% of wasted effort on enterprise Salesforce implementations. Yet most teams continue to under-invest in this discipline, treating story writing as a lightweight task rather than a core consulting competency.

This guide exists to close that gap. It is written from two perspectives:

-   Business Consultants and Functional Analysts — who write stories that capture what users need and why

-   Technical Architects and Developers — who need stories that give them enough context to build, test, and deploy with confidence

  --------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  KEY PRINCIPLE   A user story is a promise for a conversation — not a specification document. But that conversation must ultimately produce enough clarity for a developer to build something testable, and for a business stakeholder to verify it meets their need.
  --------------- ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

2. Anatomy of a Well-Formed User Story

2.1 The Standard Format

Every user story follows a three-part structure:

  ------------ -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Component    Guidance
  As a…        The functional persona who benefits. Not "a user." Not "the system." A real functional role with a specific context and goal. Example: "Sales Rep," "CRM Admin," "Sales Manager."
  I want to…   The action or capability the user needs. This is what they want to accomplish — not how the system should implement it. Write in the user's language, not technical language.
  So that…     The business value or outcome. This is the "why" — the reason this matters to the user and to the business. This is the most frequently omitted part and the most important.
  ------------ -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

2.2 Acceptance Criteria

Acceptance criteria are the conditions that must be true for the story to be considered complete. They are the contract between the business and the development team. Without clear acceptance criteria, "done" is subjective and UAT becomes a negotiation.

Write acceptance criteria as testable statements, not design decisions. Use the Given-When-Then format for complex interactions, or a simple numbered checklist for configuration items:

  -------------------------------------------------------------------------------------------------------------------------- -------------------------------------------------
  ✓ Strong AC                                                                                                                ✗ Weak AC
  When a Web-to-Lead form is submitted, a Lead record is created within 60 seconds with Lead Source set to 'Web – Inbound'   The form should work properly and create a lead
  Sales Rep can apply discounts up to 15%; discounts above 15% trigger a manager approval workflow                           Discounts should be handled appropriately
  Opportunity list view with 10,000 records loads in under 4 seconds (Chrome on standard laptop)                             Reports should load quickly
  Duplicate detection fires on Lead creation and surfaces any match on email address, phone, or company name                 No duplicate records are created
  -------------------------------------------------------------------------------------------------------------------------- -------------------------------------------------

  ------------------------------ ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  ACCEPTANCE CRITERIA GUIDANCE   There is no fixed number of acceptance criteria a story must have. Write as many as needed to fully and unambiguously define done. Simple configuration stories may need only 2–3. Complex multi-actor workflows may require 8–10. The one rule: a story with a single acceptance criterion is almost never sufficiently specified — one criterion rarely captures edge cases, failure paths, or access rules. If you genuinely cannot write more than one testable condition, the story is likely trivial enough to combine with another, or the requirement has not been fully thought through.
  ------------------------------ ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

2.3 Required Metadata Fields

Each story should carry metadata that supports sprint planning, backlog management, and reporting. For Salesforce CRM stories, the following fields are standard:

  ------------------ --------------------------------- --------------------------------------------------------
  Field              Example Values                    Why It Matters
  Story ID           US-001, US-042                    Enables traceability to UAT test cases and defects
  Process Step       1.3 – Lead Assignment & Routing   Links story to the source process flow
  Primary System     Salesforce Sales Cloud            Drives sprint team assignment and system testing scope
  Secondary System   Marketing Cloud, SAP              Surfaces integration dependencies early
  Priority           High / Medium / Low               Drives sprint ordering and MVP vs. Phase 2 decisions
  Status             Draft / In Review / Approved      Controls readiness to enter a sprint
  Epic / Feature     Lead Management, Quoting          Enables epic-level reporting and release planning
  ------------------ --------------------------------- --------------------------------------------------------

3. The INVEST Framework Applied to Salesforce Stories

The INVEST mnemonic provides a six-point quality check for any user story. In a Salesforce context, each criterion has specific implications:

  -------- ------------- ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Letter   Principle`;

export const DEFAULT_GUIDE_NAME = "Sales Transformation User Story Guide";

export const DEFAULT_EXAMPLES_TEXT = `Process-to-Story

Mapping Guide

How to Decompose Process Flows into High-Quality User Stories

A reference for AI-assisted user story generation in Salesforce CRM implementations

Companion document to the Sales Transformation User Story Generator

Purpose of This Document

This document teaches you how to translate process flow diagrams into well-structured Salesforce user stories. Rather than simply showing finished outputs, it walks through the reasoning — how to read a process flow, what signals indicate distinct stories, how to decompose complex steps, and how to calibrate the right level of detail.

  ------------ ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  FOR AI USE   When this document is provided as context alongside a process flow, use its decomposition rules and patterns to determine WHAT stories to write, HOW to scope each one, and WHY certain decisions are made. The worked examples demonstrate the expected output quality. Apply the rules to any new process flow — do not simply copy the example stories.
  ------------ ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  --------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  FOR HUMAN USE   Use this document to understand and validate what the AI generates. The decomposition rules give you a framework to assess whether the AI has identified the right number of stories at the right level of granularity.
  --------------- -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

Section 1: How to Read a Process Flow

Process flow diagrams are the primary input for user story generation. They describe who does what, in what order, using which systems, and under what conditions. Understanding how to read them is the prerequisite for writing good stories.

Key Elements in Process Flows

Process flows typically contain the following elements, each of which carries information relevant to story generation:

Swimlanes (Actors)

Horizontal or vertical lanes representing who performs each action. Each swimlane corresponds to a persona or system. When a process step sits in a swimlane labeled "Sales Rep," the user story's actor should be a Sales Representative. When a step sits in a "System" lane, it describes automated behavior.

-   Look for: lane labels, role names, system names

-   Story signal: every distinct swimlane that touches a process step is a potential actor in a story

Action Boxes (Process Steps)

Rectangles describing discrete actions: "Create Account," "Submit Quote for Approval," "Generate Order Form." Each action box is typically one or more user stories depending on complexity.

-   Look for: verb + noun combinations (these map directly to the "I want to" clause)

-   Story signal: each action box is at minimum one story; complex boxes with multiple verbs may split into several

-   Color coding: action boxes are often color-coded to distinguish automated steps from manual steps. A common convention is blue boxes for automated/system steps and gray boxes for manual/user steps. However, process flows vary — if the format looks different, evaluate the steps and determine which color or symbol indicates automated vs. manual based on context and any legend provided

Decision Diamonds (Branches)

Diamond shapes with Yes/No or conditional paths. These represent business rules and are critical for acceptance criteria. The branch conditions often become the most valuable part of your stories.

-   Look for: questions, conditions, validation checks

-   Story signal: the decision itself may warrant a story (e.g., validation rules), and each branch path may need its own story or acceptance criterion

System Handoffs (Integration Points)

Arrows or connectors between swimlanes that cross system boundaries. When data moves from Salesforce to an external system (or vice versa), this signals an integration story.

-   Look for: arrows crossing from one system lane to another, labels like "API call," "data sync," "notification"

-   Story signal: every system-to-system handoff needs at minimum one integration story covering trigger, data payload, and error handling

Integration Cylinders (System/Database References)

Integrations may also be represented as cylinder shapes, which typically indicate a system or database. The cylinder will usually contain or be labeled with the name of the external system. This label indicates the system that is either sending or receiving data.

-   Look for: cylinder shapes with system names (e.g., "Product Platform," "Ironclad," "ERP")

-   To determine if the system is the sender or receiver of data, reference the earlier steps in the process for directional context — the flow direction and preceding actions will clarify whether data is being pushed to or pulled from the system

-   Story signal: same as arrows — each cylinder interaction needs an integration story with trigger, payload, response, and error handling

Subprocess Callouts

References to other process flows or detailed sub-steps. These are often collapsed complexity — a single box labeled "Run Approval Process" might expand into 5+ stories when you look at the subprocess.

-   Look for: box-within-a-box icons, references to other flow names, "see subprocess" annotations

-   Story signal: flag these for expansion; each referenced subprocess likely needs its own story set

Process Flow Header / Title Block

Most process flows include a header section at the top containing the process name, a definition or description, and sometimes additional context such as capabilities covered, i`;

export const DEFAULT_EXAMPLES_NAME = "Process-to-Story Mapping Guide";

export const DEFAULT_PRACTICES_TEXT = `Salesforce Leading Practices Reference
Business Process Design Guidance for CRM Implementations

Purpose: This document provides leading practices for key Salesforce capabilities. When generating user stories, use these practices as guardrails — they represent proven patterns that reduce rework, improve adoption, and align with Salesforce's platform strengths.

FOR AI USE: Reference these practices when deciding HOW to write acceptance criteria, WHICH approach to recommend, and WHAT patterns to follow. If a process flow implies an approach that conflicts with a leading practice listed here, flag it in the acceptance criteria as a recommendation. When the process flow involves a capability NOT covered in this document, the AI should research and apply current Salesforce best practices for that capability before generating stories — this is especially important for Industry Cloud capabilities (Life Sciences Cloud, Health Cloud, Financial Services Cloud, etc.) that may be newer or have specialized patterns not covered here.

CRITICAL — UNLISTED CAPABILITIES: If the process flow references a Salesforce capability, object, or feature NOT explicitly covered below, DO NOT skip it or apply generic patterns. Instead: (1) Identify the specific capability from context. (2) Apply your knowledge of that capability's leading practices, standard objects, and OOB configuration options. (3) Mark any inferred practices with [PRACTICE SOURCE: AI-INFERRED — VALIDATE WITH SOLUTION ARCHITECT]. This ensures coverage of Industry Cloud features, new platform capabilities, and specialized add-ons while maintaining transparency about confidence level.

1. Lead Management

- Lead Source Tracking: Every Lead must have a Lead Source value populated at creation. Use picklist values aligned to marketing attribution (Web, Event, Referral, Partner, etc.). Never allow blank Lead Source.
- Lead Assignment: Use Assignment Rules for automated routing based on geography, product interest, or round-robin. Avoid manual assignment as the primary method — it doesn't scale and creates bottlenecks.
- Lead Scoring: Implement a scoring model (behavioral + demographic) before building complex routing. Score should be visible on the Lead record and influence assignment priority.
- Lead Conversion: Use standard Lead Conversion to auto-create Account, Contact, and optionally Opportunity. Map all custom Lead fields to their Account/Contact/Opportunity equivalents. Never create Accounts manually as a workaround for conversion limitations.
- Duplicate Management: Enable Duplicate Rules and Matching Rules on Lead creation. Surface potential duplicates to the user rather than hard-blocking — let the user decide, but make duplicates visible.

2. Opportunity Management

- Stage Progression: Define a clear, linear stage path with entry/exit criteria for each stage. Stages should reflect the buyer's journey, not internal process steps. Require validation rules for key fields at each stage transition.
- Close Date Discipline: Opportunities must have a Close Date. Implement automated reminders or dashboard alerts for opportunities past their Close Date that haven't been updated.
- Amount & Forecasting: Populate Amount at Opportunity creation where possible. Use standard Forecasting (Collaborative Forecasts) rather than custom forecast objects. Forecast Categories should map cleanly to Opportunity Stages.
- Competitor Tracking: Use the standard Competitor related list on Opportunity. Track competitor presence at the deal level, not just at the Account level.
- Products & Price Books: Use standard Products and Price Books for line-item pricing. Avoid storing pricing in custom fields on the Opportunity — this breaks reporting and CPQ integration paths.

3. Quote-to-Cash / CPQ

- Quote Object: Use the standard Quote object (or Salesforce CPQ if licensed). Link Quotes to Opportunities as children. One Opportunity can have multiple Quotes; only one should be marked as Synced.
- Discount Approvals: Implement Approval Processes for discounts exceeding defined thresholds. Make thresholds configurable (Custom Metadata or Custom Settings) so business can adjust without code changes.
- PDF Generation: Use Quote Templates for standard PDF output. For complex layouts, consider document generation tools. Avoid building custom PDF generation in Apex unless absolutely necessary.
- Order Creation: Convert Quotes to Orders using standard functionality. Ensure all required Order fields are populated during conversion to avoid manual data entry downstream.

4. Account & Contact Management

- Account Hierarchy: Use the standard Parent Account field to model corporate hierarchies. Don't create custom hierarchy objects unless the standard model is truly insufficient (rare).
- Account Ownership: Account Owner should align to the primary relationship holder. Use Account Teams for shared ownership scenarios rather than changing the owner field.
- Contact Roles: Use Opportunity Contact Roles to track who is involved in each deal. Require at least one Contact Role on every Opportunity (use validation rules).
- Person Accounts: Only use Person Accounts when the business genuinely sells to individuals, not companies. This is a one-way decision — evaluate carefully before enabling.

5. Activity & Task Management

- Activity Logging: Encourage reps to log activities (calls, emails, meetings) on the related record (Account, Contact, Opportunity). Use Activity Timeline for a unified view. Integrate email clients (Outlook/Gmail) for automatic logging where possible.
- Task Assignment: Use standard Tasks for follow-up actions. Set Due Dates and link tasks to the relevant record. Avoid creating custom task objects — the standard Task model integrates deeply with reminders, calendars, and Einstein Activity Capture.

6. Approval Workflows

- Standard Approval Processes: Use OOB Approval Processes for most approval needs. They support multi-step, parallel, and unanimous approvals without code. Only build custom approval logic in Flow or Apex for truly exceptional patterns.
- Approval History: Always maintain a visible approval history on the record. Use the standard Approval History related list so users can see who approved, when, and any comments.
- Delegated Approvers: Configure Delegated Approvers so approvals don't stall when someone is out of office. This is a frequently missed configuration that causes production delays.
- Recall & Reassign: Enable Recall functionality so submitters can pull back pending approvals if requirements change. Don't force users to wait for rejection.

7. Reporting & Dashboards

- Report-First Design: When defining AC, consider what the business will want to report on. If a field isn't captured, it can't be reported. Design stories with reportability in mind.
- Dashboard Strategy: Build role-specific dashboards (Rep Dashboard, Manager Dashboard, Exec Dashboard) rather than one-size-fits-all. Each role has different KPIs and time horizons.
- Real-Time vs. Scheduled: Use real-time dashboards for operational metrics (pipeline, open cases). Use scheduled reports for periodic summaries (weekly forecast, monthly win rate).
- Cross-Object Reporting: Use Custom Report Types to enable cross-object reporting when standard types don't cover the need. Plan these early — they're often a late discovery that delays UAT.

8. Integration Patterns

- API-First: Prefer standard REST/SOAP APIs over custom middleware where possible. Salesforce Connect (External Objects) can reduce integration complexity for read-only external data.
- Bulk Data Loads: For batch operations (nightly syncs, mass updates), use Bulk API 2.0. Design error handling to retry failed records, not entire batches.
- Real-Time vs. Near-Real-Time: Use Platform Events or Change Data Capture for real-time integration needs. Avoid polling patterns — they waste API limits and introduce latency.
- Error Handling: Every integration story must include error handling AC: what happens when the external system is unavailable? What happens with partial failures? Who gets notified?
- Idempotency: Integration operations should be idempotent — running the same operation twice should not create duplicate records. Use External IDs for upsert operations.

9. Security & Access

- Profile + Permission Set Model: Use Profiles for base access, Permission Sets for incremental capabilities. Avoid creating one Profile per role — use Permission Set Groups to compose access.
- Record-Level Access: Use OWD (Organization-Wide Defaults) + Sharing Rules + Role Hierarchy for record visibility. Set OWDs to the most restrictive needed, then open up with sharing rules. Avoid Apex-managed sharing unless standard sharing can't meet the requirement.
- Field-Level Security: Apply FLS through Permission Sets, not Profiles. Review FLS for every custom field — the default is often too permissive.

10. Automation

- Flow-First: Use Flow Builder for automation instead of Process Builder (retired) or Workflow Rules (legacy). Flow supports before-save and after-save triggers, scheduled actions, and screen-based interactions.
- Apex as Last Resort: Only use Apex triggers/classes when Flow cannot handle the logic (complex calculations, callouts, governor limit concerns). Document why Apex was chosen over Flow.
- Order of Execution: Be aware of Salesforce's order of execution (validation rules → before triggers → after triggers → workflow → process builders → flows). Design automation to avoid conflicts.
- Governor Limits: Write stories with bulkification in mind. AC should specify that automation handles batch operations (e.g., "when 200 records are updated simultaneously, all records process successfully").`;

export const DEFAULT_PRACTICES_NAME = "Salesforce Leading Practices Reference";
