from app.reports.prompts import build_report_prompt


def test_build_prompt_basic():
    metadata = {"filename": "chest.dcm", "modality": "CR", "body_part": "CHEST"}
    context = [{"source": "RadioGraphics", "content": "Consolidation on chest radiograph..."}]

    prompt = build_report_prompt(metadata, context)
    assert "CHEST" in prompt
    assert "RadioGraphics" in prompt
    assert "chest.dcm" in prompt


def test_build_prompt_with_notes():
    metadata = {"filename": "scan.png", "modality": "CT"}
    prompt = build_report_prompt(metadata, [], clinical_notes="Patient presents with cough")
    assert "Patient presents with cough" in prompt


def test_build_prompt_empty_context():
    metadata = {"filename": "test.dcm"}
    prompt = build_report_prompt(metadata, [])
    assert "Retrieved Medical Context" not in prompt
