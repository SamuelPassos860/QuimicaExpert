import math
import json
import zipfile
import os
import ssl
import re

ssl._create_default_https_context = ssl._create_unverified_context

# 1. Carregar Biblioteca Local
def carregar_biblioteca():
    try:
        with open('minha_biblioteca.json', 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {
            '61-73-4': {'nome': 'Azul de Metileno', 'coeficiente_molar': 80000, 'nm': 664, 'origem': 'Padrao'},
            '77-09-8': {'nome': 'Fenolftaleína', 'coeficiente_molar': 25000, 'nm': 552, 'origem': 'Padrao'}
        }

compostos_db = carregar_biblioteca()

# 2. Funções de Suporte
def salvar_biblioteca():
    with open('minha_biblioteca.json', 'w') as f:
        json.dump(compostos_db, f, indent=4)


def adicionar_via_cas(cas_id):
    try:
            print("--- Cadastro Manual ---")
            nome_manual = input("Nome do composto: ")
            eps_manual = float(input("ε (M⁻¹cm⁻¹): "))
            nm_manual = float(input("λmax (nm): "))
            
            compostos_db[cas_id] = {
                'nome': nome_manual,
                'coeficiente_molar': eps_manual,
                'nm': nm_manual,
                'origem': 'Manual'
            }
            salvar_biblioteca()
            return True
    except Exception as e:
        print(f"Erro Conexão: {e}")
        return False

def limpar_valor_quimico(texto):
    # Remove aspas e espaços extras
    t = texto.strip().replace('"', '')
    
    # Se o valor tem ponto e vírgula (ex: 1.250,00)
    if '.' in t and ',' in t:
        t = t.replace('.', '').replace(',', '.')
    # Se tem apenas vírgula (ex: 1250,00)
    elif ',' in t:
        t = t.replace(',', '.')
    
    try:
        return float(t)
    except ValueError:
        return None

def carregar_database(caminho_db):
    database_epsilon = {}
    if not os.path.exists(caminho_db):
        return database_epsilon

    with open(caminho_db, 'r', encoding='utf-8', errors='ignore') as f:
        for linha in f:
            # Forçamos a limpeza de espaços extras e tabs
            partes = [p.strip() for p in linha.replace('\t', ' ').split(' ') if p.strip()]

            if len(partes) >= 6:
                try:
                    # O nome geralmente está na segunda posição
                    nome_composto = partes[1].replace('"', '')
                    
                    # 1. PEGAR TODOS OS NÚMEROS NA ORDEM EM QUE APARECEM
                    valores_encontrados = []
                    indices_originais = []
                    
                    for i, p in enumerate(partes):
                        v = limpar_valor_quimico(p)
                        if v is not None and 0 < v < 1000000:
                            valores_encontrados.append(v)
                            indices_originais.append(i)
                    
                    if len(valores_encontrados) < 1:
                        continue

                    # --- LÓGICA DE ATRIBUIÇÃO POR EXCLUSÃO ---
                    epsilon_final = 0
                    nm_final = "N/A"
                    
                    # Se houver parênteses na linha, o valor dentro dele TEM que ser o NM
                    valor_parenteses = None
                    for p in partes:
                        if "(" in p:
                            limpo = "".join(c for c in p if c.isdigit() or c == '.')
                            if limpo: valor_parenteses = float(limpo)

                    if valor_parenteses:
                        nm_final = valor_parenteses
                        # O Epsilon será o maior valor que não seja o do parênteses
                        restantes = [v for v in valores_encontrados if abs(v - nm_final) > 0.1]
                        epsilon_final = max(restantes) if restantes else nm_final
                    else:
                        # Se não tem parênteses, o Epsilon é quase sempre o PRIMEIRO número grande
                        # ou simplesmente o maior valor da linha
                        epsilon_final = max(valores_encontrados)
                        # O NM é o valor que está na faixa UV (200-900) e não é o Epsilon
                        for v in valores_encontrados:
                            if 200 <= v <= 900 and v != epsilon_final:
                                nm_final = v
                                break

                    # --- LÓGICA DO SOLVENTE (Puxar texto após o Epsilon) ---
                    solvente = "N/A"
                    # Localizar a posição do Epsilon nas partes originais
                    idx_pos_eps = -1
                    for i in indices_originais:
                        if limpar_valor_quimico(partes[i]) == epsilon_final:
                            idx_pos_eps = i
                            break
                    
                    if idx_pos_eps != -1 and idx_pos_eps + 1 < len(partes):
                        # Procuramos a primeira palavra real após o Epsilon
                        for k in range(idx_pos_eps + 1, len(partes)):
                            candidato = partes[k].replace('(', '').replace(')', '').replace('"', '')
                            if not limpar_valor_quimico(candidato) and len(candidato) > 2:
                                if not any(x in candidato.lower() for x in ["agilent", "202", "jan"]):
                                    solvente = candidato
                                    break

                    database_epsilon[nome_composto] = {
                        'coeficiente_molar': epsilon_final,
                        'nm': nm_final,
                        'solvente': solvente
                    }

                except:
                    continue
                    
    return database_epsilon

meu_dicionario = carregar_database('Common Compounds DB.db')
print(f"DEBUG: Foram carregados {len(meu_dicionario)} compostos da database.")
# Isso vai mostrar exatamente como o Python "vê" o nome dos compostos
print("--- PRIMEIRAS 5 CHAVES DA DATABASE ---")
for i, chave in enumerate(meu_dicionario.keys()):
    print(f"Chave {i}: '{chave}'") # As aspas simples ajudam a ver espaços invisíveis
    if i == 4: break
print("--------------------------------------")

def processo_analitico():
    print("=== SOFTWARE ANALÍTICO - QUÍMICA EXPERTA ===")
    
    # 1. Busca do Epsilon (ε)
    entrada_busca = input("\nDigite o nome ou CAS para busca: ").strip()
    busca_lower = entrada_busca.lower()
    eps = None
    nome_exibicao = "Não identificado"
    origem_detectada = "Desconhecida"

    # --- BUSCA NA BIBLIOTECA LOCAL ---
    for cas, info in compostos_db.items():
        if entrada_busca == cas or busca_lower in info['nome'].lower():
            eps = info['coeficiente_molar']
            nome_exibicao = info['nome']
            origem_detectada = "Biblioteca Local"
            print(f"✅ Encontrado na Biblioteca Local: {nome_exibicao}")
            break

   # --- BUSCA NA DATABASE EXTERNA ---
    if eps is None:
        for nome_db, dados in meu_dicionario.items():
            # Dentro do loop de busca na database externa:
            if busca_lower in nome_db.lower():
                eps = dados['coeficiente_molar']
                nm_encontrado = dados['nm']
                solvente_encontrado = dados['solvente'] # Puxa o valor limpo da DB
                
                nome_exibicao = nome_db.split('_')[-1].replace('.abs.txt', '')
                origem_detectada = "PhotochemCAD"
                
                print(f"✅ Encontrado: {nome_exibicao}")
                print(f"   λmax: {nm_encontrado} nm | Solvente: {solvente_encontrado}")
                break
    # --- SE NÃO ACHOU, PEDE MANUAL ---
    if eps is None:
        print("⚠️ Composto não localizado.")
        entrada_eps = input("Digite o ε manualmente (M⁻¹cm⁻¹): ").strip().replace(',', '.')
        eps = float(entrada_eps) if entrada_eps else 0.0
        nome_exibicao = input("Dê um nome para este composto: ").strip() or "Entrada Manual"
        origem_detectada = "Manual"

    # --- 2. CÁLCULOS ---
    c_optico = input('\nCaminho óptico (cm) [1.0]: ').strip().replace(',', '.')
    caminho_optico = float(c_optico) if c_optico else 1.0

    conc_input = input(f"Insira a concentração (mol/L): ").strip().replace(',', '.')
    concentracao = float(conc_input) if conc_input else 0.0

    absorbancia = eps * caminho_optico * concentracao

    # --- 3. PERGUNTA SE QUER SALVAR (APÓS O CÁLCULO) ---
    print(f"\nAbsorbância Calculada: {absorbancia:.4f}")
    
    # Se o composto NÃO veio da biblioteca local, oferece para salvar
    # Procure esta parte no final do processo_analitico:
    if origem_detectada != "Biblioteca Local":
        confirmar = input(f"\n⭐ Deseja salvar '{nome_exibicao}'? (s/n): ").strip().lower()
        if confirmar == 's':
            cas_id = input("Digite o CAS: ").strip() or "S/CAS"
            compostos_db[cas_id] = {
                'nome': nome_exibicao,
                'coeficiente_molar': eps,
                'nm': nm_encontrado if 'nm_encontrado' in locals() else 'N/A',
                'solvente': solvente_encontrado if 'solvente_encontrado' in locals() else 'Manual',
                'origem': origem_detectada
            }
            salvar_biblioteca()
            print("💾 Salvo com sucesso!")
    # Retorna o relatório final
    return (f"\n--- RELATÓRIO FINAL ---\n"
            f"Composto: {nome_exibicao}\n"
            f"ε: {eps} M⁻¹cm⁻¹\n"
            f"Absorbância: {absorbancia:.4f}")

def mostrar_biblioteca_salva():
    # Aumentamos para 105 caracteres para caber a nova coluna
    print("\n" + "="*105)
    print(f"{'CAS':<15} | {'Nome':<25} | {'ε (M⁻¹cm⁻¹)':<12} | {'λmax':<8} | {'Solvente':<15} | {'Fonte'}")
    print("-" * 105)
    
    for cas, info in compostos_db.items():
        # Usamos .get() para evitar erro se algum item antigo não tiver solvente/nm
        nome = info.get('nome', 'N/A')
        eps = info.get('coeficiente_molar', 0)
        nm = info.get('nm', 'N/A')
        solv = info.get('solvente', 'N/A')
        fonte = info.get('origem', 'N/A')
        
        print(f"{cas:<15} | {nome[:25]:<25} | {eps:<12} | {nm:<8} | {solv:<15} | {fonte}")
    
    print("="*105 + "\n")

if __name__ == "__main__":
    mostrar_biblioteca_salva()
    resultado = processo_analitico()
    print("\n" + "="*40)
    print(resultado)
    print("="*40)
