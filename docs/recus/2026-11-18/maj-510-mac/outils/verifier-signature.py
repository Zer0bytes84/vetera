# Verifie une signature de mise a jour Tauri (minisign) avec la cle publique de tauri.conf.json, comme le plugin updater.
# Usage : python3 -I verifier-signature.py <tauri.conf.json> <fichier> <signature base64 (fichier .sig)> [latest.json plateforme]
import base64, hashlib, json, sys
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
conf, path, sigfile = sys.argv[1:4]
pub_text = base64.b64decode(json.load(open(conf))["plugins"]["updater"]["pubkey"]).decode().splitlines()
pub = base64.b64decode(pub_text[1]); key_id, key = pub[2:10], pub[10:42]
sig_b64 = open(sigfile).read().strip()
if len(sys.argv) > 4:
    feed = json.load(open(sys.argv[4]))["platforms"]["darwin-aarch64"]["signature"]
    print("signature du latest.json identique au .sig :", feed.strip() == sig_b64)
lines = base64.b64decode(sig_b64).decode().splitlines()
raw = base64.b64decode(lines[1]); alg, sig_key_id, sig = raw[:2], raw[2:10], raw[10:74]
trusted = lines[2].removeprefix("trusted comment: ")
global_sig = base64.b64decode(lines[3])
print("algorithme :", alg, "| cle de la signature = cle de l'app :", sig_key_id == key_id, key_id[::-1].hex().upper())
data = open(path, "rb").read()
message = hashlib.blake2b(data, digest_size=64).digest() if alg == b"ED" else data
pk = Ed25519PublicKey.from_public_bytes(key)
for name, s, m in (("signature du fichier", sig, message), ("signature du commentaire de confiance", global_sig, sig + trusted.encode())):
    try: pk.verify(s, m); print(name, ": VALIDE")
    except Exception: print(name, ": INVALIDE")
print("commentaire de confiance :", trusted)
