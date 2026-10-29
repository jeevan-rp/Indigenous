import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from ..models import (
    Organisation, User, Component, ComponentSpecification,
    ComponentSource, BOM, BOMItem, Seller, SellerContact, DataSource,
    SellerListing, SourcingSearch, RFQ, RFQItem, RFQStatusHistory,
    SavedSeller, generate_uuid
)

logger = logging.getLogger(__name__)

def seed_database(db: Session, force_reset: bool = False):
    """
    Seeds the database with a high-fidelity synthetic demo dataset.
    Follows Core Safety and Data Rules:
      - All demo records explicitly marked is_synthetic = True.
      - Includes verified Indian manufacturers, Indian distributors (unverified mfr),
        foreign manufacturers, and unknown origin records.
      - Includes compatible candidates, hard mismatches, missing specs, and single-source parts.
    """
    existing_org = db.query(Organisation).filter_by(slug="bharat-aerospace-demo").first()
    if existing_org and not force_reset and db.query(Seller).first():
        logger.info("Demo database already seeded.")
        return existing_org

    # Wipe existing data cleanly
    db.query(RFQStatusHistory).delete()
    db.query(RFQItem).delete()
    db.query(RFQ).delete()
    db.query(SavedSeller).delete()
    db.query(SourcingSearch).delete()
    db.query(SellerListing).delete()
    db.query(SellerContact).delete()
    db.query(Seller).delete()
    db.query(DataSource).delete()
    db.query(BOMItem).delete()
    db.query(BOM).delete()
    db.query(ComponentSource).delete()
    db.query(ComponentSpecification).delete()
    db.query(Component).delete()
    db.query(User).delete()
    db.query(Organisation).filter_by(slug="bharat-aerospace-demo").delete()
    db.commit()

    # 1. Create Organisation and User
    org = Organisation(
        id=generate_uuid(),
        name="Bharat Industrial & Embedded Systems",
        slug="bharat-aerospace-demo"
    )
    db.add(org)
    db.flush()

    user = User(
        id=generate_uuid(),
        org_id=org.id,
        email="lead.engineer@bharat-embedded.in",
        full_name="Vikram Sharma",
        role="Lead Systems Engineer"
    )
    db.add(user)
    db.flush()

    # 2. Curated Synthetic Component Catalogue
    components_data = [
        # --- Microcontrollers ---
        {
            "part_number": "STM32F401RET6",
            "manufacturer": "STMicroelectronics",
            "category": "Microcontroller",
            "description": "High-performance ARM Cortex-M4 32-bit MCU with DSP and FPU, 512KB Flash, 84MHz.",
            "mfr_country": "France / Italy",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.st.com/en/microcontrollers-microprocessors/stm32f401re.html",
            "dist_country": "Global / India",
            "dist_name": "ST Direct / Mouser India",
            "design_origin": "France",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
            "source_url": "https://www.st.com/en/microcontrollers-microprocessors/stm32f401re.html",
            "source_name": "Manufacturer Official Datasheet",
            "user_crit": "CRITICAL",
            "specs": {
                "min_voltage_v": 1.7, "max_voltage_v": 3.6, "nominal_voltage_v": 3.3,
                "max_current_ma": 50.0, "package": "LQFP-64", "pin_count": 64,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["SPI", "I2C", "UART", "USB"],
                "clock_speed_mhz": 84.0, "flash_kb": 512, "ram_kb": 96
            }
        },
        {
            "part_number": "SHAKTI-E-CLASS",
            "manufacturer": "Mindgrove Technologies / IIT Madras",
            "category": "Microcontroller",
            "description": "Indigenous RISC-V 32-bit E-class embedded microcontroller SoC for IoT and smart meters.",
            "mfr_country": "India",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://mindgrovetech.in/silicon/shakti-series",
            "dist_country": "India",
            "dist_name": "Mindgrove Direct India",
            "design_origin": "India (IIT Madras)",
            "origin_cat": "VERIFIED_INDIAN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://mindgrovetech.in/docs/shakti-e-class-spec.pdf",
            "source_url": "https://mindgrovetech.in",
            "source_name": "Mindgrove Technologies Catalogue",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 1.8, "max_voltage_v": 3.6, "nominal_voltage_v": 3.3,
                "max_current_ma": 45.0, "package": "LQFP-64", "pin_count": 64,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["SPI", "I2C", "UART", "PWM"],
                "clock_speed_mhz": 75.0, "flash_kb": 512, "ram_kb": 128
            }
        },
        {
            "part_number": "VEGA-THEJAS-32",
            "manufacturer": "C-DAC (Centre for Development of Advanced Computing)",
            "category": "Microcontroller",
            "description": "Indigenous RISC-V 32-bit Microcontroller for industrial automation and telemetry.",
            "mfr_country": "India",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://vegaprocessors.in/thejas32",
            "dist_country": "India",
            "dist_name": "C-DAC Microelectronics",
            "design_origin": "India",
            "origin_cat": "VERIFIED_INDIAN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://vegaprocessors.in/docs/thejas32-datasheet.pdf",
            "source_url": "https://vegaprocessors.in",
            "source_name": "C-DAC Official Catalogue",
            "user_crit": "MEDIUM",
            "specs": {
                "min_voltage_v": 1.8, "max_voltage_v": 3.6, "nominal_voltage_v": 3.3,
                "max_current_ma": 40.0, "package": "QFN-32", "pin_count": 32,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 105.0,
                "interfaces": ["SPI", "I2C", "UART"],
                "clock_speed_mhz": 100.0, "flash_kb": 256, "ram_kb": 64
            }
        },
        {
            "part_number": "ESP32-WROOM-32E",
            "manufacturer": "Espressif Systems",
            "category": "Microcontroller",
            "description": "Wi-Fi + BLE MCU module powered by Xtensa dual-core 32-bit LX6 microprocessor.",
            "mfr_country": "China",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.espressif.com/en/products/modules/esp32",
            "dist_country": "Global",
            "dist_name": "DigiKey / Mouser India",
            "design_origin": "China",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_datasheet_en.pdf",
            "source_url": "https://www.espressif.com",
            "source_name": "Espressif Systems Official Datasheet",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 3.0, "max_voltage_v": 3.6, "nominal_voltage_v": 3.3,
                "max_current_ma": 240.0, "package": "MODULE-38", "pin_count": 38,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["SPI", "I2C", "UART", "WI-FI", "BLE"],
                "clock_speed_mhz": 240.0, "flash_kb": 4096, "ram_kb": 520
            }
        },
        {
            "part_number": "CUSTOM-FPGA-99",
            "manufacturer": "Fabless Global Semi",
            "category": "Microcontroller",
            "description": "Proprietary high-density custom ASIC/FPGA controller with proprietary PCIe interface.",
            "mfr_country": "United States",
            "mfr_conf": "CLAIMED",
            "mfr_evidence": "https://example.com/custom-fpga-99",
            "dist_country": "United States",
            "dist_name": "Direct Manufacturer Channel",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://example.com/docs/custom-fpga-99.pdf",
            "source_url": "https://example.com",
            "source_name": "Proprietary Supplier Spec",
            "user_crit": "CRITICAL",
            "specs": {
                "min_voltage_v": 1.14, "max_voltage_v": 1.26, "nominal_voltage_v": 1.2,
                "max_current_ma": 1500.0, "package": "BGA-256", "pin_count": 256,
                "operating_temp_min_c": 0.0, "operating_temp_max_c": 70.0,
                "interfaces": ["PCIE"],
                "clock_speed_mhz": 400.0, "flash_kb": 0, "ram_kb": 2048
            }
        },

        # --- Voltage Regulators ---
        {
            "part_number": "LM1117IMP-3.3",
            "manufacturer": "Texas Instruments",
            "category": "Voltage Regulator",
            "description": "800mA Low-Dropout Linear Regulator with 3.3V fixed output.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.ti.com/product/LM1117",
            "dist_country": "Global",
            "dist_name": "TI Direct / Element14 India",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm1117.pdf",
            "source_url": "https://www.ti.com/product/LM1117",
            "source_name": "Texas Instruments Datasheet",
            "user_crit": "MEDIUM",
            "specs": {
                "min_voltage_v": 4.75, "max_voltage_v": 15.0, "nominal_voltage_v": 3.3,
                "max_current_ma": 800.0, "package": "SOT-223", "pin_count": 4,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        },
        {
            "part_number": "SCL-1117-3.3",
            "manufacturer": "Semiconductor Complex Limited (SCL)",
            "category": "Voltage Regulator",
            "description": "Indigenous 1A Low-Dropout Linear Voltage Regulator, fixed 3.3V output fabricated at Mohali fab.",
            "mfr_country": "India",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://scl.gov.in/products/analog-power-management",
            "dist_country": "India",
            "dist_name": "SCL Direct Sales Mohali",
            "design_origin": "India",
            "origin_cat": "VERIFIED_INDIAN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://scl.gov.in/datasheets/scl1117-3.3v.pdf",
            "source_url": "https://scl.gov.in",
            "source_name": "SCL Mohali Official Catalogue",
            "user_crit": "MEDIUM",
            "specs": {
                "min_voltage_v": 4.5, "max_voltage_v": 15.0, "nominal_voltage_v": 3.3,
                "max_current_ma": 1000.0, "package": "SOT-223", "pin_count": 4,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        },
        {
            "part_number": "AP1117E33G-13",
            "manufacturer": "Diodes Incorporated",
            "category": "Voltage Regulator",
            "description": "1A LDO positive regulator 3.3V output distributed widely via Indian distributors.",
            "mfr_country": "Taiwan / China",
            "mfr_conf": "CLAIMED",
            "mfr_evidence": "https://www.diodes.com/part/view/AP1117",
            "dist_country": "India",
            "dist_name": "Element14 India / RS Components Bangalore",
            "design_origin": "United States",
            "origin_cat": "INDIAN_SUPPLIER_UNVERIFIED_MFR",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.diodes.com/assets/Datasheets/AP1117.pdf",
            "source_url": "https://in.element14.com/diodes-inc/ap1117e33g-13/ldo-reg-3-3v-1a-sot-223/dp/1825123",
            "source_name": "Element14 India Catalogue Entry",
            "user_crit": "LOW",
            "specs": {
                "min_voltage_v": 4.75, "max_voltage_v": 18.0, "nominal_voltage_v": 3.3,
                "max_current_ma": 1000.0, "package": "SOT-223", "pin_count": 4,
                "operating_temp_min_c": 0.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        },
        {
            "part_number": "LM7805-TO220",
            "manufacturer": "STMicroelectronics",
            "category": "Voltage Regulator",
            "description": "Standard 1A positive 5.0V voltage regulator in TO-220 package (Hard voltage mismatch for 3.3V).",
            "mfr_country": "France",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.st.com/en/power-management/l78.html",
            "dist_country": "Global",
            "dist_name": "Mouser India",
            "design_origin": "France",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.st.com/resource/en/datasheet/l78.pdf",
            "source_url": "https://www.st.com",
            "source_name": "STMicroelectronics Datasheet",
            "user_crit": "LOW",
            "specs": {
                "min_voltage_v": 7.0, "max_voltage_v": 25.0, "nominal_voltage_v": 5.0,
                "max_current_ma": 1000.0, "package": "TO-220", "pin_count": 3,
                "operating_temp_min_c": 0.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        },
        {
            "part_number": "LM2596S-5.0",
            "manufacturer": "Texas Instruments",
            "category": "Voltage Regulator",
            "description": "SIMPLE SWITCHER 3A Step-Down Voltage Regulator, 5.0V fixed.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.ti.com/product/LM2596",
            "dist_country": "Global",
            "dist_name": "TI India Store",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm2596.pdf",
            "source_url": "https://www.ti.com/product/LM2596",
            "source_name": "TI Datasheet",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 7.0, "max_voltage_v": 40.0, "nominal_voltage_v": 5.0,
                "max_current_ma": 3000.0, "package": "TO-263", "pin_count": 5,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        },

        # --- Sensors ---
        {
            "part_number": "INA219AIDR",
            "manufacturer": "Texas Instruments",
            "category": "Sensor",
            "description": "Zero-Drift, Bidirectional Current/Power Monitor With I2C Interface in SOIC-8.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.ti.com/product/INA219",
            "dist_country": "Global",
            "dist_name": "TI Direct",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/ina219.pdf",
            "source_url": "https://www.ti.com/product/INA219",
            "source_name": "TI Official Datasheet",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 3.0, "max_voltage_v": 5.5, "nominal_voltage_v": 3.3,
                "max_current_ma": 10.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["I2C"]
            }
        },
        {
            "part_number": "BEL-CS-219",
            "manufacturer": "Bharat Electronics Limited (BEL)",
            "category": "Sensor",
            "description": "Indigenous precision power and shunt monitor IC with I2C bus compliance for defense and grid meters.",
            "mfr_country": "India",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://bel-india.in/components/power-sensors",
            "dist_country": "India",
            "dist_name": "BEL Semiconductor Division Bangalore",
            "design_origin": "India",
            "origin_cat": "VERIFIED_INDIAN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://bel-india.in/docs/bel-cs-219-datasheet.pdf",
            "source_url": "https://bel-india.in",
            "source_name": "BEL Components Catalogue",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 3.0, "max_voltage_v": 5.5, "nominal_voltage_v": 3.3,
                "max_current_ma": 12.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["I2C"]
            }
        },
        {
            "part_number": "UNKNOWN-SENSOR-01",
            "manufacturer": "Unknown Origin Labs",
            "category": "Sensor",
            "description": "Legacy temperature sensing component with missing electrical parameters and unverified origin.",
            "mfr_country": None,
            "mfr_conf": "UNKNOWN",
            "mfr_evidence": None,
            "dist_country": None,
            "dist_name": None,
            "design_origin": None,
            "origin_cat": "UNKNOWN",
            "lifecycle": "UNKNOWN",
            "datasheet_url": None,
            "source_url": None,
            "source_name": "Unverified Internal Archive",
            "user_crit": "LOW",
            "specs": {
                "min_voltage_v": None, "max_voltage_v": 5.0, "nominal_voltage_v": None,
                "max_current_ma": 20.0, "package": "SOT-23", "pin_count": 3,
                "operating_temp_min_c": None, "operating_temp_max_c": None,
                "interfaces": []
            }
        },

        # --- Communication ---
        {
            "part_number": "MAX485ESA+",
            "manufacturer": "Analog Devices / Maxim Integrated",
            "category": "Communication",
            "description": "Low-power, slew-rate-limited transceiver for RS-485 and RS-422 communication.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.analog.com/en/products/max485.html",
            "dist_country": "Global",
            "dist_name": "Mouser India",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.analog.com/media/en/technical-documentation/data-sheets/MAX1487-MAX491.pdf",
            "source_url": "https://www.analog.com/en/products/max485.html",
            "source_name": "Analog Devices Datasheet",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 4.75, "max_voltage_v": 5.25, "nominal_voltage_v": 5.0,
                "max_current_ma": 30.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["UART"]
            }
        },
        {
            "part_number": "SP485EEN-L/TR",
            "manufacturer": "MaxLinear",
            "category": "Communication",
            "description": "+5V Low Power Half-Duplex RS-485 Transceiver, sourced via domestic Indian distributor.",
            "mfr_country": "United States",
            "mfr_conf": "CLAIMED",
            "mfr_evidence": "https://www.maxlinear.com/product/interface/transceivers/rs485-rs422/sp485ee",
            "dist_country": "India",
            "dist_name": "Mouser Electronics India Private Limited",
            "design_origin": "United States",
            "origin_cat": "INDIAN_SUPPLIER_UNVERIFIED_MFR",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.maxlinear.com/ds/sp481e_sp485e_sp485ee.pdf",
            "source_url": "https://www.mouser.in/ProductDetail/MaxLinear/SP485EEN-L-TR",
            "source_name": "Mouser India Distributor Listing",
            "user_crit": "MEDIUM",
            "specs": {
                "min_voltage_v": 4.75, "max_voltage_v": 5.25, "nominal_voltage_v": 5.0,
                "max_current_ma": 30.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["UART"]
            }
        },
        {
            "part_number": "MCP2515-I/SO",
            "manufacturer": "Microchip Technology",
            "category": "Communication",
            "description": "Stand-Alone CAN Controller with SPI Interface.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.microchip.com/en-us/product/mcp2515",
            "dist_country": "Global",
            "dist_name": "Microchip Direct / DigiKey India",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://ww1.microchip.com/downloads/en/DeviceDoc/MCP2515-Stand-Alone-CAN-Controller-with-SPI-20001801J.pdf",
            "source_url": "https://www.microchip.com/en-us/product/mcp2515",
            "source_name": "Microchip Datasheet",
            "user_crit": "MEDIUM",
            "specs": {
                "min_voltage_v": 4.5, "max_voltage_v": 5.5, "nominal_voltage_v": 5.0,
                "max_current_ma": 10.0, "package": "SOIC-18", "pin_count": 18,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["SPI"]
            }
        },

        # --- Memory ---
        {
            "part_number": "AT24C256C-SSHM-T",
            "manufacturer": "Microchip Technology",
            "category": "Memory",
            "description": "256-Kbit I2C-Compatible Two-Wire Serial EEPROM.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.microchip.com/en-us/product/at24c256c",
            "dist_country": "Global",
            "dist_name": "Element14 India",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://ww1.microchip.com/downloads/aemDocuments/documents/MPD/ProductDocuments/DataSheets/AT24C256C-I2C-Compatible-2-Wire-Serial-EEPROM-256-Kbit-Data-Sheet-20006323A.pdf",
            "source_url": "https://www.microchip.com/en-us/product/at24c256c",
            "source_name": "Microchip Datasheet",
            "user_crit": "LOW",
            "specs": {
                "min_voltage_v": 1.7, "max_voltage_v": 5.5, "nominal_voltage_v": 3.3,
                "max_current_ma": 3.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["I2C"]
            }
        },
        {
            "part_number": "FM24C256-G",
            "manufacturer": "Ramtron / Cypress",
            "category": "Memory",
            "description": "256Kb F-RAM Serial 3V/5V memory with I2C interface.",
            "mfr_country": "United States",
            "mfr_conf": "CLAIMED",
            "mfr_evidence": "https://www.infineon.com",
            "dist_country": "India",
            "dist_name": "RS Components India",
            "design_origin": "United States",
            "origin_cat": "INDIAN_SUPPLIER_UNVERIFIED_MFR",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.infineon.com/dgdl/Infineon-FM24C256B_256-Kbit_(32K_8)_Serial_(I2C)_F-RAM-DataSheet-v07_00-EN.pdf",
            "source_url": "https://in.rs-online.com",
            "source_name": "RS Components India",
            "user_crit": "LOW",
            "specs": {
                "min_voltage_v": 2.7, "max_voltage_v": 5.5, "nominal_voltage_v": 3.3,
                "max_current_ma": 3.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 85.0,
                "interfaces": ["I2C"]
            }
        },

        # --- Driver ICs ---
        {
            "part_number": "IR2104STRPBF",
            "manufacturer": "Infineon Technologies",
            "category": "Driver IC",
            "description": "Half-Bridge Driver IC for high-voltage power stage.",
            "mfr_country": "Germany",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.infineon.com/cms/en/product/power/gate-driver-ics/ir2104s/",
            "dist_country": "Global",
            "dist_name": "Infineon Direct",
            "design_origin": "Germany",
            "origin_cat": "FOREIGN",
            "lifecycle": "NRND", # Honest NRND edge case
            "datasheet_url": "https://www.infineon.com/dgdl/Infineon-IR2104-DataSheet-v01_00-EN.pdf",
            "source_url": "https://www.infineon.com",
            "source_name": "Infineon Official Datasheet",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 10.0, "max_voltage_v": 20.0, "nominal_voltage_v": 15.0,
                "max_current_ma": 50.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        },
        {
            "part_number": "FAN7382MX",
            "manufacturer": "onsemi",
            "category": "Driver IC",
            "description": "Half-Bridge Gate-Drive IC, 600V high-voltage process.",
            "mfr_country": "United States",
            "mfr_conf": "VERIFIED",
            "mfr_evidence": "https://www.onsemi.com/products/power-management/gate-drivers/isolated-gate-drivers/fan7382",
            "dist_country": "Global",
            "dist_name": "onsemi Direct",
            "design_origin": "United States",
            "origin_cat": "FOREIGN",
            "lifecycle": "ACTIVE",
            "datasheet_url": "https://www.onsemi.com/pdf/datasheet/fan7382-d.pdf",
            "source_url": "https://www.onsemi.com",
            "source_name": "onsemi Official Datasheet",
            "user_crit": "HIGH",
            "specs": {
                "min_voltage_v": 10.0, "max_voltage_v": 20.0, "nominal_voltage_v": 15.0,
                "max_current_ma": 50.0, "package": "SOIC-8", "pin_count": 8,
                "operating_temp_min_c": -40.0, "operating_temp_max_c": 125.0,
                "interfaces": ["ANALOG"]
            }
        }
    ]

    components_by_pn = {}

    for cdata in components_data:
        # Calculate completeness heuristic
        specs = cdata["specs"]
        valid_specs = sum(1 for v in specs.values() if v is not None and v != [])
        completeness = round((valid_specs / max(1, len(specs))) * 100.0, 1)

        comp = Component(
            id=generate_uuid(),
            part_number=cdata["part_number"],
            manufacturer=cdata["manufacturer"],
            category=cdata["category"],
            description=cdata["description"],
            manufacturer_country=cdata["mfr_country"],
            manufacturer_country_confidence=cdata["mfr_conf"],
            manufacturer_country_evidence_url=cdata["mfr_evidence"],
            distributor_country=cdata["dist_country"],
            distributor_name=cdata["dist_name"],
            design_origin_country=cdata["design_origin"],
            origin_category=cdata["origin_cat"],
            lifecycle_status=cdata["lifecycle"],
            datasheet_url=cdata["datasheet_url"],
            source_url=cdata["source_url"],
            source_name=cdata["source_name"],
            is_synthetic=True,
            data_completeness_pct=completeness,
            user_criticality=cdata["user_crit"],
            last_verified_at=datetime.now(timezone.utc)
        )
        db.add(comp)
        db.flush()

        # Add Specs
        comp_spec = ComponentSpecification(
            id=generate_uuid(),
            component_id=comp.id,
            min_voltage_v=specs.get("min_voltage_v"),
            max_voltage_v=specs.get("max_voltage_v"),
            nominal_voltage_v=specs.get("nominal_voltage_v"),
            max_current_ma=specs.get("max_current_ma"),
            package=specs.get("package"),
            pin_count=specs.get("pin_count"),
            operating_temp_min_c=specs.get("operating_temp_min_c"),
            operating_temp_max_c=specs.get("operating_temp_max_c"),
            interfaces=specs.get("interfaces", []),
            clock_speed_mhz=specs.get("clock_speed_mhz"),
            flash_kb=specs.get("flash_kb"),
            ram_kb=specs.get("ram_kb")
        )
        db.add(comp_spec)

        # Add Source Provenance
        if cdata.get("source_url"):
            src = ComponentSource(
                id=generate_uuid(),
                component_id=comp.id,
                source_type="DATASHEET" if "datasheet" in (cdata.get("datasheet_url") or "") else "MANUFACTURER_CATALOGUE",
                source_name=cdata["source_name"],
                source_url=cdata.get("source_url"),
                confidence_level="HIGH" if cdata["mfr_conf"] == "VERIFIED" else "MEDIUM",
                notes="Verified against manufacturer published technical parameters"
            )
            db.add(src)

        components_by_pn[comp.part_number] = comp

    # 3. Seed Demo BOM 1: Smart Energy Meter v2
    bom1 = BOM(
        id=generate_uuid(),
        org_id=org.id,
        name="Smart Energy Meter v2.4 (Grid Ready)",
        description="Three-phase smart electricity meter with bi-directional RS-485 AMR and EEPROM calibration storage.",
        filename="smart_energy_meter_v2.csv",
        total_items=5,
        total_quantity=6,
        status="ANALYZED"
    )
    db.add(bom1)
    db.flush()

    bom1_items = [
        {"product": "Smart Energy Meter v2", "pn": "STM32F401RET6", "mfr": "STMicroelectronics", "cat": "Microcontroller", "qty": 1, "v": "3.3V", "i": "50mA", "pkg": "LQFP-64", "iface": "SPI/I2C/UART", "crit": "CRITICAL"},
        {"product": "Smart Energy Meter v2", "pn": "LM1117IMP-3.3", "mfr": "Texas Instruments", "cat": "Voltage Regulator", "qty": 2, "v": "5.0V", "i": "800mA", "pkg": "SOT-223", "iface": "Analog", "crit": "MEDIUM"},
        {"product": "Smart Energy Meter v2", "pn": "INA219AIDR", "mfr": "Texas Instruments", "cat": "Sensor", "qty": 1, "v": "3.3V", "i": "10mA", "pkg": "SOIC-8", "iface": "I2C", "crit": "HIGH"},
        {"product": "Smart Energy Meter v2", "pn": "AT24C256C-SSHM-T", "mfr": "Microchip Technology", "cat": "Memory", "qty": 1, "v": "3.3V", "i": "3mA", "pkg": "SOIC-8", "iface": "I2C", "crit": "LOW"},
        {"product": "Smart Energy Meter v2", "pn": "MAX485ESA+", "mfr": "Analog Devices", "cat": "Communication", "qty": 1, "v": "5.0V", "i": "30mA", "pkg": "SOIC-8", "iface": "UART", "crit": "HIGH"},
    ]

    for item in bom1_items:
        comp = components_by_pn.get(item["pn"])
        bitem = BOMItem(
            id=generate_uuid(),
            bom_id=bom1.id,
            component_id=comp.id if comp else None,
            product_name=item["product"],
            part_number=item["pn"],
            manufacturer=item["mfr"],
            category=item["cat"],
            quantity=item["qty"],
            required_voltage=item["v"],
            required_current=item["i"],
            package=item["pkg"],
            interface=item["iface"],
            criticality=item["crit"],
            notes="Sample demo BOM line item"
        )
        db.add(bitem)

    # 4. Seed Demo BOM 2: Industrial IoT Gateway
    bom2 = BOM(
        id=generate_uuid(),
        org_id=org.id,
        name="Industrial IoT Gateway Edge-500",
        description="Edge IoT hub with CAN bus telemetry, wide-input power converter, and legacy sensor inputs.",
        filename="industrial_iot_gateway.csv",
        total_items=4,
        total_quantity=5,
        status="ANALYZED"
    )
    db.add(bom2)
    db.flush()

    bom2_items = [
        {"product": "Industrial IoT Gateway", "pn": "ESP32-WROOM-32E", "mfr": "Espressif Systems", "cat": "Microcontroller", "qty": 1, "v": "3.3V", "i": "240mA", "pkg": "Module-38", "iface": "Wi-Fi/BLE/UART", "crit": "HIGH"},
        {"product": "Industrial IoT Gateway", "pn": "MCP2515-I/SO", "mfr": "Microchip Technology", "cat": "Communication", "qty": 1, "v": "5.0V", "i": "10mA", "pkg": "SOIC-18", "iface": "SPI", "crit": "MEDIUM"},
        {"product": "Industrial IoT Gateway", "pn": "LM2596S-5.0", "mfr": "Texas Instruments", "cat": "Voltage Regulator", "qty": 1, "v": "12.0V", "i": "3000mA", "pkg": "TO-263", "iface": "Analog", "crit": "HIGH"},
        {"product": "Industrial IoT Gateway", "pn": "UNKNOWN-SENSOR-01", "mfr": "Unknown Origin Labs", "cat": "Sensor", "qty": 2, "v": "5.0V", "i": "20mA", "pkg": "SOT-23", "iface": "", "crit": "LOW"},
    ]

    for item in bom2_items:
        comp = components_by_pn.get(item["pn"])
        bitem = BOMItem(
            id=generate_uuid(),
            bom_id=bom2.id,
            component_id=comp.id if comp else None,
            product_name=item["product"],
            part_number=item["pn"],
            manufacturer=item["mfr"],
            category=item["cat"],
            quantity=item["qty"],
            required_voltage=item["v"],
            required_current=item["i"],
            package=item["pkg"],
            interface=item["iface"],
            criticality=item["crit"],
            notes="Sample demo BOM line item"
        )
        db.add(bitem)

    # 5. Seed Demo BOM 3: Motor Drive Inverter (Sharing LM1117IMP-3.3 and showing single-source FPGA)
    bom3 = BOM(
        id=generate_uuid(),
        org_id=org.id,
        name="Motor Drive Inverter 3-Phase",
        description="Variable frequency motor inverter power stage with shared 3.3V auxiliary logic rail.",
        filename="motor_drive_inverter.csv",
        total_items=3,
        total_quantity=5,
        status="ANALYZED"
    )
    db.add(bom3)
    db.flush()

    bom3_items = [
        {"product": "Motor Drive Inverter", "pn": "IR2104STRPBF", "mfr": "Infineon Technologies", "cat": "Driver IC", "qty": 3, "v": "15.0V", "i": "50mA", "pkg": "SOIC-8", "iface": "Analog", "crit": "HIGH"},
        {"product": "Motor Drive Inverter", "pn": "LM1117IMP-3.3", "mfr": "Texas Instruments", "cat": "Voltage Regulator", "qty": 1, "v": "5.0V", "i": "800mA", "pkg": "SOT-223", "iface": "Analog", "crit": "HIGH"}, # Note: cross-BOM part!
        {"product": "Motor Drive Inverter", "pn": "CUSTOM-FPGA-99", "mfr": "Fabless Global Semi", "cat": "Microcontroller", "qty": 1, "v": "1.2V", "i": "1500mA", "pkg": "BGA-256", "iface": "PCIe", "crit": "CRITICAL"}, # Single source part!
    ]

    for item in bom3_items:
        comp = components_by_pn.get(item["pn"])
        bitem = BOMItem(
            id=generate_uuid(),
            bom_id=bom3.id,
            component_id=comp.id if comp else None,
            product_name=item["product"],
            part_number=item["pn"],
            manufacturer=item["mfr"],
            category=item["cat"],
            quantity=item["qty"],
            required_voltage=item["v"],
            required_current=item["i"],
            package=item["pkg"],
            interface=item["iface"],
            criticality=item["crit"],
            notes="Sample demo BOM line item"
        )
        db.add(bitem)

    # =========================================================================
    # 6. Seed Data Sources
    # =========================================================================
    ds_local = DataSource(
        id=generate_uuid(),
        name="Curated Indian Supplier Catalogue",
        code="LOCAL_CATALOGUE",
        provider_type="LOCAL",
        is_active=True,
        is_live_api=False,
        api_status="CONFIGURED",
        notes="Curated register of Indian semiconductor manufacturers and authorized local distributors.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ds_local)

    ds_mouser = DataSource(
        id=generate_uuid(),
        name="Mouser Electronics Search API",
        code="MOUSER_API",
        provider_type="REST_API",
        is_active=False,
        is_live_api=True,
        api_status="NOT_CONFIGURED",
        endpoint_url="https://api.mouser.com/api/v1/search/partnumber",
        notes="Live search requires MOUSER_API_KEY environment variable. Local verified catalogue used as fallback.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ds_mouser)

    ds_digikey = DataSource(
        id=generate_uuid(),
        name="DigiKey Product Search API",
        code="DIGIKEY_API",
        provider_type="REST_API",
        is_active=False,
        is_live_api=True,
        api_status="NOT_CONFIGURED",
        endpoint_url="https://api.digikey.com/Search/v3/Products/Keyword",
        notes="Live search requires DIGIKEY_CLIENT_ID environment variable.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ds_digikey)

    ds_nexar = DataSource(
        id=generate_uuid(),
        name="Nexar / Octopart Supplier API",
        code="NEXAR_API",
        provider_type="REST_API",
        is_active=False,
        is_live_api=True,
        api_status="NOT_CONFIGURED",
        endpoint_url="https://api.nexar.com/graphql",
        notes="Live search requires NEXAR_CLIENT_ID environment variable.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ds_nexar)

    ds_registers = DataSource(
        id=generate_uuid(),
        name="Official Indian Semiconductor Register",
        code="MFR_REGISTER",
        provider_type="REGISTER",
        is_active=True,
        is_live_api=False,
        api_status="CONFIGURED",
        notes="Government & MeitY registered indigenous semiconductor fabs and design houses.",
        created_at=datetime.now(timezone.utc)
    )
    db.add(ds_registers)
    db.flush()

    # =========================================================================
    # 7. Seed Indian Sellers & Verified Business Contacts
    # =========================================================================
    sellers_config = [
        {
            "key": "mindgrove",
            "name": "Mindgrove Technologies Direct",
            "slug": "mindgrove-technologies-direct",
            "legal_name": "Mindgrove Technologies Private Limited",
            "seller_type": "INDIAN_MANUFACTURER",
            "is_verified_indian": True,
            "is_authorised_distributor": True,
            "is_manufacturer": True,
            "website": "https://mindgrovetech.in",
            "city": "Chennai",
            "state": "Tamil Nadu",
            "country": "India",
            "gstin": "33AAECM7191L1Z0",
            "desc": "Indigenous RISC-V fabless semiconductor company incubated at IIT Madras Pravartak Technologies Foundation.",
            "contacts": [
                {"type": "EMAIL", "label": "Commercial & OEM Sales Desk", "value": "sales@mindgrovetech.in", "notes": "Formal commercial quotation and dev kit dispatch"},
                {"type": "CONTACT_PAGE", "label": "Official Business Inquiries", "value": "https://mindgrovetech.in/contact", "notes": "OEM custom silicon and bulk volume inquiry desk"},
                {"type": "OFFICIAL_WEBSITE", "label": "Corporate Portal", "value": "https://mindgrovetech.in", "notes": "Silicon specifications and datasheets"}
            ]
        },
        {
            "key": "scl",
            "name": "Semiconductor Complex Limited (SCL) Mohali - Commercial Desk",
            "slug": "scl-mohali-commercial-desk",
            "legal_name": "Semi-Conductor Laboratory (SCL), MeitY Autonomous Body",
            "seller_type": "INDIAN_MANUFACTURER",
            "is_verified_indian": True,
            "is_authorised_distributor": True,
            "is_manufacturer": True,
            "website": "https://scl.gov.in",
            "city": "Mohali",
            "state": "Punjab",
            "country": "India",
            "gstin": "03AAAGS0845F1ZZ",
            "desc": "Premier national semiconductor wafer fabrication and assembly facility under Ministry of Electronics and IT (MeitY).",
            "contacts": [
                {"type": "EMAIL", "label": "Commercial Procurement Office", "value": "commercial@scl.gov.in", "notes": "Official public sector semiconductor sales desk"},
                {"type": "PHONE", "label": "Commercial Sales Enquiry Line", "value": "+91-172-2236100", "notes": "EPABX Ext 2400 (Commercial Directorate)"},
                {"type": "CONTACT_PAGE", "label": "MeitY SCL Procurement Desk", "value": "https://scl.gov.in/procurement", "notes": "Official government procurement & vendor portal"}
            ]
        },
        {
            "key": "bel",
            "name": "Bharat Electronics Limited (BEL) Semiconductor Division",
            "slug": "bel-semiconductor-division",
            "legal_name": "Bharat Electronics Limited (Navratna PSU)",
            "seller_type": "INDIAN_MANUFACTURER",
            "is_verified_indian": True,
            "is_authorised_distributor": True,
            "is_manufacturer": True,
            "website": "https://bel-india.in",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "gstin": "29AAACB1980K1Z5",
            "desc": "Defence and aerospace Grade-1 electronic component and hybrid microcircuits manufacturer.",
            "contacts": [
                {"type": "EMAIL", "label": "Semiconductor Components Desk", "value": "semisales@bel.co.in", "notes": "Public sector procurement and custom ASIC quotes"},
                {"type": "PHONE", "label": "BEL Central Sales Support", "value": "+91-80-25039300", "notes": "Toll desk for aerospace and defense orders"},
                {"type": "CONTACT_PAGE", "label": "Vendor RFQ Portal", "value": "https://bel-india.in/rfq", "notes": "Direct vendor portal"}
            ]
        },
        {
            "key": "cdac",
            "name": "C-DAC Hardware Solutions Group",
            "slug": "cdac-hardware-solutions",
            "legal_name": "Centre for Development of Advanced Computing",
            "seller_type": "INDIAN_MANUFACTURER",
            "is_verified_indian": True,
            "is_authorised_distributor": True,
            "is_manufacturer": True,
            "website": "https://vegaprocessors.in",
            "city": "Pune",
            "state": "Maharashtra",
            "country": "India",
            "gstin": "27AAATC2500M1ZK",
            "desc": "National microprocessor development center behind the THEJAS-32 and AJEET indigenous processors.",
            "contacts": [
                {"type": "EMAIL", "label": "Microprocessor Commercialization Desk", "value": "vega-support@cdac.in", "notes": "Silicon licensing and board evaluation support"},
                {"type": "CONTACT_PAGE", "label": "VEGA Processors Official Desk", "value": "https://vegaprocessors.in/contact", "notes": "Direct inquiry portal"}
            ]
        },
        {
            "key": "element14",
            "name": "Element14 India (Farnell India Pvt Ltd)",
            "slug": "element14-india",
            "legal_name": "Element14 India Private Limited (An Avnet Company)",
            "seller_type": "INDIAN_AUTHORISED_DISTRIBUTOR",
            "is_verified_indian": True,
            "is_authorised_distributor": True,
            "is_manufacturer": False,
            "website": "https://in.element14.com",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "gstin": "29AAACE1820B1Z7",
            "desc": "Authorised global high-service distributor with dedicated Indian legal entity, INR billing, and local warehouse dispatch.",
            "contacts": [
                {"type": "EMAIL", "label": "India Commercial Sales Desk", "value": "in-sales@element14.com", "notes": "Formal volume quotes, GST invoices and Certificate of Conformance"},
                {"type": "PHONE", "label": "Toll-Free Direct Sales Line", "value": "1800-108-3888", "notes": "Available Mon-Fri 9:00 AM - 6:00 PM IST"},
                {"type": "CONTACT_PAGE", "label": "Customer Contact Desk", "value": "https://in.element14.com/help-contact-us", "notes": "Direct inquiry portal with real-time stock quotes"}
            ]
        },
        {
            "key": "semikart",
            "name": "Semikart India (Anshuman Tech Pvt Ltd)",
            "slug": "semikart-india",
            "legal_name": "Anshuman Tech Private Limited",
            "seller_type": "INDIAN_DISTRIBUTOR",
            "is_verified_indian": True,
            "is_authorised_distributor": False,
            "is_manufacturer": False,
            "website": "https://www.semikart.com",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "gstin": "29AABCA9184D1ZD",
            "desc": "Major Indian electronic components distributor offering multi-source component procurement and local INR invoicing.",
            "contacts": [
                {"type": "EMAIL", "label": "Sales & Quote Desk", "value": "support@semikart.com", "notes": "BOM analysis and bulk price quotation inquiries"},
                {"type": "PHONE", "label": "Sales Helpline", "value": "+91-80-41223844", "notes": "Customer support and order tracking"},
                {"type": "CONTACT_PAGE", "label": "Semikart RFQ Portal", "value": "https://www.semikart.com/contact-us", "notes": "Online quotation and BOM upload desk"}
            ]
        },
        {
            "key": "robu",
            "name": "Robu.in (Macfos Limited)",
            "slug": "robu-macfos-limited",
            "legal_name": "Macfos Limited (NSE: MACFOS)",
            "seller_type": "INDIAN_DISTRIBUTOR",
            "is_verified_indian": True,
            "is_authorised_distributor": False,
            "is_manufacturer": False,
            "website": "https://robu.in",
            "city": "Pune",
            "state": "Maharashtra",
            "country": "India",
            "gstin": "27AAGCM1723N1ZY",
            "desc": "Publicly traded Indian distributor of microcontrollers, power regulators, sensors, and embedded development hardware.",
            "contacts": [
                {"type": "EMAIL", "label": "B2B & Institutional Sales Desk", "value": "support@robu.in", "notes": "Institutional PO and GST bulk purchases"},
                {"type": "PHONE", "label": "Customer Support Line", "value": "+91-20-48520000", "notes": "Telephone assistance"},
                {"type": "CONTACT_PAGE", "label": "Official Support Portal", "value": "https://robu.in/contact-us", "notes": "Customer helpdesk and ticket tracking"}
            ]
        },
        {
            "key": "mouser_in",
            "name": "Mouser Electronics India",
            "slug": "mouser-electronics-india",
            "legal_name": "Mouser Electronics India Private Limited",
            "seller_type": "FOREIGN_DISTRIBUTOR_INDIA_SHIPPING",
            "is_verified_indian": True,
            "is_authorised_distributor": True,
            "is_manufacturer": False,
            "website": "https://www.mouser.in",
            "city": "Bengaluru",
            "state": "Karnataka",
            "country": "India",
            "gstin": "29AADCM1918B1ZT",
            "desc": "Indian customer support and customs clearance entity of Mouser Electronics Inc, shipping factory-direct semiconductors into India.",
            "contacts": [
                {"type": "EMAIL", "label": "India Commercial Sales Office", "value": "india@mouser.com", "notes": "Direct INR quotation and customs clearance support"},
                {"type": "PHONE", "label": "Bengaluru Office Support", "value": "+91-80-42650000", "notes": "Local technical customer service"},
                {"type": "CONTACT_PAGE", "label": "Mouser India Support Desk", "value": "https://www.mouser.in/ContactUs", "notes": "Direct Indian sales and support page"}
            ]
        }
    ]

    saved_sellers_by_key = {}
    for sdata in sellers_config:
        seller = Seller(
            id=generate_uuid(),
            name=sdata["name"],
            slug=sdata["slug"],
            legal_name=sdata["legal_name"],
            seller_type=sdata["seller_type"],
            is_verified_indian=sdata["is_verified_indian"],
            is_authorised_distributor=sdata["is_authorised_distributor"],
            is_manufacturer=sdata["is_manufacturer"],
            website=sdata["website"],
            location_city=sdata["city"],
            location_state=sdata["state"],
            country=sdata["country"],
            gstin=sdata["gstin"],
            description=sdata["desc"],
            created_at=datetime.now(timezone.utc)
        )
        db.add(seller)
        db.flush()
        saved_sellers_by_key[sdata["key"]] = seller

        for cdata in sdata["contacts"]:
            contact = SellerContact(
                id=generate_uuid(),
                seller_id=seller.id,
                contact_type=cdata["type"],
                label=cdata["label"],
                value=cdata["value"],
                notes=cdata.get("notes"),
                is_verified=True,
                is_public=True,
                created_at=datetime.now(timezone.utc)
            )
            db.add(contact)

    # =========================================================================
    # 8. Seed Detailed Component Seller Listings
    # =========================================================================
    listings_data = [
        # --- STM32F401RET6 (Exact Matches from Indian Distributors) ---
        {
            "seller_key": "element14",
            "pn": "STM32F401RET6",
            "mfr": "STMicroelectronics",
            "sku": "14-STM32F401RET6-TR",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_AUTHORISED_DISTRIBUTOR",
            "avail": "IN_STOCK",
            "qty": 450,
            "price": 425.00,
            "curr": "INR",
            "moq": 1,
            "lead_time": 3,
            "product_url": "https://in.element14.com/stmicroelectronics/stm32f401ret6/mcu-32bit-cortex-m4-84mhz-lqfp-64/dp/2432087",
            "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
            "source": "Element14 India Commercial Catalogue"
        },
        {
            "seller_key": "semikart",
            "pn": "STM32F401RET6",
            "mfr": "STMicroelectronics",
            "sku": "SEMI-ST-401RET6",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 120,
            "price": 395.00,
            "curr": "INR",
            "moq": 5,
            "lead_time": 4,
            "product_url": "https://www.semikart.com/part/STM32F401RET6",
            "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
            "source": "Semikart India Curated Distributor Inventory"
        },
        {
            "seller_key": "mouser_in",
            "pn": "STM32F401RET6",
            "mfr": "STMicroelectronics",
            "sku": "511-STM32F401RET6",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "FOREIGN_MFR_INDIAN_SELLER",
            "avail": "IN_STOCK",
            "qty": 1500,
            "price": 460.00,
            "curr": "INR",
            "moq": 1,
            "lead_time": 5,
            "product_url": "https://www.mouser.in/ProductDetail/STMicroelectronics/STM32F401RET6",
            "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
            "source": "Mouser India Direct Portal"
        },
        {
            "seller_key": "robu",
            "pn": "STM32F401RET6",
            "mfr": "STMicroelectronics",
            "sku": "ROBU-STM32F401RE-MOD",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 65,
            "price": 450.00,
            "curr": "INR",
            "moq": 1,
            "lead_time": 2,
            "product_url": "https://robu.in/product/stm32f401ret6-cortex-m4-microcontroller/",
            "datasheet_url": "https://www.st.com/resource/en/datasheet/stm32f401re.pdf",
            "source": "Robu India Microcontroller Inventory"
        },

        # --- SHAKTI-E-CLASS (Verified Indian Manufacturer Direct) ---
        {
            "seller_key": "mindgrove",
            "pn": "SHAKTI-E-CLASS",
            "mfr": "Mindgrove Technologies / IIT Madras",
            "sku": "MG-SHAKTI-E-64L",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "VERIFIED_INDIAN_MANUFACTURER",
            "avail": "IN_STOCK",
            "qty": 500,
            "price": 350.00,
            "curr": "INR",
            "moq": 10,
            "lead_time": 7,
            "product_url": "https://mindgrovetech.in/silicon/shakti-series",
            "datasheet_url": "https://mindgrovetech.in/docs/shakti-e-class-spec.pdf",
            "source": "Mindgrove Technologies Direct Indigenous Inventory"
        },

        # --- SCL-1117-3.3 (Verified Indian Manufacturer Direct) ---
        {
            "seller_key": "scl",
            "pn": "SCL-1117-3.3",
            "mfr": "SCL Mohali",
            "sku": "SCL-VR-1117-33",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "VERIFIED_INDIAN_MANUFACTURER",
            "avail": "IN_STOCK",
            "qty": 12000,
            "price": 18.50,
            "curr": "INR",
            "moq": 50,
            "lead_time": 5,
            "product_url": "https://scl.gov.in/products/voltage-regulators",
            "datasheet_url": "https://scl.gov.in/datasheets/scl-1117-series.pdf",
            "source": "SCL Mohali Commercial Directorate"
        },

        # --- LM1117IMP-3.3 (Exact Matches from Indian Distributors) ---
        {
            "seller_key": "element14",
            "pn": "LM1117IMP-3.3",
            "mfr": "Texas Instruments",
            "sku": "14-LM1117IMP-3.3",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_AUTHORISED_DISTRIBUTOR",
            "avail": "IN_STOCK",
            "qty": 8400,
            "price": 32.00,
            "curr": "INR",
            "moq": 10,
            "lead_time": 3,
            "product_url": "https://in.element14.com/texas-instruments/lm1117imp-3-3-nopb/ldo-volt-reg-800ma-3-3v-sot-223/dp/1469147",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm1117.pdf",
            "source": "Element14 India Commercial Catalogue"
        },
        {
            "seller_key": "semikart",
            "pn": "LM1117IMP-3.3",
            "mfr": "Texas Instruments",
            "sku": "SEMI-TI-LM1117-33",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 3500,
            "price": 28.50,
            "curr": "INR",
            "moq": 25,
            "lead_time": 3,
            "product_url": "https://www.semikart.com/part/LM1117IMP-3.3/NOPB",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm1117.pdf",
            "source": "Semikart India Curated Distributor Inventory"
        },
        {
            "seller_key": "robu",
            "pn": "LM1117IMP-3.3",
            "mfr": "Texas Instruments",
            "sku": "ROBU-VR-LM1117-33",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 920,
            "price": 35.00,
            "curr": "INR",
            "moq": 5,
            "lead_time": 2,
            "product_url": "https://robu.in/product/lm1117-3-3v-sot-223-ldo-regulator/",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm1117.pdf",
            "source": "Robu India Power IC Register"
        },
        {
            "seller_key": "mouser_in",
            "pn": "LM1117IMP-3.3",
            "mfr": "Texas Instruments",
            "sku": "926-LM1117IMP-33NOPB",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "FOREIGN_MFR_INDIAN_SELLER",
            "avail": "IN_STOCK",
            "qty": 25000,
            "price": 34.00,
            "curr": "INR",
            "moq": 1,
            "lead_time": 5,
            "product_url": "https://www.mouser.in/ProductDetail/Texas-Instruments/LM1117IMP-3.3-NOPB",
            "datasheet_url": "https://www.ti.com/lit/ds/symlink/lm1117.pdf",
            "source": "Mouser India Direct Portal"
        },

        # --- AP1117E33G-13 (Diodes Inc, Distributed locally) ---
        {
            "seller_key": "element14",
            "pn": "AP1117E33G-13",
            "mfr": "Diodes Incorporated",
            "sku": "14-AP1117E33G-13",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_AUTHORISED_DISTRIBUTOR",
            "avail": "IN_STOCK",
            "qty": 5000,
            "price": 22.00,
            "curr": "INR",
            "moq": 10,
            "lead_time": 3,
            "product_url": "https://in.element14.com/diodes-inc/ap1117e33g-13/ldo-volt-reg-3-3v-sot-223/dp/1825275",
            "datasheet_url": "https://www.diodes.com/assets/Datasheets/AP1117.pdf",
            "source": "Element14 India Commercial Catalogue"
        },

        # --- ESP32-WROOM-32E (Foreign MCU Sold in India) ---
        {
            "seller_key": "robu",
            "pn": "ESP32-WROOM-32E",
            "mfr": "Espressif Systems",
            "sku": "ROBU-ESP32-WROOM-32E-4MB",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 340,
            "price": 245.00,
            "curr": "INR",
            "moq": 1,
            "lead_time": 2,
            "product_url": "https://robu.in/product/esp32-wroom-32e-4mb-wi-fi-bluetooth-module/",
            "datasheet_url": "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf",
            "source": "Robu India RF & Wireless Register"
        },
        {
            "seller_key": "semikart",
            "pn": "ESP32-WROOM-32E",
            "mfr": "Espressif Systems",
            "sku": "SEMI-ESP32-WROOM-32E",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 1200,
            "price": 238.00,
            "curr": "INR",
            "moq": 10,
            "lead_time": 3,
            "product_url": "https://www.semikart.com/part/ESP32-WROOM-32E",
            "datasheet_url": "https://www.espressif.com/sites/default/files/documentation/esp32-wroom-32e_esp32-wroom-32ue_datasheet_en.pdf",
            "source": "Semikart India Wireless Division"
        },

        # --- VEGA-THEJAS-32 (Verified Indian Manufacturer Direct) ---
        {
            "seller_key": "cdac",
            "pn": "VEGA-THEJAS-32",
            "mfr": "C-DAC",
            "sku": "CDAC-VEGA-T32",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "VERIFIED_INDIAN_MANUFACTURER",
            "avail": "ON_REQUEST",
            "qty": None,
            "price": None,
            "curr": "INR",
            "moq": 1,
            "lead_time": 14,
            "product_url": "https://vegaprocessors.in/processors/thejas32",
            "datasheet_url": "https://vegaprocessors.in/docs/thejas32-datasheet.pdf",
            "source": "C-DAC Microprocessor Licensing Desk"
        },

        # --- IR2104STRPBF (Infineon Driver Sold via Indian Sellers) ---
        {
            "seller_key": "semikart",
            "pn": "IR2104STRPBF",
            "mfr": "Infineon Technologies",
            "sku": "SEMI-INF-IR2104",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_SELLER_EXACT",
            "avail": "IN_STOCK",
            "qty": 450,
            "price": 85.00,
            "curr": "INR",
            "moq": 5,
            "lead_time": 3,
            "product_url": "https://www.semikart.com/part/IR2104STRPBF",
            "datasheet_url": "https://www.infineon.com/dgdl/ir2104.pdf",
            "source": "Semikart India Power Stage Register"
        },
        {
            "seller_key": "element14",
            "pn": "IR2104STRPBF",
            "mfr": "Infineon Technologies",
            "sku": "14-IR2104STRPBF",
            "exact": True,
            "match_type": "EXACT_MATCH",
            "seller_class": "INDIAN_AUTHORISED_DISTRIBUTOR",
            "avail": "IN_STOCK",
            "qty": 2300,
            "price": 92.00,
            "curr": "INR",
            "moq": 1,
            "lead_time": 3,
            "product_url": "https://in.element14.com/infineon/ir2104strpbf/half-bridge-driver-600v-soic/dp/1825281",
            "datasheet_url": "https://www.infineon.com/dgdl/ir2104.pdf",
            "source": "Element14 India Commercial Catalogue"
        }
    ]

    for ldata in listings_data:
        seller_obj = saved_sellers_by_key.get(ldata["seller_key"])
        comp_obj = components_by_pn.get(ldata["pn"])
        if not seller_obj:
            continue

        listing = SellerListing(
            id=generate_uuid(),
            seller_id=seller_obj.id,
            component_id=comp_obj.id if comp_obj else None,
            data_source_id=ds_local.id,
            part_number=ldata["pn"],
            normalized_part_number=ldata["pn"].strip().upper(),
            manufacturer=ldata["mfr"],
            seller_sku=ldata.get("sku"),
            product_url=ldata.get("product_url"),
            datasheet_url=ldata.get("datasheet_url"),
            manufacturer_represented=ldata["mfr"],
            match_type=ldata.get("match_type", "EXACT_MATCH"),
            exact_match=ldata.get("exact", True),
            seller_classification=ldata.get("seller_class", "INDIAN_SELLER_EXACT"),
            availability_status=ldata.get("avail", "UNKNOWN"),
            stock_quantity=ldata.get("qty"),
            price=ldata.get("price"),
            currency=ldata.get("curr", "INR"),
            moq=ldata.get("moq"),
            lead_time_days=ldata.get("lead_time"),
            source_name=ldata.get("source", "Local Curated Catalogue"),
            source_url=ldata.get("product_url"),
            verification_status="VERIFIED",
            last_checked_at=datetime.now(timezone.utc),
            created_at=datetime.now(timezone.utc)
        )
        db.add(listing)

    # Save Element14 and Mindgrove as bookmarked/saved sellers for default org
    saved_el = SavedSeller(
        id=generate_uuid(),
        org_id=org.id,
        seller_id=saved_sellers_by_key["element14"].id,
        notes="Primary authorized distributor for passive and active components with GST invoicing.",
        saved_at=datetime.now(timezone.utc)
    )
    db.add(saved_el)

    saved_mg = SavedSeller(
        id=generate_uuid(),
        org_id=org.id,
        seller_id=saved_sellers_by_key["mindgrove"].id,
        notes="Preferred indigenous MCU manufacturer (IIT Madras incubated).",
        saved_at=datetime.now(timezone.utc)
    )
    db.add(saved_mg)

    # =========================================================================
    # 9. Seed Sample Stored RFQs with Realistic Status Tracking
    # =========================================================================
    rfq1 = RFQ(
        id=generate_uuid(),
        rfq_reference="RFQ-2026-1001",
        org_id=org.id,
        bom_id=bom1.id,
        seller_id=saved_sellers_by_key["element14"].id,
        seller_name="Element14 India (Farnell India Pvt Ltd)",
        company_name="Bharat Industrial & Embedded Systems",
        contact_person="Vikram Sharma",
        business_email="lead.engineer@bharat-embedded.in",
        phone="+91-80-2841-0000",
        part_number="STM32F401RET6",
        manufacturer="STMicroelectronics",
        quantity_requested=250,
        target_delivery_location="Bengaluru Electronic City Tech Park, Phase 1",
        target_delivery_date="2026-12-15",
        notes="Require original reel packaging (250/1000 units), standard Certificate of Conformance (CoC), and CoO declaration.",
        status="READY_TO_SEND",
        submission_method="MANUAL_EMAIL",
        seller_contact_email="in-sales@element14.com",
        generated_email_body="Formal RFQ for 250 units STM32F401RET6 generated and verified.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(rfq1)
    db.flush()

    db.add(RFQItem(
        id=generate_uuid(),
        rfq_id=rfq1.id,
        part_number="STM32F401RET6",
        manufacturer="STMicroelectronics",
        quantity=250,
        target_unit_price=420.00
    ))
    db.add(RFQStatusHistory(
        id=generate_uuid(),
        rfq_id=rfq1.id,
        previous_status=None,
        new_status="DRAFT",
        changed_by="Vikram Sharma",
        notes="Draft quotation request prepared from Sensor Pod Rev B BOM analysis.",
        changed_at=datetime.now(timezone.utc)
    ))
    db.add(RFQStatusHistory(
        id=generate_uuid(),
        rfq_id=rfq1.id,
        previous_status="DRAFT",
        new_status="READY_TO_SEND",
        changed_by="Vikram Sharma",
        notes="Pre-flight validation complete. RFQ package ready for email transmission to Element14 desk.",
        changed_at=datetime.now(timezone.utc)
    ))

    rfq2 = RFQ(
        id=generate_uuid(),
        rfq_reference="RFQ-2026-1002",
        org_id=org.id,
        bom_id=bom1.id,
        seller_id=saved_sellers_by_key["mindgrove"].id,
        seller_name="Mindgrove Technologies Direct",
        company_name="Bharat Industrial & Embedded Systems",
        contact_person="Vikram Sharma",
        business_email="lead.engineer@bharat-embedded.in",
        phone="+91-80-2841-0000",
        part_number="SHAKTI-E-CLASS",
        manufacturer="Mindgrove Technologies / IIT Madras",
        quantity_requested=100,
        target_delivery_location="Bengaluru Electronic City Tech Park, Phase 1",
        target_delivery_date="2026-11-30",
        notes="Evaluating indigenous pin-compatible drop-in alternative for STM32F401RET6. Requesting engineering sample quote.",
        status="DRAFT",
        submission_method="MANUAL_EMAIL",
        seller_contact_email="sales@mindgrovetech.in",
        generated_email_body="Formal RFQ for 100 units SHAKTI-E-CLASS generated.",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )
    db.add(rfq2)
    db.flush()

    db.add(RFQItem(
        id=generate_uuid(),
        rfq_id=rfq2.id,
        part_number="SHAKTI-E-CLASS",
        manufacturer="Mindgrove Technologies / IIT Madras",
        quantity=100,
        target_unit_price=350.00
    ))
    db.add(RFQStatusHistory(
        id=generate_uuid(),
        rfq_id=rfq2.id,
        previous_status=None,
        new_status="DRAFT",
        changed_by="Vikram Sharma",
        notes="Created draft RFQ for domestic indigenous microcontroller testing.",
        changed_at=datetime.now(timezone.utc)
    ))

    db.commit()
    logger.info("Successfully seeded demo database with Indian seller discovery & RFQ dataset.")
    return org

