# Python recipes that produce real files

7 scripts. I ran every one in my sandbox and checked the outputs: the Excel file contains two native charts, the PowerPoint slide has an editable native chart, the Word file has a table and a picture, and I looked at the PNG figures. Run all with `python3 py/run_all.py` (needs numpy, pandas, matplotlib, seaborn, openpyxl, python-pptx, python-docx).

When to choose Python over browser code: you need a FILE (PNG/SVG/PDF for a report, a native Excel or PowerPoint chart, a Word document) rather than something shown on a web page.

---

## 01_matplotlib_basic.py

**What it does:** Static figure: a line chart and a bar chart side by side, saved as PNG, SVG and PDF.

```python
"""Static figure: a line chart and a bar chart side by side, saved as PNG, SVG and PDF.
Why Python for this: the file can be dropped into a report, a slide or an e-mail."""
import numpy as np
import matplotlib
matplotlib.use("Agg")                     # no window; write to files
import matplotlib.pyplot as plt

rng = np.random.default_rng(3)
months = np.arange(1, 25)
sales = 50 + 0.9 * months + 10 * np.sin(months / 12 * 2 * np.pi) + rng.normal(0, 3, 24)
langs = {"Python": 68, "SQL": 57, "R": 41, "Java": 29, "Julia": 12}

fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(9, 3.4), constrained_layout=True)
ax1.plot(months, sales, color="#2a78d6", lw=2)
ax1.set(title="Sales by month", xlabel="month", ylabel="units")
ax2.bar(langs.keys(), langs.values(), color="#2a78d6")
ax2.set(title="Users by language", ylim=(0, 80))     # bars start at 0
for ax in (ax1, ax2):
    ax.spines[["top", "right"]].set_visible(False)   # less ink
    ax.grid(axis="y", alpha=0.25)
for ext in ("png", "svg", "pdf"):
    fig.savefig(f"py_out/matplotlib_basic.{ext}", dpi=160)
print("written: png, svg, pdf")
```

---

## 02_seaborn_distribution.py

**What it does:** Violin + box + points for three groups, and a histogram with a density curve (seaborn).

```python
"""Violin + box + points for three groups, and a histogram with a density curve (seaborn)."""
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns

rng = np.random.default_rng(1)
df = pd.DataFrame({"group": np.repeat(["A", "B", "C"], 120),
                   "value": np.concatenate([rng.normal(50, 8, 120), rng.normal(60, 12, 120), rng.normal(45, 5, 120)])})
sns.set_theme(style="whitegrid", palette=["#2a78d6", "#eb6834", "#1baf7a"])
fig, (a, b) = plt.subplots(1, 2, figsize=(9, 3.6), constrained_layout=True)
sns.violinplot(data=df, x="group", y="value", inner=None, alpha=0.35, ax=a, hue="group", legend=False)
sns.boxplot(data=df, x="group", y="value", width=0.15, showfliers=False, ax=a, color="white")
sns.stripplot(data=df.sample(150, random_state=0), x="group", y="value", size=2.5, alpha=0.6, ax=a, color="#333")
sns.histplot(df["value"], kde=True, bins=30, color="#2a78d6", ax=b)
a.set_title("Violin + box + points"); b.set_title("Histogram + density")
fig.savefig("py_out/seaborn_distribution.png", dpi=160)
print("written: seaborn_distribution.png")
```

---

## 03_correlation_heatmap.py

**What it does:** Annotated correlation matrix with a diverging colour map centred on 0.

```python
"""Annotated correlation matrix with a diverging colour map centred on 0."""
import numpy as np, pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

rng = np.random.default_rng(7)
hours = rng.normal(size=200)
df = pd.DataFrame({"hours": hours,
                   "score": 0.7 * hours + 0.6 * rng.normal(size=200),
                   "sleep": 0.3 * hours + 0.9 * rng.normal(size=200),
                   "stress": -0.5 * hours + 0.8 * rng.normal(size=200)})
c = df.corr()
fig, ax = plt.subplots(figsize=(4.6, 4))
im = ax.imshow(c, cmap="RdBu", vmin=-1, vmax=1)      # vmin/vmax fix the midpoint at 0
ax.set_xticks(range(len(c)), c.columns); ax.set_yticks(range(len(c)), c.columns)
for i in range(len(c)):
    for j in range(len(c)):
        ax.text(j, i, f"{c.iloc[i, j]:.2f}", ha="center", va="center",
                color="white" if abs(c.iloc[i, j]) > 0.6 else "black")
fig.colorbar(im, ax=ax, shrink=0.8)
fig.tight_layout(); fig.savefig("py_out/correlation_heatmap.png", dpi=160)
print("written: correlation_heatmap.png")
```

---

## 04_excel_native_chart.py

**What it does:** An .xlsx with data AND native Excel charts (editable in Excel, not pictures).

```python
"""An .xlsx with data AND native Excel charts (editable in Excel, not pictures)."""
from openpyxl import Workbook
from openpyxl.chart import BarChart, LineChart, Reference

wb = Workbook(); ws = wb.active; ws.title = "Sales"
ws.append(["Month", "North", "South"])
for m, (n, s) in enumerate([(120, 90), (135, 95), (150, 110), (170, 118), (160, 130), (185, 140)], start=1):
    ws.append([f"M{m}", n, s])
data = Reference(ws, min_col=2, max_col=3, min_row=1, max_row=7)    # includes header row for series names
cats = Reference(ws, min_col=1, min_row=2, max_row=7)
bar = BarChart(); bar.title = "Sales by region"; bar.add_data(data, titles_from_data=True); bar.set_categories(cats)
bar.y_axis.title = "units"; bar.height, bar.width = 7.5, 14
ws.add_chart(bar, "E2")
line = LineChart(); line.title = "Trend"; line.add_data(data, titles_from_data=True); line.set_categories(cats)
line.height, line.width = 7.5, 14
ws.add_chart(line, "E18")
wb.save("py_out/sales_with_charts.xlsx"); print("written: sales_with_charts.xlsx")
```

---

## 05_powerpoint_native_chart.py

**What it does:** A PowerPoint slide with a title and a NATIVE chart (editable data) plus a text box.

```python
"""A PowerPoint slide with a title and a NATIVE chart (editable data) plus a text box."""
from pptx import Presentation
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION
from pptx.util import Inches, Pt

prs = Presentation(); prs.slide_width, prs.slide_height = Inches(13.33), Inches(7.5)
slide = prs.slides.add_slide(prs.slide_layouts[5])           # title only
slide.shapes.title.text = "Languages used in the course"
cd = CategoryChartData(); cd.categories = ["Python", "SQL", "R", "Java", "Julia"]
cd.add_series("Users", (68, 57, 41, 29, 12))
gf = slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, Inches(0.7), Inches(1.6), Inches(8), Inches(5), cd)
ch = gf.chart; ch.has_legend = False; ch.value_axis.minimum_scale = 0
box = slide.shapes.add_textbox(Inches(9), Inches(2), Inches(3.8), Inches(3)).text_frame
box.word_wrap = True; box.text = "Python leads, but SQL is close."; box.paragraphs[0].font.size = Pt(22)
prs.save("py_out/chart_slide.pptx"); print("written: chart_slide.pptx")
```

---

## 06_word_report.py

**What it does:** A Word report: heading, paragraph, table and an embedded figure made by matplotlib.

```python
"""A Word report: heading, paragraph, table and an embedded figure made by matplotlib."""
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from docx import Document
from docx.shared import Inches

fig, ax = plt.subplots(figsize=(5, 2.8)); x = np.arange(1, 13)
ax.plot(x, 50 + 4 * x + 6 * np.sin(x / 2), color="#2a78d6", lw=2); ax.set(title="Monthly trend"); fig.tight_layout(); fig.savefig("py_out/_fig.png", dpi=150)
d = Document(); d.add_heading("Quarterly report", 0)
d.add_paragraph("Sales grew steadily through the year; the table gives the details.")
t = d.add_table(rows=1, cols=3); t.style = "Light Grid Accent 1"
for c, h in zip(t.rows[0].cells, ["Region", "Q1", "Q2"]): c.text = h
for r in [("North", 120, 150), ("South", 90, 110)]:
    cells = t.add_row().cells
    for c, v in zip(cells, r): c.text = str(v)
d.add_picture("py_out/_fig.png", width=Inches(5)); d.save("py_out/report.docx"); print("written: report.docx")
```

---

## 07_pandas_heat_table.py

**What it does:** A formatted heat table (conditional formatting) exported as standalone HTML.

```python
"""A formatted heat table (conditional formatting) exported as standalone HTML."""
import pandas as pd
df = pd.DataFrame({"Model": ["Linear", "Tree", "Forest", "Boosting"], "Accuracy": [0.82, 0.86, 0.91, 0.93],
                   "Recall": [0.74, 0.80, 0.87, 0.90], "Time (s)": [1.2, 3.4, 18, 25]}).set_index("Model")
styler = (df.style.background_gradient(cmap="Blues", subset=["Accuracy", "Recall"])
                  .background_gradient(cmap="Blues_r", subset=["Time (s)"])     # reversed: faster = darker
                  .format({"Accuracy": "{:.2f}", "Recall": "{:.2f}", "Time (s)": "{:.1f}"}))
open("py_out/heat_table.html", "w").write(styler.to_html()); print("written: heat_table.html")
```

---
