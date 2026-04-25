from flask import Flask, request, jsonify
from flask_cors import CORS
from main import ruleaza_analiza_completa, AN_REFERINTA_DEFAULT, AN_CURENT_DEFAULT

app = Flask(__name__)
CORS(app)


@app.route('/api/detect', methods=['POST'])
def detect_pollution():
    """
    Analizează poluarea apei printr-o comparație NDWI între doi ani.

    Payload JSON așteptat:
    {
        "lat": 45.75,          ← obligatoriu
        "lng": 21.22,          ← obligatoriu
        "an_referinta": 2020,  ← opțional (implicit 2020)
        "an_curent": 2026      ← opțional (implicit 2026)
    }

    Răspuns JSON (200):
    {
        "status_alerta": "🔴 POLUARE SEVERĂ DETECTATĂ",
        "statistici": {
            "procent_apa_referinta": 12.4,
            "procent_apa_curenta": 7.1,
            "procent_din_apa_originala": 42.7,
            "procent_suprafata_degradata": 5.3,
            "pixeli_apa_referinta": 3200,
            "pixeli_apa_curenta": 1840,
            "pixeli_degradati": 1360,
            "intensitate_medie_degradare": -0.18,
            "intensitate_maxima_degradare": -0.41,
            "punct_critic_relativ": [128, 97]
        },
        "harta_binara_referinta": [[...]],
        "harta_binara_curenta": [[...]],
        "harta_degradare": [[...]],
        "meta": {
            "lat": 45.75, "lng": 21.22,
            "an_referinta": 2020, "an_curent": 2026
        }
    }
    """
    data = request.get_json(force=True, silent=True)

    if not data:
        return jsonify({"error": "Body JSON lipsă"}), 400

    if 'lat' not in data or 'lng' not in data:
        return jsonify({"error": "Lipsesc coordonatele (lat/lng)"}), 400

    lat = float(data['lat'])
    lng = float(data['lng'])
    an_referinta = int(data.get('an_referinta', AN_REFERINTA_DEFAULT))
    an_curent    = int(data.get('an_curent',    AN_CURENT_DEFAULT))

    # Validare ani
    if not (2015 <= an_referinta <= 2030) or not (2015 <= an_curent <= 2030):
        return jsonify({"error": "Anii trebuie să fie între 2015 și 2030"}), 400

    if an_referinta >= an_curent:
        return jsonify({"error": "an_referinta trebuie să fie mai mic decât an_curent"}), 400

    print(f"📡 [API] Cerere primită: ({lat}, {lng}) | {an_referinta} → {an_curent}")

    output = ruleaza_analiza_completa(
        lat=lat, lng=lng,
        an_referinta=an_referinta,
        an_curent=an_curent
    )

    if output is None:
        return jsonify({"error": "Analiza satelitară a eșuat. Verificați conexiunea la Copernicus."}), 500

    # ruleaza_analiza_completa returnează (rezultate_dict, mat_ref, mat_cur)
    # Trimitem doar dict-ul (matricele numpy nu sunt JSON-serializable)
    rezultate, _mat_ref, _mat_cur = output

    return jsonify(rezultate), 200


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "online",
        "service": "AquaLeaks AI — CASSINI Backend",
        "ani_default": {
            "referinta": AN_REFERINTA_DEFAULT,
            "curent":    AN_CURENT_DEFAULT,
        }
    }), 200


if __name__ == '__main__':
    print("🚀 AquaLeaks AI — Server Flask pornit pe http://localhost:5000")
    print(f"   Ani impliciți: referință={AN_REFERINTA_DEFAULT}, curent={AN_CURENT_DEFAULT}")
    app.run(debug=True, port=5000)