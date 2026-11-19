# Verifie que le diff de travail est une pure permutation de lignes dans chaque fichier : memes lignes retirees et ajoutees.
import collections, subprocess, sys
files = subprocess.run(["git", "diff", "--name-only"], capture_output=True, text=True).stdout.split()
bad = 0
for f in files:
    d = subprocess.run(["git", "diff", "-U0", "--", f], capture_output=True, text=True).stdout.splitlines()
    minus = collections.Counter(l[1:] for l in d if l.startswith("-") and not l.startswith("---"))
    plus = collections.Counter(l[1:] for l in d if l.startswith("+") and not l.startswith("+++"))
    if minus != plus:
        bad += 1
        print("PAS UNE PERMUTATION :", f)
print(f"{len(files)} fichiers, {bad} hors permutation")
