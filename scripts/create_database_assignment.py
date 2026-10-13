from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_ALIGN_VERTICAL, WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "Lecture_Plus_Database_Design_Assignment.docx"
ER_IMAGE = ROOT / "scripts" / "assets" / "lecture-plus-er.png"

BLUE = "285FA8"
BLUE_LIGHT = "EAF2FD"
BLUE_PALE = "F5F8FD"
GRAY = "D9E1EA"
TEXT = RGBColor(31, 45, 66)


def set_repeat_table_header(row):
    tr_pr = row._tr.get_or_add_trPr()
    tbl_header = OxmlElement("w:tblHeader")
    tbl_header.set(qn("w:val"), "true")
    tr_pr.append(tbl_header)


def shade(cell, fill):
    tc_pr = cell._tc.get_or_add_tcPr()
    shd = tc_pr.find(qn("w:shd"))
    if shd is None:
        shd = OxmlElement("w:shd")
        tc_pr.append(shd)
    shd.set(qn("w:fill"), fill)


def cell_border(cell, color=GRAY, size="6"):
    tc_pr = cell._tc.get_or_add_tcPr()
    borders = tc_pr.first_child_found_in("w:tcBorders")
    if borders is None:
        borders = OxmlElement("w:tcBorders")
        tc_pr.append(borders)
    for edge in ("top", "left", "bottom", "right", "insideH", "insideV"):
        element = borders.find(qn(f"w:{edge}"))
        if element is None:
            element = OxmlElement(f"w:{edge}")
            borders.append(element)
        element.set(qn("w:val"), "single")
        element.set(qn("w:sz"), size)
        element.set(qn("w:color"), color)


def set_cell_margins(cell, top=100, start=110, bottom=100, end=110):
    tc = cell._tc
    tc_pr = tc.get_or_add_tcPr()
    tc_mar = tc_pr.first_child_found_in("w:tcMar")
    if tc_mar is None:
        tc_mar = OxmlElement("w:tcMar")
        tc_pr.append(tc_mar)
    for key, value in (("top", top), ("start", start), ("bottom", bottom), ("end", end)):
        node = tc_mar.find(qn(f"w:{key}"))
        if node is None:
            node = OxmlElement(f"w:{key}")
            tc_mar.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def set_col_widths(table, widths):
    for row in table.rows:
        for index, width in enumerate(widths):
            row.cells[index].width = Inches(width)


def style_table(table, widths, header=True):
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    set_col_widths(table, widths)
    if header:
        set_repeat_table_header(table.rows[0])
    for row_index, row in enumerate(table.rows):
        for cell in row.cells:
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            set_cell_margins(cell)
            cell_border(cell)
            if row_index == 0 and header:
                shade(cell, BLUE)
                for run in cell.paragraphs[0].runs:
                    run.font.bold = True
                    run.font.color.rgb = RGBColor(255, 255, 255)
            elif row_index % 2 == 0:
                shade(cell, BLUE_PALE)
            for paragraph in cell.paragraphs:
                paragraph.paragraph_format.space_after = Pt(0)
                paragraph.paragraph_format.line_spacing = 1.05
                for run in paragraph.runs:
                    run.font.size = Pt(9)


def add_hyperlink(paragraph, text, url):
    part = paragraph.part
    relationship_id = part.relate_to(url, "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink", is_external=True)
    hyperlink = OxmlElement("w:hyperlink")
    hyperlink.set(qn("r:id"), relationship_id)
    run = OxmlElement("w:r")
    props = OxmlElement("w:rPr")
    color = OxmlElement("w:color")
    color.set(qn("w:val"), BLUE)
    underline = OxmlElement("w:u")
    underline.set(qn("w:val"), "single")
    props.extend([color, underline])
    run.append(props)
    text_node = OxmlElement("w:t")
    text_node.text = text
    run.append(text_node)
    hyperlink.append(run)
    paragraph._p.append(hyperlink)


def add_page_number(paragraph):
    paragraph.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    run = paragraph.add_run("Page ")
    run.font.size = Pt(8)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def add_bullet(doc, text):
    p = doc.add_paragraph(style="List Bullet")
    p.add_run(text)
    return p


def add_number(doc, text):
    p = doc.add_paragraph(style="List Number")
    p.add_run(text)
    return p


doc = Document()
section = doc.sections[0]
section.top_margin = Inches(0.72)
section.bottom_margin = Inches(0.65)
section.left_margin = Inches(0.78)
section.right_margin = Inches(0.78)

styles = doc.styles
styles["Normal"].font.name = "Aptos"
styles["Normal"]._element.rPr.rFonts.set(qn("w:ascii"), "Aptos")
styles["Normal"]._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos")
styles["Normal"].font.size = Pt(10.5)
styles["Normal"].font.color.rgb = TEXT
styles["Normal"].paragraph_format.space_after = Pt(6)
styles["Normal"].paragraph_format.line_spacing = 1.12

for style_name, size in (("Title", 29), ("Heading 1", 20), ("Heading 2", 14)):
    style = styles[style_name]
    style.font.name = "Aptos Display"
    style._element.rPr.rFonts.set(qn("w:ascii"), "Aptos Display")
    style._element.rPr.rFonts.set(qn("w:hAnsi"), "Aptos Display")
    style.font.size = Pt(size)
    style.font.bold = True
    style.font.color.rgb = RGBColor(0, 0, 0)
    style.paragraph_format.keep_with_next = True
styles["Title"].paragraph_format.space_after = Pt(9)
styles["Heading 1"].paragraph_format.space_before = Pt(10)
styles["Heading 1"].paragraph_format.space_after = Pt(7)
styles["Heading 2"].paragraph_format.space_before = Pt(8)
styles["Heading 2"].paragraph_format.space_after = Pt(4)

for sec in doc.sections:
    add_page_number(sec.footer.paragraphs[0])

title = doc.add_paragraph(style="Title")
title.add_run("Lecture Plus Database Design")
subtitle = doc.add_paragraph()
subtitle.alignment = WD_ALIGN_PARAGRAPH.LEFT
run = subtitle.add_run("ICT Assignment 3")
run.font.size = Pt(15)
run.font.bold = True
run.font.color.rgb = RGBColor(40, 95, 168)

meta = doc.add_table(rows=4, cols=2)
meta_data = [
    ("Project", "Lecture Plus web service"),
    ("Team", "Askat, Merei, Asyl and Zangarbek"),
    ("Database", "Supabase PostgreSQL with 12 application tables"),
    ("Date", "13 October 2026"),
]
for row, values in zip(meta.rows, meta_data):
    row.cells[0].text, row.cells[1].text = values
    shade(row.cells[0], BLUE_LIGHT)
    row.cells[0].paragraphs[0].runs[0].font.bold = True
style_table(meta, [1.35, 5.2], header=False)
set_repeat_table_header(meta.rows[0])

doc.add_heading("Project purpose", level=1)
doc.add_paragraph(
    "Lecture Plus is a web service for students. A student can record a lecture, upload a file or paste notes. "
    "The service creates a transcript, a clear explanation, possible future topics, a quiz, tasks and reminders. "
    "The database keeps these parts connected. It also lets a signed-in student open private history on another device."
)
doc.add_paragraph(
    "The main result is a database model with twelve application tables. Supabase Auth stores login data in an external system table. "
    "Row Level Security protects each student's records. A public demonstration page shows only the database structure and fixed examples."
)

doc.add_heading("How the system works", level=2)
for item in (
    "Input: lecture audio, a document or written notes.",
    "Process: AI creates structured learning information.",
    "Storage: PostgreSQL saves connected rows with primary and foreign keys.",
    "Output: the student opens analysis, quiz progress, tasks and reminders in Profile."
):
    add_bullet(doc, item)

doc.add_page_break()
doc.add_heading("Entity relationship diagram", level=1)
doc.add_paragraph("The diagram shows how the twelve tables connect. PK means primary key. FK means foreign key.")
picture_paragraph = doc.add_paragraph()
picture_paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
picture = picture_paragraph.add_run().add_picture(str(ER_IMAGE), width=Inches(6.35))
picture._inline.docPr.set("descr", "Lecture Plus ER diagram with twelve application tables and their key relationships")
caption = doc.add_paragraph("Figure 1  Lecture Plus ER diagram")
caption.alignment = WD_ALIGN_PARAGRAPH.CENTER
caption.runs[0].italic = True
caption.runs[0].font.size = Pt(9)

doc.add_heading("Editable diagram and live model", level=2)
p = doc.add_paragraph("Editable DBML source: ")
add_hyperlink(p, "lecture-plus-ict.vercel.app/lecture-plus.dbml", "https://lecture-plus-ict.vercel.app/lecture-plus.dbml")
p = doc.add_paragraph("Public database page: ")
add_hyperlink(p, "lecture-plus-ict.vercel.app/database.html", "https://lecture-plus-ict.vercel.app/database.html")
doc.add_paragraph("The DBML file can be imported into dbdiagram.io and edited without changing the real student database.")

doc.add_heading("Main relationships", level=2)
for item in (
    "One profile can own many lectures and quiz attempts.",
    "One lecture has one transcript and one analysis.",
    "One lecture has many lecture_topic rows; each row points to exactly one topic.",
    "One topic can appear in many lecture_topic rows.",
    "One question has many answer options.",
    "One quiz attempt has many selected answers.",
    "One task can have many reminders."
):
    add_bullet(doc, item)

doc.add_page_break()
doc.add_heading("Data dictionary", level=1)
doc.add_paragraph("Each table has one clear job. The table below gives the purpose and the most important keys.")
dictionary_rows = [
    ("1", "profiles", "Student profile and cloud sync choice", "PK id, FK auth.users"),
    ("2", "lectures", "One uploaded or recorded lecture", "PK id, FK user_id"),
    ("3", "transcripts", "Extracted lecture text", "PK id, FK lecture_id"),
    ("4", "analyses", "AI summary and explanation sections", "PK id, FK lecture_id"),
    ("5", "topics", "Reusable current and future topic names", "PK id"),
    ("6", "lecture_topics", "Child row linking one lecture to one topic", "FK lecture_id, FK topic_id"),
    ("7", "questions", "Quiz questions for one lecture", "PK id, FK lecture_id"),
    ("8", "answer_options", "Possible and correct answers", "PK id, FK question_id"),
    ("9", "quiz_attempts", "One student's score for one lecture", "FK user_id, FK lecture_id"),
    ("10", "attempt_answers", "The option selected for each question", "FK attempt_id, question_id, option_id"),
    ("11", "tasks", "Teacher work or optional AI practice", "PK id, FK lecture_id"),
    ("12", "reminders", "A reminder connected to a task", "PK id, FK task_id"),
]
table = doc.add_table(rows=1, cols=4)
for cell, text in zip(table.rows[0].cells, ("No", "Table", "Purpose", "Main keys")):
    cell.text = text
for values in dictionary_rows:
    cells = table.add_row().cells
    for cell, text in zip(cells, values):
        cell.text = text
style_table(table, [0.38, 1.35, 2.75, 2.15])

doc.add_heading("Why twelve tables are useful", level=2)
doc.add_paragraph(
    "The model does not put all information into one large table. This reduces repeated data and makes each relationship clear. "
    "For example, one lecture can have many questions, but each question can also have many answer options. Separate tables keep this logic simple."
)

doc.add_page_break()
doc.add_heading("Business rules", level=1)
rules = [
    "One authenticated user has one profile.",
    "One profile can own many lectures and quiz attempts.",
    "One lecture has at most one transcript and one analysis.",
    "One lecture can have many lecture_topic rows; each row has one topic and one role.",
    "Each quiz question has two or more options and one correct option.",
    "One quiz attempt belongs to one student and one lecture.",
    "Teacher tasks and AI practice tasks use different task types.",
    "A task can have many reminders.",
    "Deleting a lecture also deletes its dependent learning data.",
    "A student can read and change only their own rows."
]
for rule in rules:
    add_number(doc, rule)

doc.add_heading("Scenario verification", level=1)
doc.add_paragraph(
    "Scenario: Askat uploads an operating systems lecture. The service saves the lecture, its learning guide, a quiz and a task. "
    "The expected rows show that every part has a valid parent."
)
scenario = [
    ("lectures", "1", "Operating Systems"),
    ("transcripts and analyses", "2", "Lecture text and study guide"),
    ("topics and lecture_topics", "6", "Kernel, Processes and Networks"),
    ("questions and answer_options", "10", "Two questions with four options each"),
    ("quiz_attempts and attempt_answers", "3", "One attempt and two answers"),
    ("tasks and reminders", "3", "Worksheet, practice task and reminder"),
]
table = doc.add_table(rows=1, cols=3)
for cell, text in zip(table.rows[0].cells, ("Table group", "Rows", "Example")):
    cell.text = text
for values in scenario:
    cells = table.add_row().cells
    for cell, text in zip(cells, values):
        cell.text = text
style_table(table, [2.55, 0.7, 3.4])

p = doc.add_paragraph()
p.paragraph_format.space_before = Pt(3)
p.paragraph_format.space_after = Pt(0)
p.paragraph_format.line_spacing = 1.0
r = p.add_run("Verification result: ")
r.bold = True
p.add_run(
    "the real Supabase database created all twelve tables. Tests saved and loaded a lecture, checked a quiz, "
    "blocked another user from reading it, and removed the test data. Supabase Advisors reported no issues."
)
for run in p.runs:
    run.font.size = Pt(9.5)

doc.add_page_break()
doc.add_heading("Security and privacy", level=1)
doc.add_paragraph(
    "Students can use the AI tools without an account. Cloud saving starts only after sign-in and the student turns on private sync. "
    "The browser uses a public Supabase publishable key. It cannot bypass database rules. Secret keys stay in Vercel environment variables."
)
for item in (
    "Row Level Security checks the signed-in user ID.",
    "A student cannot read or delete another student's lectures.",
    "The public database page uses fixed examples and a safe status function.",
    "The public page never shows emails, transcripts or real student rows.",
    "Audio is sent to Groq for analysis but is not stored by Lecture Plus."
):
    add_bullet(doc, item)

doc.add_heading("Team contribution", level=1)
team = [
    ("Askat", "System architecture, database logic and integration"),
    ("Merei", "Business rules and table descriptions"),
    ("Asyl", "ER diagram and relationship checking"),
    ("Zangarbek", "Scenario verification and document layout"),
    ("All members", "Final review and presentation preparation"),
]
table = doc.add_table(rows=1, cols=2)
table.rows[0].cells[0].text = "Team member"
table.rows[0].cells[1].text = "Contribution"
for values in team:
    cells = table.add_row().cells
    cells[0].text, cells[1].text = values
style_table(table, [1.55, 5.1])

doc.add_heading("Conclusion", level=1)
doc.add_paragraph(
    "The database supports the complete Lecture Plus learning flow. It keeps the lecture, analysis, future topics, quiz, tasks and reminders connected. "
    "The model is easy to explain, protects student data and can grow with the web service."
)

doc.core_properties.title = "Lecture Plus Database Design"
doc.core_properties.subject = "ICT Assignment 3 Database Design"
doc.core_properties.author = "Askat, Merei, Asyl and Zangarbek"
doc.core_properties.keywords = "Lecture Plus, database, ER diagram, Supabase, ICT"

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
doc.save(OUTPUT)
print(OUTPUT)
