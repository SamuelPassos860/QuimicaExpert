import math
import zipfile
import os
import ssl
import re
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

ssl._create_default_https_context = ssl._create_unverified_context
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

def conectar_banco():
    if not DATABASE_URL:
        raise RuntimeError("DATABASE_URL não configurada.")
    return psycopg2.connect(DATABASE_URL)


def salvar_composto_banco(cas_id, nome, epsilon, lambda_max, fonte):
    with conectar_banco() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO compounds (
                    cas,
                    nome,
                    epsilon_m_cm,
                    lambda_max,
                    fonte
                )
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (cas)
                DO UPDATE SET
                    nome = EXCLUDED.nome,
                    epsilon_m_cm = EXCLUDED.epsilon_m_cm,
                    lambda_max = EXCLUDED.lambda_max,
                    fonte = EXCLUDED.fonte;
            """, (
                cas_id,
                nome,
                epsilon,
                str(lambda_max) if lambda_max is not None else "N/A",
                fonte
            ))


def carregar_biblioteca():
    compostos = {}

    with conectar_banco() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT cas, nome, epsilon_m_cm, lambda_max, fonte
                FROM compounds
                ORDER BY nome;
            """)
            rows = cur.fetchall()

    for row in rows:
        compostos[row["cas"]] = {
            "nome": row["nome"],
            "coeficiente_molar": float(row["epsilon_m_cm"]) if row["epsilon_m_cm"] is not None else 0.0,
            "nm": row["lambda_max"] or "N/A",
            "origem": row["fonte"] or "N/A"
        }

    return compostos


def garantir_dados_padrao():
    salvar_composto_banco("61-73-4", "Azul de Metileno", 80000, "664", "Padrao")
    salvar_composto_banco("77-09-8", "Fenolftaleína", 25000, "552", "Padrao")


def adicionar_via_cas(cas_id):
    try:
        print("--- Cadastro Manual ---")
        nome_manual = input("Nome do composto: ")
        eps_manual = float(input("ε (M⁻¹cm⁻¹): "))
        nm_manual = input("λmax (nm): ").strip() or "N/A"

        salvar_composto_banco(
            cas_id=cas_id,
            nome=nome_manual,
            epsilon=eps_manual,
            lambda_max=nm_manual,
            fonte="Manual"
        )

        return True
    except Exception as e:
        print(f"Erro ao salvar no banco: {e}")
        return False


def limpar_valor_quimico(texto):
    t = texto.strip().replace('"', '')

    if '.' in t and ',' in t:
        t = t.replace('.', '').replace(',', '.')
    elif ',' in t:
        t = t.replace(',', '.')

    try:
        return float(t)
    except ValueError:
        return None


def carregar_database():
    database_epsilon = {}

    with conectar_banco() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    compound_name,
                    absorption_wavelength_nm,
                    molar_extinction_coefficient
                FROM spectral_data
                WHERE compound_name IS NOT NULL
                  AND molar_extinction_coefficient IS NOT NULL;
            """)

            rows = cur.fetchall()

    for row in rows:
        nome = row["compound_name"]
        epsilon_raw = row["molar_extinction_coefficient"]
        wavelength = row["absorption_wavelength_nm"]

        epsilon = limpar_valor_quimico(str(epsilon_raw))

        if epsilon is not None:
            database_epsilon[nome] = {
                "coeficiente_molar": epsilon,
                "nm": str(wavelength) if wavelength is not None else "N/A"
            }

    return database_epsilon

def processo_analitico():
    print("=== SOFTWARE ANALÍTICO - QUÍMICA EXPERTA ===")

    entrada_busca = input("\nDigite o nome ou CAS para busca: ").strip()
    busca_lower = entrada_busca.lower()

    eps = None
    nome_exibicao = "Não identificado"
    origem_detectada = "Desconhecida"
    nm_encontrado = "N/A"

    for cas, info in compostos_db.items():
        if entrada_busca == cas or busca_lower in info['nome'].lower():
            eps = info['coeficiente_molar']
            nome_exibicao = info['nome']
            nm_encontrado = info.get("nm", "N/A")
            origem_detectada = "Banco"
            print(f"✅ Encontrado no Banco: {nome_exibicao}")
            break

    if eps is None:
        for chave_nome, dados in meu_dicionario.items():
            if busca_lower in chave_nome.lower():
                eps = dados['coeficiente_molar']
                nm_encontrado = dados['nm']
                nome_exibicao = chave_nome.replace('.abs.txt', '')
                origem_detectada = "PhotochemCAD"
                print(f"✅ Encontrado na Database: {nome_exibicao} (λmax: {nm_encontrado} nm)")
                break

    if eps is None:
        print("⚠️ Composto não localizado.")
        entrada_eps = input("Digite o ε manualmente (M⁻¹cm⁻¹): ").strip().replace(',', '.')
        eps = float(entrada_eps) if entrada_eps else 0.0
        nome_exibicao = input("Dê um nome para este composto: ").strip() or "Entrada Manual"
        nm_encontrado = input("Digite o λmax (nm) [N/A]: ").strip() or "N/A"
        origem_detectada = "Manual"

    c_optico = input('\nCaminho óptico (cm) [1.0]: ').strip().replace(',', '.')
    caminho_optico = float(c_optico) if c_optico else 1.0

    conc_input = input("Insira a concentração (mol/L): ").strip().replace(',', '.')
    concentracao = float(conc_input) if conc_input else 0.0

    absorbancia = eps * caminho_optico * concentracao

    print(f"\nAbsorbância Calculada: {absorbancia:.4f}")

    if origem_detectada != "Banco":
        confirmar = input(f"\n⭐ Deseja salvar '{nome_exibicao}' no banco? (s/n): ").strip().lower()

        if confirmar == 's':
            cas_id = input("Digite o CAS: ").strip() or "S/CAS"

            salvar_composto_banco(
                cas_id=cas_id,
                nome=nome_exibicao,
                epsilon=eps,
                lambda_max=nm_encontrado,
                fonte=origem_detectada
            )

            compostos_db[cas_id] = {
                "nome": nome_exibicao,
                "coeficiente_molar": eps,
                "nm": nm_encontrado,
                "origem": origem_detectada
            }

            print("✅ Composto salvo no banco com sucesso.")

    return (
        f"\n--- RELATÓRIO FINAL ---\n"
        f"Composto: {nome_exibicao}\n"
        f"ε: {eps} M⁻¹cm⁻¹\n"
        f"λmax: {nm_encontrado}\n"
        f"Fonte: {origem_detectada}\n"
        f"Absorbância: {absorbancia:.4f}"
    )


def mostrar_biblioteca_salva():
    print("\n" + "=" * 75)
    print(f"{'CAS':<15} | {'Nome':<25} | {'ε (M⁻¹cm⁻¹)':<12} | {'λmax':<8} | {'Fonte'}")
    print("-" * 75)

    for cas, info in compostos_db.items():
        origem = info.get('origem', 'N/A')
        print(
            f"{cas:<15} | "
            f"{info['nome'][:25]:<25} | "
            f"{info['coeficiente_molar']:<12} | "
            f"{str(info['nm']):<8} | "
            f"{origem}"
        )

    print("=" * 75 + "\n")


if __name__ == "__main__":
    garantir_dados_padrao()

    compostos_db = carregar_biblioteca()
    meu_dicionario = carregar_database()

    print(f"DEBUG: Foram carregados {len(meu_dicionario)} compostos da database.")
    print("--- PRIMEIRAS 5 CHAVES DA DATABASE ---")

    for i, chave in enumerate(meu_dicionario.keys()):
        print(f"Chave {i}: '{chave}'")
        if i == 4:
            break

    print("--------------------------------------")

    mostrar_biblioteca_salva()
    resultado = processo_analitico()

    print("\n" + "=" * 40)
    print(resultado)
    print("=" * 40)
