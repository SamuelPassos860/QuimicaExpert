import os

def localizar_composto(termo, db_local, db_spectral):
    termo_busca = termo.lower()
    
    # 1. Busca no Banco Local (compounds)
    for cas, info in db_local.items():
        if termo_busca == cas.lower() or termo_busca in info['nome'].lower():
            return (info['coeficiente_molar'], 
                    info['nome'], 
                    info.get("nm", "N/A"), 
                    "Banco", 
                    info.get("solvente", "N/A"))

    # 2. Busca na Database Spectral (spectral_data)
    for nome, dados in db_spectral.items():
        if termo_busca in nome.lower():
            return (dados['coeficiente_molar'], 
                    nome, 
                    dados['nm'], 
                    "PhotochemCAD", 
                    dados.get("solvente", "N/A"))

    return None, None, None, None, None

def iniciar_fluxo_analitico(compostos_db, meu_dicionario, salvar_callback):
    print("\n=== SOFTWARE ANALÍTICO - QUÍMICA EXPERTA ===")
    busca = input("Digite o nome ou CAS: ").strip()

    # Busca os 5 valores
    eps, nome, nm, origem, solvente_encontrado = localizar_composto(busca, compostos_db, meu_dicionario)

    if eps is None:
        print("⚠️ Composto não localizado.")
        eps = float(input("Digite o ε (M⁻¹cm⁻¹): ").replace(',', '.'))
        nome = input("Nome do composto: ").strip() or "Manual"
        nm = input("λmax (nm): ").strip() or "N/A"
        solvente = input("Solvente utilizado: ").strip() or "N/A"
        origem = "Manual"
    else:
        # Usa o solvente que veio da função de busca
        solvente = solvente_encontrado
        print(f"\n✅ Encontrado em {origem}: {nome}")
        print(f"   ε: {eps} M⁻¹cm⁻¹ | λmax: {nm} nm")
        print(f"   Solvente: {solvente}")

    # Inputs de medição
    print("\n--- Parâmetros de Medição ---")
    b = float(input('Caminho óptico (cm) [1.0]: ').replace(',', '.') or 1.0)
    c = float(input("Concentração (mol/L): ").replace(',', '.') or 0.0)

    # Cálculo da Lei de Beer: A = ε . b . c
    abs_final = calcular_lei_beer(eps, b, c)

    print("-" * 30)
    print(f"Absorbância Calculada: {abs_final:.4f}")
    print("-" * 30)
    
    # Lógica de salvamento
    if origem != "Banco" and input("\nSalvar este resultado no seu banco pessoal? (s/n): ").lower() == 's':
        cas_id = input("Confirme o CAS: ").strip() or "S/CAS"
        salvar_callback(cas_id, nome, eps, nm, origem, solvente)
        print("✔ Dados salvos com sucesso!")

def calcular_lei_beer(epsilon, caminho_optico, concentracao):
    """A = ε.b.c"""
    try:
        return float(epsilon) * float(caminho_optico) * float(concentracao)
    except (ValueError, TypeError):
        return 0.0