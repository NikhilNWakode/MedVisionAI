"""
Export a MedVision AI report as an HL7 FHIR R4 DiagnosticReport resource.
Follows: https://www.hl7.org/fhir/diagnosticreport.html
"""

from datetime import datetime, timezone


def to_fhir_diagnostic_report(
    report_data: dict,
    image_data: dict | None = None,
    patient_data: dict | None = None,
) -> dict:
    now = datetime.now(timezone.utc).isoformat()

    resource = {
        "resourceType": "DiagnosticReport",
        "id": report_data.get("id", ""),
        "status": "final",
        "category": [
            {
                "coding": [
                    {
                        "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
                        "code": "RAD",
                        "display": "Radiology",
                    }
                ]
            }
        ],
        "code": {
            "coding": [
                {
                    "system": "http://loinc.org",
                    "code": "18748-4",
                    "display": "Diagnostic imaging study",
                }
            ],
            "text": "AI-Assisted Radiology Report",
        },
        "effectiveDateTime": report_data.get("created_at", now),
        "issued": now,
        "conclusion": report_data.get("impression", ""),
        "conclusionCode": [],
    }

    if patient_data:
        resource["subject"] = {
            "reference": f"Patient/{patient_data.get('patient_id', 'unknown')}",
            "display": patient_data.get("patient_name", "Unknown"),
        }

    if image_data:
        modality = image_data.get("modality", "Unknown")
        resource["media"] = [
            {
                "comment": f"{modality} - {image_data.get('filename', '')}",
                "link": {"reference": f"Media/{image_data.get('id', '')}"},
            }
        ]

    # Map findings, impression, recommendations to presentedForm
    sections = []
    if report_data.get("findings"):
        sections.append({
            "title": "Findings",
            "text": {
                "status": "generated",
                "div": f'<div xmlns="http://www.w3.org/1999/xhtml"><p>{report_data["findings"]}</p></div>',
            },
        })
    if report_data.get("impression"):
        sections.append({
            "title": "Impression",
            "text": {
                "status": "generated",
                "div": f'<div xmlns="http://www.w3.org/1999/xhtml"><p>{report_data["impression"]}</p></div>',
            },
        })
    if report_data.get("recommendations"):
        sections.append({
            "title": "Recommendations",
            "text": {
                "status": "generated",
                "div": f'<div xmlns="http://www.w3.org/1999/xhtml"><p>{report_data["recommendations"]}</p></div>',
            },
        })

    if sections:
        inner = "".join(
            "<h3>" + s["title"] + "</h3>" + s["text"]["div"] for s in sections
        )
        resource["text"] = {
            "status": "generated",
            "div": f'<div xmlns="http://www.w3.org/1999/xhtml">{inner}</div>',
        }

    # Add AI confidence as extension
    if report_data.get("confidence") is not None:
        resource["extension"] = [
            {
                "url": "http://medvision.ai/fhir/StructureDefinition/ai-confidence",
                "valueDecimal": report_data["confidence"],
            }
        ]

    # Add citations as extension
    citations = report_data.get("citations")
    if citations and isinstance(citations, list):
        cite_ext = []
        for cite in citations:
            cite_ext.append({
                "url": "http://medvision.ai/fhir/StructureDefinition/citation",
                "valueString": cite.get("source", "") + ": " + cite.get("content", "")[:100],
            })
        if cite_ext:
            resource.setdefault("extension", []).extend(cite_ext)

    return resource
