"""
Création du compte admin - Version finale avec nettoyage complet
"""
from supabase import create_client
import time

SUPABASE_URL = "http://127.0.0.1:54321"
SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

EMAIL = "kamfotsobruno@gmail.com"
PASSWORD = "123456789"

supabase = create_client(SUPABASE_URL, SERVICE_KEY)

print("=" * 60)
print(" CREATION DU COMPTE ADMIN - VERSION FINALE")
print("=" * 60)

# Étape 1 : Nettoyer les orphelins via SQL direct
print("\n1. Nettoyage des entrées orphelines...")
try:
    # Supprimer les orphelins dans public.users
    supabase.rpc('exec_sql', {
        'sql': """
        DELETE FROM public.users 
        WHERE id NOT IN (SELECT id FROM auth.users);
        """
    }).execute()
    print("   ✅ Orphelins supprimés")
except Exception as e:
    print(f"   ⚠️  Note: {e}")

# Étape 2 : Créer l'utilisateur via l'API Auth
print("\n2. Création du compte via API Auth...")
try:
    response = supabase.auth.admin.create_user({
        "email": EMAIL,
        "password": PASSWORD,
        "email_confirm": True,
        "user_metadata": {"full_name": "KAMDEM FOTSO Bruno"}
    })
    user_id = response.user.id
    print(f"   ✅ Compte créé avec succès!")
    print(f"   🆔 ID: {user_id}")
    print(f"   📧 Email: {response.user.email}")
    print(f"   ✅ Email confirmé: {response.user.email_confirmed_at is not None}")
except Exception as e:
    print(f"   ❌ Erreur: {e}")
    exit(1)

# Attendre un peu pour que la base se synchronise
time.sleep(1)

# Étape 3 : Créer le profil dans public.users
print("\n3. Création du profil dans public.users...")
try:
    profile_data = {
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
    }
    
    supabase.table('users').insert(profile_data).execute()
    print("   ✅ Profil créé avec toutes les permissions admin")
    
except Exception as e:
    print(f"   ❌ Erreur: {e}")
    print("\n   Tentative avec un autre email...")
    
    # Si ça échoue, essayer avec un email différent
    EMAIL = "admin@bcmgest.local"
    try:
        response = supabase.auth.admin.create_user({
            "email": EMAIL,
            "password": PASSWORD,
            "email_confirm": True,
            "user_metadata": {"full_name": "Admin BCM"}
        })
        user_id = response.user.id
        
        profile_data["id"] = user_id
        profile_data["email"] = EMAIL
        profile_data["full_name"] = "Admin BCM"
        
        supabase.table('users').insert(profile_data).execute()
        print(f"   ✅ Compte créé avec: {EMAIL}")
    except Exception as e2:
        print(f"   ❌ Erreur finale: {e2}")
        exit(1)

# Étape 4 : Tester la connexion
print("\n4. Test de connexion...")
try:
    login = supabase.auth.sign_in_with_password({
        "email": EMAIL,
        "password": PASSWORD
    })
    if login.user:
        print(f"   ✅ CONNEXION RÉUSSIE!")
        print(f"    Token: {login.session.access_token[:50]}...")
    else:
        print(f"   ❌ Échec de connexion")
except Exception as e:
    print(f"   ❌ Erreur: {e}")
    exit(1)

print("\n" + "=" * 60)
print(" COMPTE ADMIN CRÉÉ AVEC SUCCÈS!")
print("=" * 60)
print(f"Email: {EMAIL}")
print(f"Mot de passe: {PASSWORD}")
print(f"Rôle: admin")
print("=" * 60)
print("\n🎉 Vous pouvez maintenant vous connecter depuis React!")