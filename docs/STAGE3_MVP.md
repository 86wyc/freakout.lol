## Purpose

This document converts the Stage 3 production architecture into an implementation-ready MVP scope for `KG Qualify`.

Stage 3 should move the app from a single-user diligence prototype to a multi-tenant compliance workflow platform:

- firms as the customer, access, and billing boundary
- role-based permissions with optional workflow-level membership
- evidence-backed knowledge graph workflows for SOC 2, ISO 27001, GDPR, vendor review, and diligence
- subscription billing and entitlement-gated processing
- auditability and provenance for sensitive compliance work

## MVP Boundary

The first Stage 3 release should be narrow enough to ship without weakening the architecture.

### In scope

- `Firm` and `FirmMembership`
- firm-scoped `Project` records, keeping the existing table name initially
- role and permission checks for core actions
- private tenant-scoped document storage paths
- audit logs for privileged and evidence-changing actions
- billing customer and subscription skeleton
- plan entitlements for seats, active workflows, document processing, exports, and graph runs
- one enabled knowledge graph workflow, preferably SOC 2 or vendor review
- evidence requirements, evidence mappings, gaps, and output template drafts
- migration path for existing single-user data into default firms

### Out of scope

- fully custom enterprise roles
- complex procurement workflows and multi-entity invoicing
- autonomous regulatory submissions
- multi-region deployment
- customer-managed encryption keys
- complete replacement of diligence terminology in internal code
- public marketplace of graph templates

## Data Model Checklist

### Tenancy

- `Firm`
  - `name`
  - `slug`
  - `billingStatus`
  - `plan`
  - `region`
  - `dataRetentionDays`
  - timestamps
- `FirmMembership`
  - `firmId`
  - `userId`
  - `role`
  - `status`
  - invited/accepted timestamps
- `Project`
  - add `firmId`
  - keep existing `userId` during migration for compatibility
- `ProjectAccess` or `DealMembership`
  - optional project/workflow-level restrictions for sensitive workspaces

### Billing

- `BillingCustomer`
  - `firmId`
  - `provider`
  - `providerCustomerId`
  - `billingEmail`
  - `billingAdminUserId`
- `Subscription`
  - `firmId`
  - `providerSubscriptionId`
  - `plan`
  - `status`
  - `currentPeriodStart`
  - `currentPeriodEnd`
  - `cancelAtPeriodEnd`
- `UsageMeter`
  - `firmId`
  - `period`
  - `documentsProcessed`
  - `pagesOrChunksIndexed`
  - `graphRuns`
  - `exportsCreated`
  - `llmCostUsd`
- `InvoiceEvent`
  - immutable webhook event log
  - provider event ID should be unique for idempotency

### Knowledge workflows

- `KnowledgeGraphDefinition`
  - `key`
  - `name`
  - `version`
  - `status`
  - `schema`
- `FirmKnowledgeGraph`
  - `firmId`
  - `knowledgeGraphDefinitionId`
  - `enabledByUserId`
  - enabled timestamp
- `AssistanceGoal`
  - `projectId`
  - `knowledgeGraphDefinitionId`
  - `status`
- `EvidenceRequirement`
  - `knowledgeGraphDefinitionId`
  - `key`
  - `title`
  - `description`
  - `required`
  - accepted source types
- `EvidenceMapping`
  - `projectId`
  - `requirementId`
  - source document or chunk reference
  - confidence
  - reviewer status
- `EvidenceGap`
  - `projectId`
  - `requirementId`
  - reason
  - assigned user
  - status
- `OutputTemplate`
  - `knowledgeGraphDefinitionId`
  - template type
  - fields and source mapping rules

### Audit

- `AuditLog`
  - `firmId`
  - optional `projectId`
  - `actorUserId`
  - `action`
  - target type and target ID
  - metadata
  - request ID
  - timestamp

## Permission Matrix

Use roles as the UI abstraction, but enforce capability checks in code.

| Capability | Owner | Admin | Partner | Analyst | Reviewer | Viewer |
| --- | --- | --- | --- | --- | --- | --- |
| `billing.manage` | Yes | Optional | No | No | No | No |
| `members.invite` | Yes | Yes | No | No | No | No |
| `members.manage_roles` | Yes | Yes | No | No | No | No |
| `graphs.enable` | Yes | Yes | No | No | No | No |
| `projects.create` | Yes | Yes | Yes | Yes | No | No |
| `projects.view_all` | Yes | Yes | Yes | No | No | No |
| `documents.upload` | Yes | Yes | Yes | Yes | No | No |
| `documents.delete` | Yes | Yes | Yes | Yes | No | No |
| `workflow.run` | Yes | Yes | Yes | Yes | No | No |
| `evidence.review` | Yes | Yes | Yes | Yes | Yes | No |
| `outputs.approve` | Yes | Yes | Yes | No | Yes | No |
| `exports.create` | Yes | Yes | Yes | Yes | No | No |
| `audit.view` | Yes | Yes | Yes | No | No | No |

Project-level membership can narrow access further. A user with `projects.view_all` can see all firm projects. A user without it must be explicitly assigned to the project.

## Billing Policy

Start with a hybrid model:

- base subscription per firm
- seat limit by plan
- usage allowances for document processing, graph runs, and exports
- overage visibility before automated overage billing

### Entitlement checks

Check entitlements before:

- inviting a new member
- creating a new active project/workflow
- uploading documents
- running graph processing
- exporting a report, questionnaire, or evidence pack
- using assistant workflows that call paid LLM providers

### Payment failure behavior

- keep login, read access, audit logs, and export history available
- pause new processing after a grace period
- block new member invites and new workflow creation while suspended
- never delete customer data automatically because of failed payment

## First Knowledge Graph Workflow

The first graph should be narrow, reviewable, and useful with the current document pipeline. Vendor review is the lowest-risk first workflow; SOC 2 is the stronger marketing wedge but needs more careful control mapping.

### Recommended first workflow: vendor review

Inputs:

- security questionnaires
- SOC 2 reports
- DPAs
- MSAs
- privacy policies
- security policies
- insurance certificates
- data processing documentation

Evidence requirements:

- company identity and ownership
- security certifications
- data processing role
- subprocessors
- breach notification terms
- data retention and deletion terms
- access control practices
- encryption claims
- incident response posture
- insurance coverage

Outputs:

- vendor risk summary
- unanswered questions
- evidence table
- source-backed questionnaire draft
- reviewer approval checklist

### SOC 2 next

SOC 2 should follow once the graph machinery is stable. Start with a small control family rather than the full framework:

- access control
- change management
- incident response
- vendor management
- logical security

## Migration Plan

1. Add `Firm` and `FirmMembership`.
2. Backfill one default firm per existing user.
3. Add nullable `firmId` to `Project` and tenant-critical child tables.
4. Backfill `firmId` from project owner.
5. Make `firmId` required where safe.
6. Add service-layer scoped query helpers.
7. Update pages and server actions to resolve active firm context.
8. Add integration tests for cross-firm access denial.
9. Add RLS policies once the service-layer behavior is stable.
10. Move blob keys to firm/project-prefixed storage paths for new uploads.

## Implementation Sequence

### Stage 3.1: tenant foundation

- schema migration for firms and memberships
- active firm context in session/server actions
- firm-scoped project list and project access
- default firm backfill
- cross-tenant tests

### Stage 3.2: roles and audit

- permission helper
- role matrix constants
- member invite/manage screens
- audit log model and writes for privileged actions
- project-level membership restriction

### Stage 3.3: billing skeleton

- billing models
- Stripe or equivalent customer creation
- hosted checkout and customer portal links
- webhook route with idempotent `InvoiceEvent`
- entitlement checks for seats, projects, uploads, runs, and exports

### Stage 3.4: graph workflow MVP

- graph definition seed
- firm-enabled graph list
- assistance goal selection during project setup
- evidence requirement and mapping models
- gap list
- source-backed output draft

### Stage 3.5: hardening

- RLS policies
- private tenant-scoped blob access checks
- Sentry and structured logs
- dead-letter/retry visibility for processing jobs
- coverage tests for permissions, entitlements, and graph mapping

## Acceptance Criteria

Stage 3 MVP is ready when:

- a firm owner can create a firm, invite members, and assign roles
- users only see firm projects they are allowed to access
- cross-firm reads are rejected by service tests and database policy tests
- billing status and plan entitlements exist per firm
- expensive actions are blocked when entitlements are exceeded
- a firm admin can enable the first knowledge graph workflow
- a user can choose an assistance goal, upload documents, and run processing
- the app maps evidence to requirements and surfaces gaps
- the app drafts at least one source-backed output
- audit logs exist for membership, billing, graph enablement, document, processing, approval, and export actions

## Open Decisions

- Which first graph ships: vendor review or SOC 2?
- Should plans be seat-based first, usage-based first, or hybrid from day one?
- Should `Project` be renamed to `Workflow` publicly before or after Stage 3 MVP?
- Should RLS ship in Stage 3.1 or Stage 3.5?
- Which users can manage payment methods: only owner, or owner plus explicit billing admin?
- How much of graph definition editing should be UI-driven versus seed/config-driven for the first release?
