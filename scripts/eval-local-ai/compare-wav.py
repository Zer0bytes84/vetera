"""Compare the WAV the app sent to whisper-cli with the clip that was played.

Usage: python3 compare-wav.py <sent.wav> <played-16k.wav>

Both files are 16 kHz mono PCM 16 bits. Prints the length of the recording,
its first non-zero sample, where the played clip begins inside it (log-energy
envelope cross-correlation on 20 ms frames), and, second by second after that
alignment, the level of the recording against the level of the clip: a missing
start shows as a recording that begins after the clip, an attenuated start as a
gain far below the rest of the clip.
"""
import math
import struct
import sys
import wave

FRAME = 320  # 20 ms at 16 kHz


def read(path):
    with wave.open(path) as handle:
        assert handle.getframerate() == 16000 and handle.getnchannels() == 1
        raw = handle.readframes(handle.getnframes())
    return struct.unpack(f"<{len(raw) // 2}h", raw)


def envelope(samples):
    out = []
    for start in range(0, len(samples) - FRAME + 1, FRAME):
        chunk = samples[start : start + FRAME]
        rms = math.sqrt(sum(value * value for value in chunk) / FRAME) / 32768
        out.append(20 * math.log10(max(rms, 1e-6)))
    return out


def best_lag(rec, ref, max_lag):
    # Pearson correlation of the dB envelopes over the overlapping frames.
    best = (-2.0, 0)
    for lag in range(-50, max_lag):
        pairs = [(rec[i + lag], ref[i]) for i in range(len(ref)) if 0 <= i + lag < len(rec)]
        if len(pairs) < 100:
            continue
        xs, ys = zip(*pairs)
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        cov = sum((x - mx) * (y - my) for x, y in pairs)
        vx = math.sqrt(sum((x - mx) ** 2 for x in xs))
        vy = math.sqrt(sum((y - my) ** 2 for y in ys))
        score = cov / (vx * vy) if vx and vy else -2
        if score > best[0]:
            best = (score, lag)
    return best


def main():
    rec_samples, ref_samples = read(sys.argv[1]), read(sys.argv[2])
    first = next((i for i, value in enumerate(rec_samples) if value), None)
    rec, ref = envelope(rec_samples), envelope(ref_samples)
    floor = sorted(rec)[len(rec) // 10]
    onset = next((i for i, value in enumerate(rec) if value > floor + 15), None)
    score, lag = best_lag(rec, ref, len(rec) - 100)
    print(f"enregistrement {len(rec_samples) / 16000:.2f} s, clip {len(ref_samples) / 16000:.2f} s")
    print(f"premier échantillon non nul : {first / 16000 if first is not None else None} s")
    print(f"plancher {floor:.1f} dBFS ; premier son > plancher + 15 dB : {onset * 0.02 if onset is not None else None} s")
    print(f"début du clip dans l'enregistrement : {lag * 0.02:+.2f} s (corrélation {score:.2f})")
    print("seconde du clip : niveau clip dBFS / niveau enregistré dBFS / écart dB")
    for second in range(int(len(ref) * 0.02)):
        idx = [i for i in range(second * 50, second * 50 + 50) if 0 <= i + lag < len(rec) and ref[i] > -50]
        if not idx:
            print(f"  {second:3d} : (silence dans le clip ou hors enregistrement)")
            continue
        clip = sum(ref[i] for i in idx) / len(idx)
        got = sum(rec[i + lag] for i in idx) / len(idx)
        print(f"  {second:3d} : {clip:6.1f} / {got:6.1f} / {got - clip:+6.1f}")


main()
