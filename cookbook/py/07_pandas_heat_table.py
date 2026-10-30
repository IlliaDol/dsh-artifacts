"""A formatted heat table (conditional formatting) exported as standalone HTML."""
import pandas as pd
df = pd.DataFrame({"Model": ["Linear", "Tree", "Forest", "Boosting"], "Accuracy": [0.82, 0.86, 0.91, 0.93],
                   "Recall": [0.74, 0.80, 0.87, 0.90], "Time (s)": [1.2, 3.4, 18, 25]}).set_index("Model")
styler = (df.style.background_gradient(cmap="Blues", subset=["Accuracy", "Recall"])
                  .background_gradient(cmap="Blues_r", subset=["Time (s)"])     # reversed: faster = darker
                  .format({"Accuracy": "{:.2f}", "Recall": "{:.2f}", "Time (s)": "{:.1f}"}))
open("py_out/heat_table.html", "w").write(styler.to_html()); print("written: heat_table.html")
