import psycopg2

def consertar_tudo():
    try:
        print("--- Tentando Conexao Direta ---")
        
        # COLOQUE SEUS DADOS AQUI ENTRE AS ASPAS:
        conn = psycopg2.connect(
            host="localhost",
            database="QuimicaExperta", 
            user="postgres",             
            password= "admin123",   
            port="5432"
        )
        cur = conn.cursor()

        # Criando a tabela se ela nao existir (para garantir que tenha onde por a coluna)
        cur.execute("""
            CREATE TABLE IF NOT EXISTS compounds (
                cas VARCHAR(20) PRIMARY KEY,
                nome VARCHAR(255),
                epsilon_m_cm FLOAT,
                lambda_max VARCHAR(50),
                fonte VARCHAR(100)
            );
        """)

        # Agora adiciona a coluna solvente
        cur.execute("ALTER TABLE compounds ADD COLUMN IF NOT EXISTS solvente VARCHAR(100);")
        
        conn.commit()
        print("✅ SUCESSO! Banco conectado e coluna 'solvente' criada!")
        
        cur.close()
        conn.close()

    except Exception as e:
        print("\n❌ ERRO REAL:")
        # Se der erro, ele vai imprimir de um jeito que nao trava o VS Code
        print(repr(e))

if __name__ == "__main__":
    consertar_tudo()