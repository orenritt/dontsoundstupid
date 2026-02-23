## MODIFIED Requirements

### Requirement: Conversation Transcript Processing

The system MUST use LLM-powered parsing to extract structured context from free-text conversation input, preserving the user's niche-specific language.

#### Scenario: Transcript to structured data

- **WHEN** the user completes the conversation step
- **THEN** the system MUST send the transcript to an LLM for extraction of: initiatives, concerns, topics, knowledge gaps, intelligence goals, expertise signals (expert areas + weak areas)
- **AND** MUST generate a list of inferred topics/entities for the rapid-fire clarification round
- **AND** MUST include one-line context per topic explaining why it was inferred

#### Scenario: Topic extraction preserves niche specificity

- **WHEN** the LLM extracts topics from the conversation transcript
- **THEN** the LLM MUST preserve the user's exact niche phrasing as intersectional descriptors rather than generalizing to taxonomic parent categories
- **AND** if the user says "nature-based insurance for coral reef restoration", the extracted topic MUST be "nature-based insurance for coral reef restoration" or similar niche-preserving phrasing, NOT "insurtech" or "climate risk" as standalone topics
- **AND** the LLM MUST extract topics as phrases that capture the intersection of the user's specific domain, NOT as independent keywords that could each match broad content

#### Scenario: Two-tier topic extraction

- **WHEN** the LLM extracts topics from the conversation transcript
- **THEN** the LLM MUST produce two distinct tiers:
  1. `topics`: Intersectional niche descriptors that define the user's specific content scope (used as search inputs and content universe coreTopics candidates)
  2. `contextTerms`: Individual terms that provide background context but MUST NOT be used as standalone search queries (e.g., "insurance", "coral reefs" — useful as context, dangerous as queries)
- **AND** the LLM prompt MUST explicitly instruct: "Do NOT generalize to parent categories. If the user works at the intersection of two fields, the topic is the intersection, not each field independently."

#### Scenario: Rapid-fire classifications as exclusion signals

- **WHEN** the user marks a topic as "Not relevant" during the rapid-fire clarification round
- **THEN** the system MUST store this classification as a strong exclusion signal
- **AND** the "not-relevant" topic MUST be passed to content universe generation as an explicit exclusion candidate
