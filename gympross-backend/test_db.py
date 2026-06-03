import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()
url = os.environ.get('SUPABASE_URL')
key = os.environ.get('SUPABASE_KEY')
supabase = create_client(url, key)

res = supabase.table('gimnasios').select('*').limit(1).execute()
if res.data:
    print("Columns in gimnasios:")
    for k in res.data[0].keys():
        print(f" - {k}")
else:
    print("No data in gimnasios")
