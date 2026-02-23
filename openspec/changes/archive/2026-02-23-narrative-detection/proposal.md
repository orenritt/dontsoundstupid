## Why

Syndication and research layers collect raw signals, but they don't reveal *how* topics are being talked about. Narrative detection adds an LLM-powered monitoring layer that watches large-scale coverage to detect emerging frames, language shifts, and trending narratives. This turns raw signal volume into actionable insight: "everyone is suddenly calling X 'Y'" or "a new framing of Z is gaining traction across 4 sources."

## What Changes

- Define narrative source types: news APIs, social trend feeds, search trend data
- Define narrative frame detection model: frames with momentum scoring, multi-source adoption tracking, and related signal linkage
- Define term burst detection: emerging jargon, frequency deltas, adoption velocity
- Define narrative analysis snapshots: periodic LLM-powered analysis of current narrative landscape per topic area
- Define narrative configuration: LLM provider settings, analysis frequency, minimum thresholds

## Capabilities

### New Capabilities
- `narrative-detection`: LLM-powered monitoring of large-scale coverage to detect emerging frames, language shifts, and trending narratives

## Impact

- New narrative detection types and models
- New DB tables for narrative frames and term bursts
- Signals from this layer tagged with layer "narrative"
- Integrates with existing signal store and provenance system
