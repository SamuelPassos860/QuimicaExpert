import os
from calculation import iniciar_fluxo_analitico
from database_manager import salvar_composto_banco, conectar_banco, carregar_database
from psycopg2.extras import RealDictCursor 

def carregar_biblioteca():
    """Busca os compostos já salvos no seu banco de dados pessoal."""
    compostos = {}
    try:
        conn = conectar_banco()
        if conn:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT cas, nome, epsilon_m_cm, lambda_max, fonte, solvente 
                    FROM compounds 
                    ORDER BY nome;
                """)
                rows = cur.fetchall()

                for row in rows:
                    # MUDANÇA IMPORTANTE: 
                    # Use 'epsilon' em vez de 'coeficiente_molar'
                    # Use 'lambda_max' em vez de 'nm'
                    compostos[row["cas"]] = {
                        "nome": row["nome"],
                        "epsilon": float(row["epsilon_m_cm"]) if row["epsilon_m_cm"] is not None else 0.0,
                        "lambda_max": row["lambda_max"] or "N/A",
                        "fonte": row["fonte"] or "N/A",
                        "solvente": row["solvente"] or "N/A"
                    }
            conn.close()
    except Exception as e:
        print(f"Erro ao carregar biblioteca: {e}")
    
    return compostos

def mostrar_biblioteca_salva(compostos_db):
    """Exibe no console a lista de compostos disponíveis no banco."""
    # Cabeçalho formatado para 115 caracteres
    print("\n" + "=" * 115)
    print(f"{'CAS':<15} | {'Nome':<30} | {'ε (M⁻¹cm⁻¹)':<12} | {'λmax':<8} | {'Fonte':<15} | {'Solvente'}")
    print("-" * 115)

    for cas, info in compostos_db.items():
        # Agora as chaves batem com o que foi carregado acima!
        nome = info.get('nome', 'N/A')
        epsilon = info.get('epsilon', 0)
        nm = info.get('lambda_max', 'N/A')
        fonte = info.get('fonte', 'N/A')
        solvente = info.get('solvente', 'N/A')

        print(
            f"{cas:<15} | "
            f"{nome[:30]:<30} | "
            f"{epsilon:<12.0f} | "
            f"{str(nm):<8} | "
            f"{fonte[:15]:<15} | "
            f"{solvente}"
        )
    print("=" * 115 + "\n")

if __name__ == "__main__":
    compostos_db = carregar_biblioteca()
    meu_dicionario = carregar_database(compostos_db) 
    print(f"DEBUG: Total de compostos integrados: {len(meu_dicionario)}")
    if meu_dicionario:
        mostrar_biblioteca_salva(meu_dicionario)
    
    # 4. Inicia o fluxo usando a base completa
    iniciar_fluxo_analitico(meu_dicionario, meu_dicionario, salvar_composto_banco)