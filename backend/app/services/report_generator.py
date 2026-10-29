import os
import io
import csv
from datetime import datetime, timezone
from typing import Dict, Any, List
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from ..services.bom_parser import sanitize_csv_formula

def generate_csv_report(data: Dict[str, Any]) -> str:
    """Generates a formula-safe CSV audit report."""
    output = io.StringIO()
    writer = csv.writer(output)

    # Header block
    writer.writerow(["INDIGENOUS COMPONENT DEPENDENCY & ALTERNATIVE INTELLIGENCE REPORT"])
    writer.writerow(["Generated At", sanitize_csv_formula(datetime.now(timezone.utc).isoformat())])
    writer.writerow(["Workspace", sanitize_csv_formula(data.get("organisation_name", "Default Workspace"))])
    writer.writerow(["BOM Name", sanitize_csv_formula(data.get("bom_name", "All Components Catalogue"))])
    writer.writerow([])

    # Disclaimer
    writer.writerow(["SAFETY DISCLAIMER: This report provides automated heuristic decision-support. MANDATORY human engineering verification is required before any component substitution is implemented in a physical production assembly."])
    writer.writerow([])

    # Summary Counts
    writer.writerow(["--- METRIC SUMMARY ---"])
    writer.writerow(["Total Components Analyzed", data.get("total_components", 0)])
    writer.writerow(["Critical Components", data.get("critical_count", 0)])
    writer.writerow(["Verified Indian Manufacturer", data.get("verified_indian_count", 0)])
    writer.writerow(["Domestic Supplier (Unverified Mfr)", data.get("indian_supplier_count", 0)])
    writer.writerow(["Foreign Manufacturer", data.get("foreign_count", 0)])
    writer.writerow(["Unknown Origin", data.get("unknown_origin_count", 0)])
    writer.writerow([])

    # Table of Components & Alternatives
    writer.writerow(["--- COMPONENT AUDIT & ALTERNATIVE FINDINGS ---"])
    writer.writerow([
        "Part Number",
        "Manufacturer",
        "Category",
        "Origin Classification",
        "Manufacturer Country",
        "Criticality",
        "Lifecycle",
        "Top Alternative Part",
        "Top Alternative Mfr",
        "Alternative Origin",
        "Compatibility Status",
        "Heuristic Score (%)",
        "Matching Specs",
        "Missing / Unknown Specs",
        "Datasheet / Source URL",
        "Last Verified"
    ])

    for comp in data.get("components", []):
        top_alt = comp.get("top_alternative") or {}
        writer.writerow([
            sanitize_csv_formula(comp.get("part_number")),
            sanitize_csv_formula(comp.get("manufacturer")),
            sanitize_csv_formula(comp.get("category")),
            sanitize_csv_formula(comp.get("origin_category")),
            sanitize_csv_formula(comp.get("manufacturer_country") or "UNKNOWN"),
            sanitize_csv_formula(comp.get("criticality") or "MEDIUM"),
            sanitize_csv_formula(comp.get("lifecycle_status")),
            sanitize_csv_formula(top_alt.get("part_number") or "None Available"),
            sanitize_csv_formula(top_alt.get("manufacturer") or "N/A"),
            sanitize_csv_formula(top_alt.get("origin_label") or "N/A"),
            sanitize_csv_formula(top_alt.get("compatibility_status") or "N/A"),
            top_alt.get("heuristic_score", 0.0),
            top_alt.get("matches_count", 0),
            top_alt.get("unknowns_count", 0),
            sanitize_csv_formula(comp.get("source_url") or comp.get("datasheet_url") or "None"),
            sanitize_csv_formula(comp.get("last_verified_at") or "Unknown")
        ])

    return output.getvalue()


def generate_pdf_report(data: Dict[str, Any], output_path: str):
    """
    Generates a professional, polished PDF engineering report using ReportLab.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom engineering styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0f172a") # Navy
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569")
    )

    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor("#0f766e"), # Teal accent
        spaceBefore=12,
        spaceAfter=6
    )

    disclaimer_style = ParagraphStyle(
        'Disclaimer',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#9a3412") # Amber-red
    )

    cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10
    )

    cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=cell_style,
        fontName='Helvetica-Bold'
    )

    story = []

    # Title & Metadata
    story.append(Paragraph("INDIGENOUS COMPONENT DEPENDENCY & ALTERNATIVE INTELLIGENCE", title_style))
    story.append(Paragraph("Automated Bill of Materials Sourcing Risk & Technical Replacement Assessment", subtitle_style))
    story.append(Spacer(1, 10))

    # Mandatory Engineering Disclaimer Box
    disclaimer_text = (
        "<b>MANDATORY ENGINEERING SAFETY NOTICE:</b> This report contains heuristic decision-support estimates. "
        "Calculated risk levels and compatibility scores are algorithmic indicators, not certified empirical guarantees. "
        "A qualified electronics hardware engineer must verify schematic pinout, dynamic timing parameters, firmware registers, "
        "and physical thermal footprints before any component substitution is deployed in production hardware."
    )
    disclaimer_table = Table([[Paragraph(disclaimer_text, disclaimer_style)]], colWidths=[540])
    disclaimer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fef3c7")),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor("#f59e0b")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(disclaimer_table)
    story.append(Spacer(1, 12))

    # Executive Summary Table
    meta_data = [
        [
            Paragraph("<b>Workspace:</b>", cell_bold), Paragraph(str(data.get("organisation_name", "Demo Workspace")), cell_style),
            Paragraph("<b>Generated:</b>", cell_bold), Paragraph(datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), cell_style)
        ],
        [
            Paragraph("<b>Target BOM:</b>", cell_bold), Paragraph(str(data.get("bom_name", "Master Catalogue")), cell_style),
            Paragraph("<b>Total Parts:</b>", cell_bold), Paragraph(str(data.get("total_components", 0)), cell_style)
        ],
        [
            Paragraph("<b>Critical Parts:</b>", cell_bold), Paragraph(str(data.get("critical_count", 0)), cell_style),
            Paragraph("<b>Verified Indian Mfr:</b>", cell_bold), Paragraph(str(data.get("verified_indian_count", 0)), cell_style)
        ],
        [
            Paragraph("<b>Domestic Supplier (Unverified):</b>", cell_bold), Paragraph(str(data.get("indian_supplier_count", 0)), cell_style),
            Paragraph("<b>Unknown Origin Parts:</b>", cell_bold), Paragraph(str(data.get("unknown_origin_count", 0)), cell_style)
        ]
    ]
    meta_table = Table(meta_data, colWidths=[100, 170, 100, 170])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('PADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 14))

    # Section 1: Components and Discovered Alternatives
    story.append(Paragraph("1. Component Sourcing Dependencies & Alternative Findings", section_heading))
    
    headers = [
        Paragraph("<b>Part Number</b>", cell_bold),
        Paragraph("<b>Category</b>", cell_bold),
        Paragraph("<b>Origin Category</b>", cell_bold),
        Paragraph("<b>Recommended Alternative</b>", cell_bold),
        Paragraph("<b>Match / Status</b>", cell_bold),
        Paragraph("<b>Score</b>", cell_bold)
    ]
    
    table_rows = [headers]

    for comp in data.get("components", []):
        top_alt = comp.get("top_alternative")
        if top_alt:
            alt_text = f"<b>{top_alt.get('part_number')}</b><br/>{top_alt.get('manufacturer')}<br/><i>{top_alt.get('origin_label', '')}</i>"
            status_text = f"<b>{top_alt.get('compatibility_status')}</b><br/>{top_alt.get('matches_count', 0)} match, {top_alt.get('unknowns_count', 0)} unk"
            score_text = f"<b>{top_alt.get('heuristic_score', 0)}%</b>"
        else:
            alt_text = "<i>No verified alternative in catalogue</i>"
            status_text = "N/A"
            score_text = "-"

        origin_label = comp.get("origin_category", "UNKNOWN").replace("_", " ")

        row = [
            Paragraph(f"<b>{comp.get('part_number')}</b><br/>{comp.get('manufacturer')}", cell_style),
            Paragraph(comp.get("category") or "-", cell_style),
            Paragraph(origin_label, cell_style),
            Paragraph(alt_text, cell_style),
            Paragraph(status_text, cell_style),
            Paragraph(score_text, cell_style)
        ]
        table_rows.append(row)

    comp_table = Table(table_rows, colWidths=[100, 75, 85, 140, 90, 50])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('PADDING', (0, 0), (-1, -1), 4),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 14))

    # Section 2: Data Provenance & Methodology
    story.append(Paragraph("2. Data Provenance & Ethical Disclosure Rules", section_heading))
    methodology_text = (
        "<b>Provenanced Sourcing:</b> Components labeled as 'Verified Indian Manufacturer' have documented "
        "indigenous manufacturing or design facilities (e.g. SCL Mohali, Mindgrove Technologies, BEL, C-DAC). "
        "Distributors based in India representing foreign fabrication facilities are strictly labeled as "
        "'Indian Distributor, Manufacturer Origin Unverified'.<br/>"
        "<b>Missing Technical Fields:</b> Parameters without explicit manufacturer datasheet confirmation are listed as "
        "'UNKNOWN' and excluded from match scoring. They are never assumed compatible."
    )
    story.append(Paragraph(methodology_text, subtitle_style))

    doc.build(story)
    return output_path
