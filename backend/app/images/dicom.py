from pathlib import Path

import pydicom
from PIL import Image


def extract_dicom_metadata(filepath: str) -> dict:
    ds = pydicom.dcmread(filepath, force=True)
    metadata = {}
    fields = [
        "PatientName", "PatientID", "Modality", "BodyPartExamined",
        "StudyDescription", "SeriesDescription", "InstitutionName",
        "StudyDate", "Manufacturer", "Rows", "Columns",
    ]
    for field in fields:
        val = getattr(ds, field, None)
        if val is not None:
            metadata[field] = str(val)
    return metadata


def dicom_to_thumbnail(filepath: str, output_path: str, size: tuple[int, int] = (256, 256)) -> str:
    ds = pydicom.dcmread(filepath, force=True)
    if not hasattr(ds, "pixel_data") and not hasattr(ds, "PixelData"):
        raise ValueError("DICOM file has no pixel data")

    pixel_array = ds.pixel_array
    if pixel_array.max() > 0:
        normalized = (pixel_array / pixel_array.max() * 255).astype("uint8")
    else:
        normalized = pixel_array.astype("uint8")

    img = Image.fromarray(normalized)
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.thumbnail(size)
    img.save(output_path, "PNG")
    return output_path


def is_dicom_file(filename: str) -> bool:
    return filename.lower().endswith(".dcm") or filename.lower().endswith(".dicom")
