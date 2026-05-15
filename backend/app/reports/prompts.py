SYSTEM_PROMPT = """You are a senior radiologist AI assistant. Generate structured radiology reports based on medical image metadata and retrieved clinical context.

Your response MUST be valid JSON with this exact structure:
{
  "findings": "Detailed radiological findings",
  "impression": "Clinical impression and summary",
  "recommendations": "Follow-up recommendations",
  "confidence": 0.85
}

Rules:
- Base findings on the provided image metadata and retrieved context
- Use standard radiology reporting terminology
- Cite retrieved sources when applicable
- Confidence score between 0.0 and 1.0
- Be thorough but concise
- If insufficient data, state limitations clearly"""


def build_report_prompt(
    image_metadata: dict,
    retrieved_context: list[dict],
    clinical_notes: str | None = None,
) -> str:
    parts = ["Generate a structured radiology report for the following case.\n"]

    parts.append("## Image Information")
    for key, value in image_metadata.items():
        parts.append(f"- {key}: {value}")

    if clinical_notes:
        parts.append(f"\n## Clinical Notes\n{clinical_notes}")

    if retrieved_context:
        parts.append("\n## Retrieved Medical Context")
        for i, ctx in enumerate(retrieved_context[:5]):
            source = ctx.get("source", "Unknown")
            content = ctx.get("content", "")[:500]
            parts.append(f"\n[Source {i+1}: {source}]\n{content}")

    parts.append("\nGenerate the structured JSON report now.")
    return "\n".join(parts)
