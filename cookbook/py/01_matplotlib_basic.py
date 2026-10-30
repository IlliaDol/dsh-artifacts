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
