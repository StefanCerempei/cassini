import numpy as np


def calculeaza_ndwi(banda_verde, banda_nir):
    """
    Primește matricile pentru Verde și Infraroșu și returnează Indicele de Apă.
    """
    print("⚙️ [Matematicianul] Calculez NDWI...")

    # Ignorăm erorile de tip "împărțire la zero"
    with np.errstate(divide='ignore', invalid='ignore'):
        numitor = (banda_verde + banda_nir)
        ndwi_matrix = np.where(numitor == 0, 0, (banda_verde - banda_nir) / numitor)

    return ndwi_matrix


def calculeaza_ndvi(banda_rosie, banda_nir):
    """
    Primește matricile pentru Roșu și Infraroșu și returnează Indicele de Vegetație.
    """
    print("⚙️ [Matematicianul] Calculez NDVI...")

    with np.errstate(divide='ignore', invalid='ignore'):
        numitor = (banda_nir + banda_rosie)
        ndvi_matrix = np.where(numitor == 0, 0, (banda_nir - banda_rosie) / numitor)

    return ndvi_matrix