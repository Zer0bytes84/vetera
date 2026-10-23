import sys, json, os, urllib.request, urllib.parse
root = sys.argv[1]
plan = {
  "eg1": ("onnx-community/embeddinggemma-300m-ONNX", ["onnx/model_quantized.onnx", "onnx/model_quantized.onnx_data", "onnx/model_q4.onnx", "onnx/model_q4.onnx_data"]),
  "eg2": ("onnx-community/embeddinggemma-2-ONNX", ["onnx/model_quantized.onnx", "onnx/model_quantized.onnx_data"]),
  "e5small": ("Xenova/multilingual-e5-small", ["onnx/model_quantized.onnx"]),
  "e5base": ("Xenova/multilingual-e5-base", ["onnx/model_quantized.onnx"]),
  "qwen3": ("onnx-community/Qwen3-Embedding-0.6B-ONNX", ["onnx/model_quantized.onnx"]),
  "bgem3": ("Xenova/bge-m3", ["onnx/model_quantized.onnx"]),
  "arctic": ("Snowflake/snowflake-arctic-embed-l-v2.0", ["onnx/model_quantized.onnx"]),
  "reranker": ("onnx-community/bge-reranker-v2-m3-ONNX", ["onnx/model_quantized.onnx"]),
}
skip = (".onnx", ".onnx_data", ".safetensors", ".bin", ".pt", ".h5", ".msgpack", ".ot", ".gguf", ".png", ".jpg")
def tree(repo, path=""):
    url = f"https://huggingface.co/api/models/{repo}/tree/main" + (f"/{path}" if path else "")
    out = []
    for x in json.load(urllib.request.urlopen(url)):
        if x["type"] == "directory":
            if x["path"] in ("onnx",) or x["path"].startswith(("1_", "2_", "3_")): out += tree(repo, x["path"])
        else: out.append(x)
    return out
for name in sys.argv[2:]:
    repo, onnx = plan[name]
    files = tree(repo)
    present = {f["path"]: f for f in files}
    wanted = [f["path"] for f in files if not f["path"].endswith(skip) and "/" not in f["path"]] + [p for p in onnx if p in present]
    for p in wanted:
        dest = os.path.join(root, name, p)
        if os.path.exists(dest) and os.path.getsize(dest) == present[p].get("size", -1): continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        urllib.request.urlretrieve(f"https://huggingface.co/{repo}/resolve/main/{urllib.parse.quote(p)}", dest)
    total = sum(present[p].get("size", 0) for p in wanted)
    print(f"{name} ok {total/1e6:.0f} Mo ({repo})", flush=True)
