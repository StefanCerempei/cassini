import numpy as np
from scipy import ndimage


# ---------------------------------------------------------------------------
# Praguri NDWI
# ---------------------------------------------------------------------------
PRAG_APA_CURATA   = 0.1   # Prag mai robust pentru ape tulburi/înguste în zone urbane
PRAG_APA_DEGRADATA = -0.1  # Dacă în trecut era apă (> PRAG_APA_CURATA) dar
                            # acum a scăzut sub acest prag → posibil poluată /
                            # acoperită cu alge / deversare industrială


def detecteaza_poluare_comparativa(matrice_referinta, matrice_curenta):
    """
    Compară două matrici NDWI (an de referință vs. an curent) și determină:
      - ce suprafață era apă curată în trecut
      - ce suprafață a pierdut caracteristicile apei curate (posibil poluată)
      - procentul de degradare față de referință

    Parametri:
        matrice_referinta (np.ndarray): NDWI din anul de referință (trecut).
        matrice_curenta   (np.ndarray): NDWI din anul curent.

    Returnează:
        dict cu:
            harta_binara_referinta  – unde era apă în trecut
            harta_binara_curenta    – unde mai este apă acum
            harta_degradare         – pixeli care au PIERDUT caracteristica apă
            statistici              – procente și intensități
            status_alerta           – verdict text
    """
    print("\n🛰️  " + "=" * 45)
    print("🧪 [DETECTOR POLUARE] Analiză comparativă NDWI...")

    # Asigurăm că matricele au aceeași dimensiune (redimensionare prin interpolare
    # dacă există mici diferențe de pixel cauzate de descărcări independente).
    matrice_referinta, matrice_curenta = _aliniaza_matrici(
        matrice_referinta, matrice_curenta
    )

    # --- 1. Mascăm zona cu apă din fiecare an ---
    masca_apa_referinta = (matrice_referinta > PRAG_APA_CURATA).astype(np.int8)
    masca_apa_curenta   = (matrice_curenta   > PRAG_APA_CURATA).astype(np.int8)

    # Curățăm zgomotul (reflexii izolate de acoperișuri, mașini etc.)
    masca_apa_referinta = _curata_zgomot(masca_apa_referinta)
    masca_apa_curenta   = _curata_zgomot(masca_apa_curenta)

    pixeli_apa_referinta = int(np.sum(masca_apa_referinta))
    pixeli_apa_curenta   = int(np.sum(masca_apa_curenta))

    # --- 2. Pixeli care ERAU apă dar NU mai sunt → degradare / poluare ---
    # Condiție: era apă (referință > prag) ȘI acum NDWI a scăzut semnificativ
    masca_degradare = (
        (masca_apa_referinta == 1) &
        (matrice_curenta < PRAG_APA_DEGRADATA)
    ).astype(np.int8)
    masca_degradare = _curata_zgomot(masca_degradare)
    pixeli_degradati = int(np.sum(masca_degradare))

    # --- 3. Calcul procente ---
    total_pixeli = matrice_referinta.size

    procent_apa_referinta = _la_procent(pixeli_apa_referinta, total_pixeli)
    procent_apa_curenta   = _la_procent(pixeli_apa_curenta,   total_pixeli)
    procent_degradat      = _la_procent(pixeli_degradati,     total_pixeli)

    # Câte % din suprafața de apă originală s-a degradat
    if pixeli_apa_referinta > 0:
        procent_din_apa_originala = _la_procent(
            pixeli_degradati, pixeli_apa_referinta
        )
    else:
        procent_din_apa_originala = 0.0

    # --- 4. Intensitatea medie NDWI în zona degradată ---
    if pixeli_degradati > 0:
        vals_degradare = matrice_curenta[masca_degradare == 1]
        intensitate_medie_degradare = round(float(np.mean(vals_degradare)), 3)
        intensitate_max_degradare   = round(float(np.max(vals_degradare)),  3)
    else:
        intensitate_medie_degradare = 0.0
        intensitate_max_degradare   = 0.0

    # --- 5. Punctul cel mai afectat (valoare NDWI minimă în zona degradată) ---
    if pixeli_degradati > 0:
        # Cel mai mic NDWI în zona care era apă = cel mai poluat
        ndwi_in_zona_degradata = matrice_curenta.copy()
        ndwi_in_zona_degradata[masca_degradare == 0] = 999
        idx_critic = np.unravel_index(
            np.argmin(ndwi_in_zona_degradata), ndwi_in_zona_degradata.shape
        )
    else:
        idx_critic = (0, 0)

    # --- 6. Verdict ---
    status = _calculeaza_status(procent_din_apa_originala)

    # --- 7. Log consolă ---
    print(f"  📅 Suprafață apă în referință : {procent_apa_referinta:.2f}% din arie")
    print(f"  📅 Suprafață apă curentă       : {procent_apa_curenta:.2f}% din arie")
    print(f"  ⚠️  Suprafață degradată         : {procent_degradat:.2f}% din arie totală")
    print(f"  📉 Degradare din apa inițială  : {procent_din_apa_originala:.1f}%")
    print(f"  📢 Verdict                     : {status}")
    print("=" * 47 + "\n")

    return {
        "harta_binara_referinta": masca_apa_referinta.tolist(),
        "harta_binara_curenta":   masca_apa_curenta.tolist(),
        "harta_degradare":        masca_degradare.tolist(),
        "statistici": {
            "pixeli_apa_referinta":          pixeli_apa_referinta,
            "pixeli_apa_curenta":            pixeli_apa_curenta,
            "pixeli_degradati":              pixeli_degradati,
            "procent_apa_referinta":         procent_apa_referinta,
            "procent_apa_curenta":           procent_apa_curenta,
            "procent_suprafata_degradata":   procent_degradat,
            "procent_din_apa_originala":     procent_din_apa_originala,
            "intensitate_medie_degradare":   intensitate_medie_degradare,
            "intensitate_maxima_degradare":  intensitate_max_degradare,
            "punct_critic_relativ":          [int(idx_critic[0]), int(idx_critic[1])],
        },
        "status_alerta": status,
    }


# ---------------------------------------------------------------------------
# Funcții ajutătoare private
# ---------------------------------------------------------------------------

def _aliniaza_matrici(m1, m2):
    """
    Dacă matricele au dimensiuni ușor diferite (erori de rasterizare),
    le trunchiază la dimensiunea comună.
    """
    rows = min(m1.shape[0], m2.shape[0])
    cols = min(m1.shape[1], m2.shape[1])
    return m1[:rows, :cols], m2[:rows, :cols]


def _curata_zgomot(masca):
    """
    Elimină doar componentele foarte mici, fără să șteargă cursurile de apă înguste.
    """
    masca = masca.astype(bool)
    etichete, nr_comp = ndimage.label(masca)
    if nr_comp == 0:
        return masca.astype(np.int8)

    marimi = np.bincount(etichete.ravel())
    min_pixeli_componenta = 2
    pastreaza = marimi >= min_pixeli_componenta
    pastreaza[0] = False  # fundalul

    filtrata = pastreaza[etichete].astype(np.int8)

    # Fallback de siguranță: dacă filtrarea a șters tot, păstrăm masca brută
    if int(np.sum(filtrata)) == 0 and int(np.sum(masca)) > 0:
        return masca.astype(np.int8)

    return filtrata


def _la_procent(numarator, numitor):
    if numitor == 0:
        return 0.0
    return round((numarator / numitor) * 100, 2)


def _calculeaza_status(procent_degradat):
    """
    Traduce procentul de degradare din apa originală într-un verdict text.
    """
    if procent_degradat > 50:
        return "🚨 DEZASTRU ECOLOGIC — peste jumătate din suprafața de apă poluată"
    elif procent_degradat > 20:
        return "🔴 POLUARE SEVERĂ DETECTATĂ"
    elif procent_degradat > 5:
        return "🟠 POLUARE MODERATĂ DETECTATĂ"
    elif procent_degradat > 0:
        return "⚠️  ANOMALIE IZOLATĂ — modificări minore"
    else:
        return "🟢 ZONĂ CURATĂ — fără degradare semnificativă"
