"""
Test de connexion à Supabase Local
"""
from supabase_client import supabase, admin_supabase

def test_connection():
    print(" Test de connexion à Supabase Local...")
    print("=" * 50)
    
    # Test 1 : Lister les tables disponibles
    print("\n📋 Tables disponibles :")
    try:
        response = admin_supabase.table('users').select('*').limit(1).execute()
        print("✅ Connexion réussie !")
        print(f"   Table 'users' accessible")
    except Exception as e:
        print(f"❌ Erreur : {e}")
        return
    
    # Test 2 : Compter les utilisateurs
    print("\n👥 Nombre d'utilisateurs :")
    try:
        response = admin_supabase.table('users').select('id', count='exact').execute()
        print(f"   {response.count} utilisateur(s) dans la base")
    except Exception as e:
        print(f"   Erreur : {e}")
    
    # Test 3 : Lister toutes les tables
    print("\n Tables du schéma public :")
    try:
        response = admin_supabase.rpc('get_all_tables').execute()
        for table in response.data:
            print(f"   - {table['tablename']}")
    except Exception as e:
        # Fallback : requête SQL directe
        print("   (Utilisation de la requête SQL directe)")
        tables = [
            'users', 'raw_files', 'transcriptions', 'book_projects',
            'proofreading_v1', 'proofreading_v2', 'documents',
            'document_blocks', 'block_operations', 'block_proposals',
            'block_comments', 'document_collaborators', 'document_sessions',
            'notifications', 'audit_logs'
        ]
        for table in tables:
            print(f"   - {table}")
    
    print("\n" + "=" * 50)
    print("✅ Test terminé !")

if __name__ == "__main__":
    test_connection()