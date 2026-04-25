import os
import rasterio
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors

from extragere_date_openeo import obtine_ndwi_openeo
from filtrare_anomalii import detecteaza_poluare_comparativa

# ---------------------------------------------------------------------------
# Configurare implicită ani
# ---------------------------------------------------------------------------
AN_REFERINTA_DEFAULT = 2020   # Anul „de bază" (apă curată)
AN_CURENT_DEFAULT    = 2026   # Anul prezent / de analizat


def _incarca_tif(cale_fisier):
    """Citește un fișier GeoTIFF și returnează matricea numpy curățată."""
    if not os.path.exists(cale_fisier):
        raise FileNotFoundError(f"Fișierul {cale_fisier} nu există.")
    with rasterio.open(cale_fisier) as src:
        matrice = src.read(1).astype(np.float32)
    matrice = np.nan_to_num(matrice, nan=0.0, posinf=1.0, neginf=-1.0)
    return matrice


def vizualizeaza_comparatie(mat_ref, mat_cur, rezultate, an_ref, an_cur):
    """
    Afișează 3 hărți side-by-side:
      1. NDWI an referință
      2. NDWI an curent
      3. Harta de degradare (roșu = pixeli pierduți)
    """
    fig, axs = plt.subplots(1, 3, figsize=(18, 6))
    fig.suptitle(
        f"Analiză comparativă poluare apă: {an_ref} → {an_cur}\n"
        f"Verdict: {rezultate['status_alerta']}",
        fontsize=13, fontweight="bold"
    )

    cmap_ndwi = plt.get_cmap("RdYlBu")

    # --- Harta 1: Referință ---
    im0 = axs[0].imshow(mat_ref, cmap=cmap_ndwi, vmin=-1, vmax=1)
    axs[0].set_title(f"NDWI {an_ref} (referință)")
    plt.colorbar(im0, ax=axs[0], label="NDWI")

    # --- Harta 2: Curent ---
    im1 = axs[1].imshow(mat_cur, cmap=cmap_ndwi, vmin=-1, vmax=1)
    axs[1].set_title(f"NDWI {an_cur} (actual)")
    plt.colorbar(im1, ax=axs[1], label="NDWI")

    # --- Harta 3: Degradare ---
    harta_deg = np.array(rezultate["harta_degradare"])
    cmap_deg = mcolors.ListedColormap(["#1a1a2e", "#e63946"])  # negru / roșu
    axs[2].imshow(harta_deg, cmap=cmap_deg, vmin=0, vmax=1)
    axs[2].set_title(
        f"Zonă degradată\n"
        f"{rezultate['statistici']['procent_din_apa_originala']:.1f}% din apa inițială"
    )

    plt.tight_layout()
    plt.show()


def ruleaza_analiza_completa(lat, lng,
                              an_referinta=AN_REFERINTA_DEFAULT,
                              an_curent=AN_CURENT_DEFAULT):
    """
    Funcție principală apelată atât din CLI cât și din API (app.py).

    Parametri:
        lat, lng        – coordonate GPS
        an_referinta    – anul de referință (ex: 2020)
        an_curent       – anul curent de analizat (ex: 2026)

    Returnează:
        dict cu rezultatele analizei (compatibil JSON), sau None la eroare.
    """
    print("\n" + "🚀" + "-" * 45)
    print(f"🛰️  START ANALIZĂ COMPARATIVĂ: {lat}, {lng}")
    print(f"    ↳ Referință: {an_referinta}  |  Curent: {an_curent}")
    print("-" * 47)

    # ------------------------------------------------------------------ #
    # 1. ACHIZIȚIE DATE — descărcăm NDWI pentru fiecare an               #
    # ------------------------------------------------------------------ #
    tif_referinta = f"ndwi_{an_referinta}.tif"
    tif_curent    = f"ndwi_{an_curent}.tif"

    try:
        obtine_ndwi_openeo(lat, lng, an=an_referinta,
                           nume_fisier_output=tif_referinta)
        obtine_ndwi_openeo(lat, lng, an=an_curent,
                           nume_fisier_output=tif_curent)
    except Exception as e:
        print(f"❌ EROARE la descărcarea datelor de la Copernicus: {e}")
        return None

    # ------------------------------------------------------------------ #
    # 2. ÎNCĂRCARE MATRICI                                                #
    # ------------------------------------------------------------------ #
    try:
        mat_referinta = _incarca_tif(tif_referinta)
        mat_curenta   = _incarca_tif(tif_curent)
    except FileNotFoundError as e:
        print(f"❌ EROARE: {e}")
        return None

    # ------------------------------------------------------------------ #
    # 3. DETECȚIE COMPARATIVĂ                                             #
    # ------------------------------------------------------------------ #
    rezultate = detecteaza_poluare_comparativa(mat_referinta, mat_curenta)

    # ------------------------------------------------------------------ #
    # 4. RAPORT CONSOLĂ                                                   #
    # ------------------------------------------------------------------ #
    st = rezultate["statistici"]
    print("\n📋 RAPORT FINAL CASSINI — AquaLeaks AI")
    print(f"  📍 Coordonate      : {lat}, {lng}")
    print(f"  📅 Referință / Curent : {an_referinta} / {an_curent}")
    print(f"  🌊 Apă referință   : {st['procent_apa_referinta']}% din arie")
    print(f"  🌊 Apă curentă     : {st['procent_apa_curenta']}% din arie")
    print(f"  ⚠️  Degradată       : {st['procent_din_apa_originala']}% din apa inițială")
    print(f"  📢 Status          : {rezultate['status_alerta']}")
    print("-" * 47 + "\n")

    # Adăugăm metadate utile pentru frontend
    rezultate["meta"] = {
        "lat": lat,
        "lng": lng,
        "an_referinta": an_referinta,
        "an_curent": an_curent,
    }

    return rezultate, mat_referinta, mat_curenta


# ---------------------------------------------------------------------------
# Executare directă (test CLI)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="AquaLeaks AI — Detecție poluare apă via Sentinel-2 NDWI"
    )
    parser.add_argument("--lat",  type=float, default=45.75,  help="Latitudine")
    parser.add_argument("--lng",  type=float, default=21.22,  help="Longitudine")
    parser.add_argument("--ref",  type=int,   default=AN_REFERINTA_DEFAULT,
                        help="Anul de referință (ex: 2020)")
    parser.add_argument("--cur",  type=int,   default=AN_CURENT_DEFAULT,
                        help="Anul curent de analizat (ex: 2026)")
    args = parser.parse_args()

    output = ruleaza_analiza_completa(
        lat=args.lat, lng=args.lng,
        an_referinta=args.ref, an_curent=args.cur
    )

    if output is not None:
        rezultate, mat_ref, mat_cur = output
        vizualizeaza_comparatie(
            mat_ref, mat_cur, rezultate,
            an_ref=args.ref, an_cur=args.cur
        )