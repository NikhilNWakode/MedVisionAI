import io
from datetime import datetime

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


def generate_pdf(report_data: dict) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.75 * inch, bottomMargin=0.75 * inch)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle("Title", parent=styles["Heading1"], fontSize=18, spaceAfter=12, textColor=colors.HexColor("#1e3a8a"))
    heading_style = ParagraphStyle("SectionHead", parent=styles["Heading2"], fontSize=13, spaceBefore=16, spaceAfter=6, textColor=colors.HexColor("#1e40af"))
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=14, spaceAfter=8)
    meta_style = ParagraphStyle("Meta", parent=styles["Normal"], fontSize=9, textColor=colors.grey)

    elements = []

    elements.append(Paragraph("MedVision AI - Radiology Report", title_style))
    elements.append(Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}", meta_style))
    if report_data.get("model_used"):
        elements.append(Paragraph(f"Model: {report_data['model_used']}", meta_style))
    elements.append(Spacer(1, 12))

    if report_data.get("confidence"):
        confidence_pct = f"{report_data['confidence'] * 100:.0f}%"
        elements.append(Paragraph(f"Confidence Score: {confidence_pct}", heading_style))
        elements.append(Spacer(1, 8))

    sections = [
        ("Findings", report_data.get("findings")),
        ("Impression", report_data.get("impression")),
        ("Recommendations", report_data.get("recommendations")),
    ]

    for label, content in sections:
        if content:
            elements.append(Paragraph(label, heading_style))
            elements.append(Paragraph(content, body_style))

    citations = report_data.get("citations")
    if citations and isinstance(citations, list) and len(citations) > 0:
        elements.append(Paragraph("Citations", heading_style))
        for i, cite in enumerate(citations):
            source = cite.get("source", "Unknown")
            content = cite.get("content", "")[:150]
            elements.append(Paragraph(f"[{i+1}] {source}: {content}", body_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer.read()
