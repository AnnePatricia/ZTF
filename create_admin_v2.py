"""
Création du compte admin via le SDK Supabase (méthode fiable)
"""
from supabase import create_client

SUPABASE_URL = "http://127.0.0.1:54321"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

EMAIL = "kamfotsobruno@gmail.com"
PASSWORD = "123456789"

supabase = create_client(SUPABASE_URL, SERVICE_KEY)

print("=" * 60)
print(" CREATION DU COMPTE ADMIN VIA SDK SUPABASE")
print("=" * 60)

# Étape 1 : Nettoyer l'ancien compte
print("\n1. Nettoyage de l'ancien compte...")
try:
    existing = supabase.table('users').select('id').eq('email', EMAIL).execute()
    if existing.data:
        user_id = existing.data[0]['id']
        print(f"   Utilisateur trouve: {user_id}")
        supabase.table('users').delete().eq('id', user_id).execute()
        print("   Profil public supprime")
        try:
            supabase.auth.admin.delete_user(user_id)
            print("   Utilisateur auth supprime")
        except Exception as e:
            print(f"   Note auth: {e}")
    else:
        print("   Aucun utilisateur existant")
except Exception as e:
    print(f"   Note: {e}")

# Étape 2 : Créer le compte via l'API admin
print("\n2. Creation du compte via API Auth...")
try:
    response = supabase.auth.admin.create_user({
        "email": EMAIL,
        "password": PASSWORD,
        "email_confirm": True,
        "user_metadata": {"full_name": "KAMDEM FOTSO Bruno"}
    })
    user_id = response.user.id
    print(f"   Compte cree avec succes!")
    print(f"   ID: {user_id}")
    print(f"   Email confirme: {response.user.email_confirmed_at is not None}")
except Exception as e:
    print(f"   ERREUR: {e}")
    print("\n   Essayons avec un autre email...")
    EMAIL = "admin@bcmgest.local"
    try:
        response = supabase.auth.admin.create_user({
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Admin BCM"}
        })
        user_id = response.user.id
        print(f"   Compte cree avec: {EMAIL}")
    except Exception as e2:
        print(f"   ERREUR FINALE: {e2}")
        exit(1)

# Étape 3 : Créer le profil public
print("\n3. Creation du profil dans public.users...")
try:
    supabase.table('users').insert({
        "id": user_id,
        "email": EMAIL,
        "full_name": "KAMDEM FOTSO Bruno",
        "role": "admin",
        "timezone": "Africa/Douala",
        "preferred_lang": "fr",
        "can_import": True,
        "can_transcribe": True,
        "can_review": True,
        "can_edit": True,
        "can_delete": True,
        "can_manage_users": True,
        "is_active": True
    }).execute()
    print("   Profil cree avec toutes les permissions admin")
except Exception as e:
    print(f"   ERREUR: {e}")
    exit(1)

# Étape 4 : Tester la connexion
print("\n4. Test de connexion...")
try:
    login = supabase.auth.sign_in_with_password({
        "email": EMAIL,
        "password": PASSWORD
    })
    if login.user:
        print(f"   CONNEXION REUSSIE!")
        print(f"   Token: {login.session.access_token[:50]}...")
    else:
        print(f"   Echec de connexion")
except Exception as e:
    print(f"   ERREUR: {e}")
    exit(1)

print("\n" + "=" * 60)
print(" COMPTE ADMIN CREE AVEC SUCCES!")
print("=" * 60)
print(f"Email: {EMAIL}")
print(f"Mot de passe: {PASSWORD}")
print(f"Role: admin")
print("=" * 60)