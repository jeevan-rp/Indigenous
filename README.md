# Indigenous Component Dependency & Alternative Intelligence Platform (IndiComp)

An intelligent, explainable engineering decision-support platform designed to analyze electronics Bills of Materials (BOM), identify single-source and critical supply-chain vulnerabilities, discover technically compatible component replacements, and prioritize verified Indian-manufactured semiconductors with transparent provenance evidence.

---

## 1. Project Purpose & Engineering Motivation

Electronics manufacturing enterprises frequently suffer production halts when critical microcontrollers, power regulators, sensors, or communication transceivers become obsolete or unobtainable. Identifying suitable replacements manually requires cross-referencing hundreds of datasheet pages across electrical limits, footprints, operating temperatures, and bus protocols.

**IndiComp** solves this challenge through:
- **Automated BOM Ingestion & Validation:** Rigorous parsing of CSV/XLSX files, catching malformed quantities, duplicate line items, and missing part numbers while preventing spreadsheet formula injection.
- **Explainable Sourcing Risk Scoring:** Heuristic risk evaluation combining user-designated criticality, cross-BOM sharing concentration, single-source dependency, and manufacturer lifecycle evidence.
- **Two-Stage Alternative Discovery:** Category-aware hard constraint checks (nominal and range voltages, current ratings, package footprints, and protocol interfaces), followed by multi-factor weighted ranking.
- **Transparent Provenance & Indian Sourcing Integrity:** Strict distinction between verified Indian manufacturers (e.g. SCL Mohali, Mindgrove Technologies, BEL, C-DAC), Indian distributors distributing foreign silicon, foreign manufacturers, and unknown origins.

---

## 2. Core Safety & Scientific Transparency Rules

The platform is engineered under strict engineering ethics and data governance principles:
1. **No Blanket Claims:** We never assert that all imported components possess indigenous substitutes. When no compatible part exists in the catalogue, the system explicitly states: *"No verified suitable alternative found in the current dataset."*
2. **Provenance Distinction:** Manufacturer country, supplier/distributor country, and design origin are tracked independently. Selling foreign chips via domestic distributors does not classify them as Indian.
3. **No Fabrication of Facts:** Specifications, availability, prices, and lead times are never hallucinated.
4. **Mandatory Human Verification (Safety Rule #8):** All calculations are clearly labeled as heuristic estimates. Mandatory hardware bench verification of pinout and electrical parameters is required before production change.
5. **Missing Fields Are UNKNOWN:** Missing technical parameters are recorded as `UNKNOWN` and are never counted as matches.
6. **No Indian Forcing:** Indian candidates that fail technical requirements (e.g., mismatched voltage or package) are strictly flagged as `HARD MISMATCH` and are never promoted above viable candidates.
7. **Simulation Guardrails:** The scenario simulator calculates blast radius using strictly stored BOM quantities and products; it never invents fictional monetary losses or operational downtime forecasts.

---

## 3. Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Recharts (Responsive charts).
- **Backend:** Python 3.11/3.13, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic migrations.
- **File & Report Processing:** Pandas, openpyxl, ReportLab (PDF generation with audit tables and disclaimers).
- **Database:** PostgreSQL 16 (production & Docker) / SQLite (standalone zero-dependency local dev & pytest).
- **Testing:** Pytest (18 automated tests) & Vitest (frontend unit tests).
- **Containerization:** Docker & Docker Compose.

---

## 4. System Architecture & Directory Layout

```
d:/IndiComp/
├── backend/
│   ├── app/
│   │   ├── config.py              # Configuration & feature flags
│   │   ├── database.py            # SQLAlchemy 2.0 session engine
│   │   ├── models.py              # Normalized schema with JSONB support
│   │   ├── schemas.py             # Pydantic v2 validation models
│   │   ├── main.py                # FastAPI app & lifecycle seeder
│   │   ├── rules/
│   │   │   ├── hard_constraints.py# Category-aware physical/electrical rule engine
│   │   │   ├── ranking.py         # Secondary factor ranking & origin labeling
│   │   │   └── risk_scoring.py    # Transparent dependency risk scoring
│   │   ├── services/
│   │   │   ├── bom_parser.py      # CSV/XLSX parser with formula-injection guard
│   │   │   ├── alternative_service.py # Two-stage candidate discovery
│   │   │   ├── simulation_service.py  # Hypothetical supply disruption simulator
│   │   │   ├── report_generator.py    # ReportLab PDF & CSV generator
│   │   │   ├── llm_explainer.py   # Deterministic rule & Ollama adapter
│   │   │   └── seed_data.py       # High-fidelity synthetic dataset seeder
│   │   └── routers/               # Documented REST API endpoints
│   ├── migrations/                # Alembic schema versioning
│   ├── tests/                     # 18 automated backend pytest tests
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/client.ts          # Type-safe API client
│   │   ├── components/            # Reusable badges, comparison tables, layout
│   │   ├── pages/                 # 9 application pages
│   │   └── types/                 # TypeScript interfaces
│   ├── package.json
│   ├── vite.config.ts
│   └── Dockerfile
├── data/
│   ├── sample_bom.csv             # Test BOM with 12 items & multi-BOM sharing
│   └── sample_bom.xlsx            # Excel format BOM
├── docker-compose.yml             # Single-command multi-service deployment
├── .env.example                   # Safe configuration template
└── README.md
```

---

## 5. Data Provenance & Verification Matrix

| Component Part Number | Manufacturer | Category | Origin Classification | Technical Verification |
| :--- | :--- | :--- | :--- | :--- |
| **STM32F401RET6** | STMicroelectronics | Microcontroller | `FOREIGN` (France/Italy) | Verified datasheet link |
| **SHAKTI-E-CLASS** | Mindgrove / IIT Madras | Microcontroller | `VERIFIED_INDIAN` (India) | Verified published datasheet; drop-in LQFP-64 3.3V candidate |
| **VEGA-THEJAS-32** | C-DAC | Microcontroller | `VERIFIED_INDIAN` (India) | Verified catalogue; QFN-32 package variation (redesign required) |
| **ESP32-WROOM-32E** | Espressif Systems | Microcontroller | `FOREIGN` (China) | Verified datasheet |
| **CUSTOM-FPGA-99** | Fabless Global Semi | Microcontroller / ASIC | `FOREIGN` (USA) | Single-source; **No alternative in catalogue** |
| **LM1117IMP-3.3** | Texas Instruments | Voltage Regulator | `FOREIGN` (USA) | Verified datasheet; SOT-223 3.3V LDO |
| **SCL-1117-3.3** | SCL Mohali | Voltage Regulator | `VERIFIED_INDIAN` (India) | Verified indigenous fab; pin-compatible drop-in alternative |
| **AP1117E33G-13** | Diodes Inc (dist. Mouser/Element14) | Voltage Regulator | `INDIAN_SUPPLIER_UNVERIFIED_MFR` | Procured via Indian distributor; mfr fab unverified |
| **LM7805-TO220** | STMicroelectronics | Voltage Regulator | `FOREIGN` (France) | **Hard Mismatch** (5.0V output vs 3.3V requirement) |
| **INA219AIDR** | Texas Instruments | Sensor | `FOREIGN` (USA) | Verified datasheet; I2C shunt monitor |
| **BEL-CS-219** | Bharat Electronics (BEL) | Sensor | `VERIFIED_INDIAN` (India) | Verified catalogue; drop-in I2C power monitor alternative |
| **UNKNOWN-SENSOR-01** | Unknown Origin Labs | Sensor | `UNKNOWN` | **Edge Case:** Missing voltage specs & unknown origin |
| **MAX485ESA+** | Analog Devices | Communication | `FOREIGN` (USA) | Verified datasheet; SOIC-8 RS-485 transceiver |
| **SP485EEN-L/TR** | MaxLinear (dist. Mouser India) | Communication | `INDIAN_SUPPLIER_UNVERIFIED_MFR` | Domestic distributor channel; foreign fabrication |
| **IR2104STRPBF** | Infineon Technologies | Driver IC | `FOREIGN` (Germany) | **Edge Case:** Lifecycle is NRND (Not Recommended for New Designs) |

---

## 6. How to Run the Application

### Option A: Local Development (Quick Native Run)

#### Step 1: Backend Setup
```powershell
cd d:\IndiComp\backend

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Run migrations (already generated)
alembic upgrade head

# Start FastAPI server
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
The backend API and interactive Swagger documentation will be available at:
- API Root: `http://127.0.0.1:8000`
- Interactive Swagger UI: `http://127.0.0.1:8000/docs`

#### Step 2: Frontend Setup
Open a second terminal:
```powershell
cd d:\IndiComp\frontend

# Start frontend application
npm run preview -- --host 127.0.0.1 --port 5173
# (Or run 'npm run dev' for development mode)
```
Open your browser at **`http://127.0.0.1:5173/`**.

---

### Option B: One-Command Docker Compose

To run the complete production-grade stack including PostgreSQL:
```powershell
cd d:\IndiComp
docker-compose up --build
```
Services will initialize:
- **Frontend:** `http://localhost:3000`
- **Backend API:** `http://localhost:8000`
- **PostgreSQL Database:** `localhost:5432`

---

## 7. Running Automated Tests

### Backend Test Suite (Pytest)
```powershell
cd d:\IndiComp\backend
.\venv\Scripts\pytest -v tests
```
**Test Results: 18 Passed (100%):**
- `test_api_health`: API health check probe
- `test_api_dashboard_summary`: Dynamic database metrics calculation
- `test_api_components_catalogue_search_and_filters`: Filtering by origin & category
- `test_api_component_detail_and_user_criticality_update`: User annotations without overwriting facts
- `test_api_alternative_finder`: Two-stage discovery finding `SHAKTI-E-CLASS` for STM32
- `test_api_single_source_component_shows_no_alternatives`: Honest no-alternative message for FPGA
- `test_api_bom_upload_valid_csv`: Multi-product BOM import
- `test_api_bom_upload_invalid_file_rejected`: Malformed row rejection
- `test_api_simulation_unavailability_scenario`: Blast radius calculation
- `test_api_report_generation_csv_and_pdf`: PDF and CSV export verification
- `test_api_data_sources_status`: API unconfigured fallback
- `test_hard_mismatch_detected_for_voltage_regulator`: 5V vs 3.3V rejection
- `test_hard_mismatch_for_package_variation`: Footprint mismatch detection
- `test_unknown_specifications_never_counted_as_matches`: Rule #7 compliance
- `test_origin_unknown_distinguished`: Rule #2 provenance preservation
- `test_indian_candidate_not_forced_when_hard_mismatch`: No false promotion
- `test_csv_formula_injection_sanitization`: Security sanitization
- `test_risk_score_transparent_breakdown`: Heuristic scoring explainability

### Frontend Test Suite (Vitest)
```powershell
cd d:\IndiComp\frontend
npm run test
```
**Test Results: 2 Passed (100%):**
- Domain types and origin badge mappings
- Unknown specification non-match guarantees

---

## 8. Faculty Demo Walkthrough (Step-by-Step)

When demonstrating the project during evaluation or viva:

1. **Landing Page (`/`):**
   - Explain the core engineering challenge: unexpected semiconductor obsolescence and single-sourcing risks in industrial manufacturing.
   - Point out the **Safety Rule #8 banner**: Explain why automated calculations are heuristic indicators requiring human engineering verification.

2. **Dashboard (`/dashboard`):**
   - Point out that **all cards and charts are calculated live from the database**, not hardcoded UI elements.
   - Show the **Verified Indian Mfr** counter vs **Indian Supplier (Mfr Unverified)** vs **Unknown Origin**. Explain why selling a foreign chip through an Indian distributor does not make it Indian.
   - Show the **High-Priority Components Requiring Review** table ranked by risk score.

3. **BOM Upload & Validation (`/boms`):**
   - Click **Download CSV Template** to show the standardized template with electrical parameters.
   - Upload `data/sample_bom.csv`. Show the validation engine parsing 12 rows, checking required voltage and packages, detecting duplicates, and displaying a preview before persisting.
   - Click **Inspect** on any BOM to show line-item quantities across distinct product assemblies.

4. **Component Catalogue (`/catalogue`):**
   - Filter by **Verified Indian Manufacturer** to display indigenous components (`SHAKTI-E-CLASS`, `SCL-1117-3.3`, `BEL-CS-219`, `VEGA-THEJAS-32`).
   - Click on **STM32F401RET6** to inspect its detail modal: show electrical specs, datasheet links, and the distinction between STMicroelectronics (Mfr) and Mouser India (Distributor).
   - Change user criticality or add an engineering note and click **Save Notes** — show that user annotations update without modifying manufacturer facts.

5. **Alternative Finder (`/alternatives`):**
   - Select **STM32F401RET6**: Show that the engine identifies **SHAKTI-E-CLASS** as a viable pin-compatible Indian alternative.
   - Inspect the **Side-by-Side Verification Table**: Point out the explicit labels (`MATCH`, `MISMATCH`, `UNKNOWN`) and transparent count (e.g. *"6 Matches, 0 Mismatches, 1 Unknown"*).
   - Click **Explain with AI / Rules** to show the deterministic explainability generator.
   - Now select **CUSTOM-FPGA-99**: Show that the system honestly reports: *"No verified suitable alternative found in the current dataset."* (Demonstrating Safety Rule #1).

6. **Hypothetical Scenario Simulator (`/simulator`):**
   - Select **LM1117IMP-3.3** and click **Execute What-If Simulation**.
   - Show that the blast radius highlights that LM1117 is shared across **Smart Energy Meter** and **Motor Drive Inverter** assemblies.
   - Point out the **Immediate Alternative Readiness**: **SCL-1117-3.3** is flagged as a drop-in replacement with minimal PCB redesign effort.
   - Emphasize the simulation disclaimer: calculations use real stored BOM quantities, never fabricated monetary losses.

7. **Reports (`/reports`):**
   - Generate a **PDF Report**. Click **Download File** and open the generated PDF to show the professional ReportLab layout, engineering safety disclaimer box, and component provenance table.
   - Generate and download a **CSV Audit File** to demonstrate formula-injection protection (`=`, `+`, `-` sanitization).

8. **Settings & Sources (`/settings`):**
   - Demonstrate the **Data Sources status**: Show that live external APIs (Nexar, DigiKey) are safely shown as `NOT_CONFIGURED` without exposing credentials, and the local curated catalogue operates offline.
   - Click **Reset To Synthetic Demo Baseline** to demonstrate repeatable demo seeding.
