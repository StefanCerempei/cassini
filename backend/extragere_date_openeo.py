import openeo
import os


def obtine_ndwi_openeo(lat, lng, an, nume_fisier_output=None):
    """
    Descarcă indicele NDWI (Green - NIR) / (Green + NIR) pentru zona dată
    și anul specificat, folosind Sentinel-2 L2A via openEO Copernicus.

    Parametri:
        lat (float): Latitudinea centrului zonei de interes.
        lng (float): Longitudinea centrului zonei de interes.
        an (int): Anul pentru care se face extragerea (ex: 2020 sau 2026).
        nume_fisier_output (str, optional): Calea fișierului .tif de ieșire.
            Dacă nu e specificat, se generează automat: ndwi_{an}.tif

    Returnează:
        str: Calea absolută a fișierului .tif generat.
    """
    if nume_fisier_output is None:
        nume_fisier_output = f"ndwi_{an}.tif"

    print(f"🛰️  [openEO] Conectare la Copernicus pentru anul {an}...")

    # --- 1. Conectare și autentificare OIDC ---
    connection = openeo.connect("openeofed.dataspace.copernicus.eu")
    connection.authenticate_oidc()

    # --- 2. Definire zonă de interes (bounding box 0.02° în jurul punctului) ---
    delta = 0.02
    spatial_extent = {
        "west":  lng - delta,
        "east":  lng + delta,
        "south": lat - delta,
        "north": lat + delta,
    }

    # --- 3. Interval temporal: luna aprilie a anului ales ---
    # Alegem luna aprilie deoarece Sentinel-2 are acoperire bună și vegetația
    # este activă, ceea ce face NDWI mai relevant pentru detectarea apei.
    date_start = f"{an}-04-01"
    date_end   = f"{an}-04-30"

    # --- 4. Încărcare colecție Sentinel-2 L2A ---
    # Benzile necesare pentru NDWI: B03 (Green) și B08 (NIR)
    datacube = connection.load_collection(
        "SENTINEL2_L2A",
        spatial_extent=spatial_extent,
        temporal_extent=[date_start, date_end],
        bands=["B03", "B08"],
        max_cloud_cover=30,          # ignorăm scenele cu nori > 30%
    )

    # --- 5. Calcul NDWI = (Green - NIR) / (Green + NIR) ---
    # NDWI pozitiv (> 0) → apă / sol saturat
    # NDWI negativ      → vegetație / sol uscat
    green = datacube.band("B03")
    nir   = datacube.band("B08")
    ndwi  = (green - nir) / (green + nir)

    # --- 6. Reducere temporală: luăm mediana lunii pentru a elimina norii ---
    ndwi_median = ndwi.reduce_dimension(dimension="t", reducer="median")

    # --- 7. Descărcare rezultat ---
    print(f"⏳ [openEO] Serverul procesează datele pentru {an}...")
    ndwi_median.download(nume_fisier_output)

    print(f"✅ [openEO] Fișier salvat: {nume_fisier_output}")
    return os.path.abspath(nume_fisier_output)