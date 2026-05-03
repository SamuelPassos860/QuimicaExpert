import csv
from pathlib import Path

INPUT_FILE = Path("Common Compounds DB.db")
OUTPUT_FILE = Path("insert_spectral_measurements.sql")

TABLE_NAME = "spectral_measurements"

COLUMNS = [
    "compound_name",
    "structure_file",
    "chemical_class",
    "absorption_file",
    "absorption_wavelength_nm",
    "molar_extinction_coefficient",
    "absorption_solvent",
    "absorption_instrument",
    "absorption_date",
    "absorption_reference",
    "absorption_author",
    "emission_file",
    "emission_solvent",
    "quantum_yield",
    "emission_instrument",
    "emission_date",
    "emission_reference",
    "emission_author",
]


def to_sql_text(value):
    if value is None:
        return "NULL"

    value = str(value).strip()

    if value == "":
        return "NULL"

    value = value.replace("'", "''")
    return f"'{value}'"


def to_sql_number(value):
    if value is None:
        return "NULL"

    value = str(value).strip()

    if value == "":
        return "NULL"

    # Remove vírgula de milhares: "2,860" -> "2860"
    value = value.replace(",", "")

    try:
        float(value)
        return value
    except ValueError:
        return "NULL"


def generate_sql():
    if not INPUT_FILE.exists():
        raise FileNotFoundError(f"Arquivo não encontrado: {INPUT_FILE}")

    inserts = []
    total_rows = 0

    with INPUT_FILE.open("r", encoding="utf-8-sig", newline="") as file:
        reader = csv.reader(file, delimiter="\t", quotechar='"')

        header = next(reader)

        for row in reader:
            # Remove coluna vazia final, se existir
            if row and row[-1] == "":
                row = row[:-1]

            if not row or len(row) < 20:
                continue

            total_rows += 1

            values = [
                to_sql_text(row[2]),   # Name
                to_sql_text(row[3]),   # Structure
                to_sql_text(row[4]),   # Class

                to_sql_text(row[5]),   # Absorption File
                to_sql_number(row[6]), # Wavelength
                to_sql_number(row[7]), # Epsilon
                to_sql_text(row[8]),   # Absorption Solvent
                to_sql_text(row[9]),   # Absorption Instrument
                to_sql_text(row[10]),  # Absorption Date
                to_sql_text(row[11]),  # Absorption Reference
                to_sql_text(row[12]),  # Absorption Inv

                to_sql_text(row[14]),  # Emission File
                to_sql_text(row[15]),  # Emission Solvent
                to_sql_number(row[16]),# Quantum Yield
                to_sql_text(row[17]),  # Emission Instrument
                to_sql_text(row[18]),  # Emission Date
                to_sql_text(row[19]),  # Emission Reference
                to_sql_text(row[20]) if len(row) > 20 else "NULL",  # Emission Inv
            ]

            insert = f"""INSERT INTO {TABLE_NAME} (
    {", ".join(COLUMNS)}
) VALUES (
    {", ".join(values)}
);"""
            inserts.append(insert)

    OUTPUT_FILE.write_text("\n\n".join(inserts), encoding="utf-8")

    print(f"Arquivo gerado: {OUTPUT_FILE}")
    print(f"Total de registros exportados: {total_rows}")


if __name__ == "__main__":
    generate_sql()
