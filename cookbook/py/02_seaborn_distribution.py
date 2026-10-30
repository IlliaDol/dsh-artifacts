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
