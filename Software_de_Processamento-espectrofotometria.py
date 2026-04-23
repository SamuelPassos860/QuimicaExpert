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

def carregar_database(caminho_db):
    database_epsilon = {}
    if not os.path.exists(caminho_db):
        return database_epsilon

    with open(caminho_db, 'r', encoding='utf-8', errors='ignore') as f:
        for linha in f:
            partes = [p.strip() for p in linha.split() if p.strip()]

# Se a linha tem os dados, o nome do arquivo (ex: A01...) 
# costuma estar na posição partes[1] ou partes[2]
            if len(partes) >= 7:
                try:    
                     # Vamos procurar em qual coluna está o texto que termina com '.txt'
# Se não achar, tentamos a coluna 1 (segunda coluna)
                    nome_composto = partes[1]
                    # O Epsilon (ε) no seu arquivo está na coluna 6 (índice 6)
                    valor_raw = partes[6].replace('"', '').replace(',', '')
                    database_epsilon[nome_composto] = float(valor_raw)
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
        for chave_nome in meu_dicionario.keys():
            partes_arq = chave_nome.split('_')
            if (len(partes_arq) > 1 and entrada_busca == partes_arq[1]) or (busca_lower in chave_nome.lower()):
                eps = meu_dicionario[chave_nome]
                nome_exibicao = chave_nome.replace('.abs.txt', '')
                origem_detectada = "PhotochemCAD"
                print(f"✅ Encontrado na Database: {nome_exibicao}")
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
    if origem_detectada != "Biblioteca Local":
        confirmar = input(f"\n⭐ Deseja salvar '{nome_exibicao}' na sua biblioteca permanente? (s/n): ").strip().lower()
        if confirmar == 's':
            cas_id = input("Digite o CAS para registro: ").strip() or "S/CAS"
            compostos_db[cas_id] = {
                'nome': nome_exibicao,
                'coeficiente_molar': eps,
                'nm': 'N/A', 
                'origem': origem_detectada
            }
            salvar_biblioteca()
            print(f"💾 '{nome_exibicao}' foi adicionado ao seu dicionário!")

    # Retorna o relatório final
    return (f"\n--- RELATÓRIO FINAL ---\n"
            f"Composto: {nome_exibicao}\n"
            f"ε: {eps} M⁻¹cm⁻¹\n"
            f"Absorbância: {absorbancia:.4f}")

def mostrar_biblioteca_salva():
    print("\n" + "="*75)
    print(f"{'CAS':<15} | {'Nome':<25} | {'ε (M⁻¹cm⁻¹)':<12} | {'λmax':<8} | {'Fonte'}")
    print("-" * 75)
    print('Cheguei no meu dicionario.com.br')
    for cas, info in compostos_db.items():
        origem = info.get('origem', 'N/A')
        print(f"{cas:<15} | {info['nome'][:25]:<25} | {info['coeficiente_molar']:<12} | {info['nm']:<8} | {origem}")
    print("="*75 + "\n")

if __name__ == "__main__":
    mostrar_biblioteca_salva()
    resultado = processo_analitico()
    print("\n" + "="*40)
    print(resultado)
    print("="*40)
