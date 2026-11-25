"""Reads answers aloud for Workwood: Kokoro-82M (ONNX) on the processor.

Run by service/speech.mjs with the Kokoro folder's own Python. One JSON request per line on stdin:
{"id": 1, "text": "...", "voice": "af_bella", "out": "/tmp/.../1.wav"}; one JSON line back per request
when its clip is written: {"id": 1} or {"id": 1, "error": "..."}. The first line out is {"ready": true}.
"""
import json, os, sys

HOME = sys.argv[1]

def main():
    import onnxruntime as ort, soundfile as sf
    ort.set_default_logger_severity(3)
    from kokoro_onnx import Kokoro
    sess = ort.InferenceSession(os.path.join(HOME, 'kokoro-v1.0.onnx'), providers=['CPUExecutionProvider'])
    k = Kokoro.from_session(sess, os.path.join(HOME, 'voices-v1.0.bin'))
    print(json.dumps({'ready': True}), flush=True)
    for line in sys.stdin:
        try:
            m = json.loads(line)
        except ValueError:
            continue
        try:
            audio, rate = k.create(m['text'], voice=m['voice'], speed=1.0, lang='en-us')
            sf.write(m['out'], audio, rate, format='WAV')
            print(json.dumps({'id': m['id']}), flush=True)
        except Exception as e:
            print(json.dumps({'id': m['id'], 'error': str(e).split('\n')[0]}), flush=True)

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(json.dumps({'failed': str(e).split('\n')[0]}), flush=True)
