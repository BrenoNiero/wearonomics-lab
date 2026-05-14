# Wearonomics v1

### A Human-Centric Validation and Ledger Framework for Wearable Movement Data

Wearonomics v1 is a reproducible research environment designed to validate wearable-derived movement data through transparent state-machine logic, physiological synchronization, and auditable ledger-based attribution systems.

The framework was developed to investigate how real-world wearable telemetry can be segmented, interpreted, and validated under explicit analytical conditions while preserving methodological transparency and reproducibility.

Unlike conventional activity tracking systems that frequently rely on opaque classification models or aggregated session summaries, Wearonomics applies deterministic rule-based validation at segment level resolution. The system isolates locomotion from contamination events such as vehicle travel, pauses, vertical transport, and GPS artefacts using explicit and inspectable validation logic.

This repository corresponds to the frozen v1 research baseline used in the preprint:

**Wearonomics: A Human-Centric Validation and Ledger Framework for Wearable Movement Data**

The repository contains the operational implementation of the validation architecture, including movement segmentation, state-machine classification, physiological synchronization, economic attribution logic, ledger generation, and reporting components.

---

# Research Context

Wearable devices increasingly influence digital health research, behavioural analytics, insurance systems, and population-level measurement frameworks. Despite widespread adoption, wearable datasets frequently contain contamination arising from transport events, signal instability, environmental distortion, and behavioural ambiguity.

Many existing approaches depend on black-box machine learning models or coarse aggregation methods that limit interpretability, auditability, and reproducibility.

Wearonomics was developed as a transparent alternative.

The framework investigates how wearable-derived movement data can be validated through explicit rule-based analytical systems capable of supporting reproducible computational science and future behavioural research environments.

---

# Core Principles

The framework is grounded in three central principles:

### Explicit Validation

Movement classification is governed through transparent and parameterized state-machine logic. Validation assumptions remain visible, inspectable, and reproducible.

### Physiological Synchronization

Heart rate and cadence signals are integrated as physiological plausibility layers supporting behavioural interpretation and auditability.

### Ledger Preservation

Validated movement outcomes are preserved within cumulative temporal ledger structures designed to support reproducibility, longitudinal analysis, and transparent attribution models.

---

# Repository Structure

validation_pipeline/
Core validation logic, segmentation workflows, and state-machine architecture.

economic_model/
Deterministic attribution and ledger calculation modules.

sample_dataset/
Example wearable datasets and validation demonstrations.

system_architecture/
Framework structure, implementation diagrams, and validation flow documentation.

paper/
Research manuscript and publication materials.

src/lib/
Primary implementation modules including validation engine, control profiles, economics layer, and ledger generation.

---

# Validation Workflow

Raw GPX / FIT Dataset
↓

Movement Segmentation
↓

State-Machine Validation
↓

GPS Artefact Filtering
↓

Vehicle Persistence Detection
↓

Physiological Synchronization
↓

Validated Ledger Construction
↓

Structured Research Reporting

---

# Reproducibility

Wearonomics Lab v1 operates as a deterministic validation environment.

Identical datasets processed under identical validation profiles produce identical segment classifications, ledger outputs, validated durations, and attribution results.

No hidden probabilistic classifiers or opaque decision systems are used within the validation architecture.

All behavioural assumptions are encoded explicitly through transparent parameterized rules.

This repository is maintained as a frozen research baseline to preserve consistency between the implementation and the results presented in the associated preprint manuscript.

---

# Current Research Focus

Current work focuses on wearable-derived movement validation, behavioural continuity, longitudinal data quality, transparent activity classification, physiological plausibility analysis, reproducible wearable analytics, and auditable movement attribution systems.

Future research directions include controlled behavioural studies, multi-device validation architectures, and transparent incentive frameworks designed to support sustained wearable participation under scientifically auditable conditions.

Future developments are being explored separately under Wearonomics v2, focusing on broader wearable usability validation, continuous physiological monitoring, and longitudinal participation models. These future developments remain independent from the frozen v1 research baseline preserved in this repository.

---

# Research Publication

**Wearonomics: A Human-Centric Validation and Ledger Framework for Wearable Movement Data**
Breno Niero (2026)

ResearchGate:
https://www.researchgate.net/publication/401639284_Wearonomics_A_Human-Centric_Validation_and_Ledger_Framework_for_Wearable_Movement_Data

---

# Author

Breno Niero
Sydney, Australia

Research Profile:
https://www.researchgate.net/profile/Breno-Niero

Website:
https://www.brenoniero.com/research

ORCID:
https://orcid.org/0009-0005-0843-0114

---

# License

CC BY-NC-ND 4.0

This repository is shared for research, educational, and reproducibility purposes.

