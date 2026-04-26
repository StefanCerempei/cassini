import json
import queue
import threading
import time
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from main import ruleaza_analiza_completa, AN_REFERINTA_DEFAULT, AN_CURENT_DEFAULT

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ---------------------------------------------------------------------------
# SSE — fiecare sesiune de analiză primește un canal de log-uri
# ---------------------------------------------------------------------------
_log_queues: dict[str, queue.Queue] = {}


def _get_or_create_queue(session_id: str) -> queue.Queue:
    if session_id not in _log_queues:
        _log_queues[session_id] = queue.Queue()
    return _log_queues[session_id]


class QueueLogger:
    """Captează print()-urile din thread-ul de analiză și le pune în coadă."""

    def __init__(self, q: queue.Queue, original_print):
        self.q = q
        self.original_print = original_print

    def __call__(self, *args, **kwargs):
        msg = " ".join(str(a) for a in args)
        self.q.put({"type": "log", "message": msg})
        self.original_print(*args, **kwargs)


def _parse_detect_payload():
    data = request.get_json(force=True, silent=True)

    if not data:
        return None, (jsonify({"error": "Body JSON lipsă"}), 400)
    if 'lat' not in data or 'lng' not in data:
        return None, (jsonify({"error": "Lipsesc coordonatele (lat/lng)"}), 400)

    try:
        lat = float(data['lat'])
        lng = float(data['lng'])
        an_referinta = int(data.get('an_referinta', AN_REFERINTA_DEFAULT))
        an_curent = int(data.get('an_curent', AN_CURENT_DEFAULT))
    except (TypeError, ValueError):
        return None, (jsonify({"error": "Parametri invalizi (lat/lng/ani)"}), 400)

    if not (2015 <= an_referinta <= 2030) or not (2015 <= an_curent <= 2030):
        return None, (jsonify({"error": "Anii trebuie să fie între 2015 și 2030"}), 400)
    if an_referinta >= an_curent:
        return None, (jsonify({"error": "an_referinta trebuie să fie mai mic decât an_curent"}), 400)

    return {
        "lat": lat,
        "lng": lng,
        "an_referinta": an_referinta,
        "an_curent": an_curent,
    }, None


def _frontend_payload(rezultate):
    # Scoatem matricele mari — nu sunt necesare pentru frontend
    return {
        k: v for k, v in rezultate.items()
        if k not in ("harta_binara_referinta", "harta_binara_curenta", "harta_degradare")
    }


# ---------------------------------------------------------------------------
# POST /api/detect  — mod sincron (compatibil analytics tab)
# ---------------------------------------------------------------------------
@app.route('/api/detect', methods=['POST'])
def detect_pollution():
    """
    Payload JSON: { "lat": 45.75, "lng": 21.22, "an_referinta": 2020, "an_curent": 2026 }
    Răspuns: JSON complet rezultat analiză (fără matricile mari).
    """
    params, err = _parse_detect_payload()
    if err:
        return err

    output = ruleaza_analiza_completa(**params)
    if output is None:
        return jsonify({"error": "Analiza satelitară a eșuat."}), 500

    rezultate, _mat_ref, _mat_cur = output
    return jsonify(_frontend_payload(rezultate)), 200


# ---------------------------------------------------------------------------
# POST /api/detect_async  — lansează analiza și returnează session_id (SSE)
# ---------------------------------------------------------------------------
@app.route('/api/detect_async', methods=['POST'])
def detect_pollution_async():
    """
    Payload JSON: { "lat": 45.75, "lng": 21.22, "an_referinta": 2020, "an_curent": 2026 }
    Răspuns imediat: { "session_id": "<uuid>" }
    """
    params, err = _parse_detect_payload()
    if err:
        return err

    import uuid
    session_id = str(uuid.uuid4())
    q = _get_or_create_queue(session_id)

    def run_analysis():
        import builtins
        original_print = builtins.print
        builtins.print = QueueLogger(q, original_print)
        try:
            output = ruleaza_analiza_completa(**params)
            if output is None:
                q.put({"type": "error", "message": "Analiza satelitară a eșuat."})
            else:
                rezultate, _mat_ref, _mat_cur = output
                q.put({"type": "result", "data": _frontend_payload(rezultate)})
        except Exception as e:
            q.put({"type": "error", "message": str(e)})
        finally:
            builtins.print = original_print
            q.put({"type": "done"})

    thread = threading.Thread(target=run_analysis, daemon=True)
    thread.start()

    return jsonify({"session_id": session_id}), 202


# ---------------------------------------------------------------------------
# GET /api/stream/<session_id>  — SSE cu log-uri live
# ---------------------------------------------------------------------------
@app.route('/api/stream/<session_id>', methods=['GET'])
def stream_logs(session_id: str):
    q = _get_or_create_queue(session_id)

    def generate():
        while True:
            try:
                item = q.get(timeout=120)   # așteptăm max 2 min
            except queue.Empty:
                yield "event: timeout\ndata: {}\n\n"
                break

            payload = json.dumps(item, ensure_ascii=False)
            yield f"data: {payload}\n\n"

            if item.get("type") in ("done", "error"):
                break

        # Curățăm coada după terminare
        _log_queues.pop(session_id, None)

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )


# ---------------------------------------------------------------------------
# GET /health
# ---------------------------------------------------------------------------
@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "service": "AquaLeaks AI — CASSINI Backend",
        "ani_default": {
            "referinta": AN_REFERINTA_DEFAULT,
            "curent": AN_CURENT_DEFAULT,
        }
    }), 200


if __name__ == '__main__':
    print("🚀 AquaLeaks AI — Server Flask pornit pe http://localhost:5000")
    app.run(debug=True, port=5000, threaded=True)
