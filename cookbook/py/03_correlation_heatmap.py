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
