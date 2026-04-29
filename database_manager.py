import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

def conectar_banco():
    try:
        # Tenta usar a URL do .env, se não houver, usa os dados manuais
        db_url = os.getenv("DATABASE_URL")
        if db_url:
            return psycopg2.connect(db_url)
        
        return psycopg2.connect(
            host="localhost",
            database="QuimicaExperta", 
            user="postgres",
            password="admin123", 
            port="5432"
        )
    except Exception as e:
        msg_limpa = str(e).encode('ascii', 'ignore').decode('ascii')
        print(f"\n--- ERRO REAL NO BANCO ---\n{msg_limpa}\n--------------------------")
        return None # Retorna None em vez de estourar o programa

def salvar_composto_banco(cas_id, nome, epsilon, lambda_max, fonte, solvente):
    conn = conectar_banco()
    if not conn: return
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO compounds (cas, nome, epsilon_m_cm, lambda_max, fonte, solvente)
                VALUES (%s, %s, %s, %s, %s, %s)
                ON CONFLICT (cas) DO UPDATE SET
                    nome = EXCLUDED.nome,
                    epsilon_m_cm = EXCLUDED.epsilon_m_cm,
                    lambda_max = EXCLUDED.lambda_max,
                    fonte = EXCLUDED.fonte,
                    solvente = EXCLUDED.solvente;
            """, (cas_id, nome, epsilon, str(lambda_max), fonte, solvente))
        conn.commit()
        print(f"✅ {nome} salvo com sucesso!")
    except Exception as e:
        print(f"❌ Erro ao salvar: {e}")
    finally:
        conn.close()

def garantir_dados_padrao():
    # ADICIONEI O SOLVENTE 'N/A' PARA COMPLETAR OS 6 ARGUMENTOS
    salvar_composto_banco("61-73-4", "Azul de Metileno", 80000, "664", "Padrao", "Agua")
    salvar_composto_banco("77-09-8", "Fenolftaleína", 25000, "552", "Padrao", "Etanol")

def carregar_database(base_local=None):
    db_dict = base_local if base_local is not None else {}
    conn = conectar_banco()
    if not conn: return db_dict

    try:
        with conn.cursor() as cur:
            # Forçamos a leitura das 6 colunas que criamos no Passo 1
            cur.execute("SELECT cas, nome, epsilon_m_cm, lambda_max, fonte, solvente FROM compounds;")
            rows = cur.fetchall()
            
            for row in rows:
                db_dict[row[0]] = {
                    "nome": row[1],
                    "epsilon": row[2] if row[2] else 0,
                    "lambda_max": row[3] if row[3] else "N/A",
                    "fonte": row[4] if row[4] else "N/A",
                    "solvente": row[5] if row[5] else "N/A"
                }
            print(f"✅ Sucesso: {len(rows)} compostos integrados do banco.")
            return db_dict
    except Exception as e:
        print(f"⚠️ Aviso: O banco ainda está com 3 colunas. Erro: {e}")
        return db_dict 
    finally:
        if conn: conn.close()