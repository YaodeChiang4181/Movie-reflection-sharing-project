import psycopg2
import sys

url = "postgresql://neondb_owner:npg_b9vgkYFR6Opm@ep-ancient-haze-a649o8w0-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"

try:
    conn = psycopg2.connect(url)
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
    """)
    tables = cur.fetchall()

    for table in tables:
        cur.execute(f"DROP TABLE IF EXISTS \"{table[0]}\" CASCADE;")
        print(f"Dropped {table[0]}")

    cur.close()
    conn.close()
    print("All tables dropped successfully.")
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
