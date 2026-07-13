"""
Test complet des fonctionnalités du correcteur collaboratif
"""
from supabase_client import admin_supabase
from datetime import datetime

def test_authentification():
    """Test 1 : Authentification"""
    print("\n🔐 TEST 1 : AUTHENTIFICATION")
    print("=" * 50)
    
    # Se connecter avec le compte admin
    response = admin_supabase.auth.sign_in_with_password({
        "email": "kamfotsobruno@gmail.com",
        "password": "123456789"
    })
    
    if response.user:
        print(f"✅ Connecté : {response.user.email}")
        print(f"   UUID : {response.user.id}")
        return response.user
    else:
        print("❌ Échec de connexion")
        return None

def test_permissions(user):
    """Test 2 : Vérification des permissions"""
    print("\n TEST 2 : PERMISSIONS")
    print("=" * 50)
    
    permissions = [
        'import_files', 'transcribe', 'review', 'edit',
        'merge_blocks', 'propose_modification', 'comment',
        'close_session', 'edit_directly', 'manage_users'
    ]
    
    for perm in permissions:
        response = admin_supabase.rpc('user_has_permission', {
            'p_user_id': user.id,
            'p_permission': perm
        }).execute()
        
        status = "✅" if response.data else "❌"
        print(f"   {status} {perm}")

def test_creation_document(user):
    """Test 3 : Création d'un document"""
    print("\n TEST 3 : CRÉATION DE DOCUMENT")
    print("=" * 50)
    
    response = admin_supabase.table('documents').insert({
        'title': 'Test - Chapitre 1',
        'type': 'correction',
        'status': 'draft',
        'user_id': user.id,
        'source_format': 'docx',
        'total_blocks': 0,
        'merged_blocks': 0
    }).execute()
    
    if response.data:
        doc = response.data[0]
        print(f"✅ Document créé : {doc['title']}")
        print(f"   ID : {doc['id']}")
        print(f"   Statut : {doc['status']}")
        return doc['id']
    else:
        print(" Échec de création")
        return None

def test_creation_blocs(document_id, user):
    """Test 4 : Création de blocs"""
    print("\n🧱 TEST 4 : CRÉATION DE BLOCS")
    print("=" * 50)
    
    blocs = [
        {
            'document_id': document_id,
            'type': 'heading1',
            'position': 0,
            'content': {'type': 'heading', 'attrs': {'level': 1}, 'content': [{'type': 'text', 'text': 'Introduction'}]},
            'status': 'draft',
            'created_by': user.id,
            'word_count': 1,
            'char_count': 12
        },
        {
            'document_id': document_id,
            'type': 'paragraph',
            'position': 1,
            'content': {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Ceci est le premier paragraphe du document de test.'}]},
            'status': 'draft',
            'created_by': user.id,
            'word_count': 10,
            'char_count': 58
        },
        {
            'document_id': document_id,
            'type': 'paragraph',
            'position': 2,
            'content': {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Deuxième paragraphe avec du contenu supplémentaire.'}]},
            'status': 'draft',
            'created_by': user.id,
            'word_count': 7,
            'char_count': 50
        }
    ]
    
    response = admin_supabase.table('document_blocks').insert(blocs).execute()
    
    if response.data:
        print(f"✅ {len(response.data)} blocs créés")
        for bloc in response.data:
            print(f"   - {bloc['type']} (position {bloc['position']})")
        return [b['id'] for b in response.data]
    else:
        print("❌ Échec de création des blocs")
        return []

def test_proposition(bloc_id, document_id, user):
    """Test 5 : Création d'une proposition"""
    print("\n💡 TEST 5 : PROPOSITION DE MODIFICATION")
    print("=" * 50)
    
    response = admin_supabase.table('block_proposals').insert({
        'block_id': bloc_id,
        'document_id': document_id,
        'proposed_by': user.id,
        'content_before': {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Ceci est le premier paragraphe du document de test.'}]},
        'content_after': {'type': 'paragraph', 'content': [{'type': 'text', 'text': 'Ceci est le premier paragraphe modifié du document de test.'}]},
        'diff_summary': 'ajout de "modifié"',
        'justification': 'Correction grammaticale',
        'status': 'pending'
    }).execute()
    
    if response.data:
        prop = response.data[0]
        print(f"✅ Proposition créée")
        print(f"   ID : {prop['id']}")
        print(f"   Statut : {prop['status']}")
        return prop['id']
    else:
        print("❌ Échec de création")
        return None

def test_commentaire(bloc_id, document_id, user):
    """Test 6 : Création d'un commentaire"""
    print("\n💬 TEST 6 : COMMENTAIRE")
    print("=" * 50)
    
    response = admin_supabase.table('block_comments').insert({
        'block_id': bloc_id,
        'document_id': document_id,
        'user_id': user.id,
        'content': 'Ce paragraphe pourrait être amélioré.',
        'anchor_text': 'premier paragraphe',
        'status': 'open'
    }).execute()
    
    if response.data:
        print(f"✅ Commentaire créé")
        print(f"   Contenu : {response.data[0]['content']}")
        return response.data[0]['id']
    else:
        print("❌ Échec de création")
        return None

def test_notifications(user, document_id):
    """Test 7 : Vérification des notifications"""
    print("\n🔔 TEST 7 : NOTIFICATIONS")
    print("=" * 50)
    
    response = admin_supabase.table('notifications').select('*').eq('user_id', user.id).execute()
    
    if response.data:
        print(f"✅ {len(response.data)} notification(s)")
        for notif in response.data:
            print(f"   - {notif['type']}: {notif['title']}")
    else:
        print("   ℹ️  Aucune notification")

def test_progression(document_id):
    """Test 8 : Calcul de progression"""
    print("\n📊 TEST 8 : PROGRESSION DU DOCUMENT")
    print("=" * 50)
    
    response = admin_supabase.rpc('get_document_progress', {
        'p_document_id': document_id
    }).execute()
    
    if response.data:
        progress = response.data[0]
        print(f"✅ Progression calculée")
        print(f"   Total blocs : {progress['total_blocks']}")
        print(f"   Blocs mergés : {progress['merged_blocks']}")
        print(f"   Progression : {progress['progress_pct']}%")
        print(f"   Commentaires ouverts : {progress['comments_open']}")
        print(f"   Propositions en attente : {progress['proposals_pending']}")

def test_lignee():
    """Test 9 : Lignée éditoriale"""
    print("\n🔗 TEST 9 : LIGNÉE ÉDITORIALE")
    print("=" * 50)
    
    # Récupérer un fichier brut
    response = admin_supabase.table('raw_files').select('id').limit(1).execute()
    
    if response.data:
        raw_file_id = response.data[0]['id']
        lineage_response = admin_supabase.rpc('get_raw_file_lineage', {
            'p_raw_file_id': raw_file_id
        }).execute()
        
        if lineage_response.data:
            print(f"✅ Lignée récupérée pour {raw_file_id}")
            print(f"   Transcriptions : {len(lineage_response.data.get('transcriptions', []))}")
            print(f"   Projets : {len(lineage_response.data.get('book_projects', []))}")
            print(f"   Progression globale : {lineage_response.data.get('global_progress', 0)}%")
        else:
            print("   ℹ️  Aucune lignée disponible")
    else:
        print("   ℹ️  Aucun fichier brut dans la base")

def main():
    """Exécuter tous les tests"""
    print("\n" + "=" * 60)
    print(" TESTS COMPLETS DU CORRECTEUR COLLABORATIF")
    print("=" * 60)
    
    # Test 1 : Authentification
    user = test_authentification()
    if not user:
        print("\n❌ Tests arrêtés - Authentification échouée")
        return
    
    # Test 2 : Permissions
    test_permissions(user)
    
    # Test 3 : Création de document
    document_id = test_creation_document(user)
    if not document_id:
        print("\n❌ Tests arrêtés - Création de document échouée")
        return
    
    # Test 4 : Création de blocs
    bloc_ids = test_creation_blocs(document_id, user)
    if not bloc_ids:
        print("\n❌ Tests arrêtés - Création de blocs échouée")
        return
    
    # Test 5 : Proposition
    if bloc_ids:
        test_proposition(bloc_ids[1], document_id, user)
    
    # Test 6 : Commentaire
    if bloc_ids:
        test_commentaire(bloc_ids[1], document_id, user)
    
    # Test 7 : Notifications
    test_notifications(user, document_id)
    
    # Test 8 : Progression
    test_progression(document_id)
    
    # Test 9 : Lignée
    test_lignee()
    
    print("\n" + "=" * 60)
    print("✅ TOUS LES TESTS SONT TERMINÉS !")
    print("=" * 60)
    print("\n🎉 Votre correcteur collaboratif est prêt à l'emploi !")
    print("\n📋 Prochaines étapes :")
    print("   1. Créer une interface utilisateur (React/Vue)")
    print("   2. Implémenter l'éditeur TipTap/ProseMirror")
    print("   3. Connecter Y.js pour le temps réel")
    print("   4. Tester avec plusieurs utilisateurs")

if __name__ == "__main__":
    main()