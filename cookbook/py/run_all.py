import subprocess, sys, pathlib, os
os.makedirs("py_out", exist_ok=True)
bad = 0
for f in sorted(pathlib.Path("py").glob("0*.py")):
    r = subprocess.run([sys.executable, str(f)], capture_output=True, text=True)
    out = (r.stdout.strip() or r.stderr.strip().splitlines()[-1:] or [""])[0] if r.returncode else r.stdout.strip()
    print(("ok   " if r.returncode == 0 else "FAIL ") + f.name.ljust(34) + out); bad += r.returncode != 0
for p in sorted(pathlib.Path("py_out").iterdir()):
    if not p.name.startswith("_"): print("   file", p.name, p.stat().st_size, "bytes")
sys.exit(bad)
