"""Regenerates tests/fixtures/sample-cv.{docx,pdf} from sample-cv.txt (fictional person)."""
from pathlib import Path

from docx import Document
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

here = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
lines = (here / "sample-cv.txt").read_text(encoding="utf-8").splitlines()

doc = Document()
for line in lines:
    doc.add_paragraph(line)
doc.save(here / "sample-cv.docx")

pdf = canvas.Canvas(str(here / "sample-cv.pdf"), pagesize=A4)
pdf.setFont("Helvetica", 9)
y = 800
for line in lines:
    pdf.drawString(40, y, line)
    y -= 13
    if y < 40:
        pdf.showPage()
        pdf.setFont("Helvetica", 9)
        y = 800
pdf.save()
