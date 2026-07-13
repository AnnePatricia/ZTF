"""
Client Supabase - Configuration locale et production
"""
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

def get_supabase_client() -> Client:
    """
    Retourne un client Supabase configuré (local ou production)
    """
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_ANON_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL et SUPABASE_ANON_KEY doivent être définis dans .env")
    
    supabase: Client = create_client(url, key)
    return supabase

def get_service_client() -> Client:
    """
    Retourne un client Supabase avec les droits admin (service_role)
    À utiliser uniquement côté serveur, jamais côté client
    """
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_SERVICE_KEY")
    
    if not url or not key:
        raise ValueError("SUPABASE_URL et SUPABASE_SERVICE_KEY doivent être définis dans .env")
    
    supabase: Client = create_client(url, key)
    return supabase

# Client par défaut (anonyme)
supabase = get_supabase_client()

# Client admin (service_role)
admin_supabase = get_service_client()