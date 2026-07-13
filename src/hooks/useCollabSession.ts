// =====================================================
// HOOK: useCollabSession
// Description: Gestion de la session collaborative (présence live, curseurs)
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';

// =====================================================
// TYPES
// =====================================================

export interface Collaborator {
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  cursor_color: string;
  cursor_label: string;
  block_id?: string;
  is_typing: boolean;
  last_ping_at: string;
}

export interface SessionState {
  is_online: boolean;
  block_id?: string;
  cursor_pos: number;
  is_typing: boolean;
}

export interface UseCollabSessionReturn {
  collaborators: Collaborator[];
  myColor: string;
  mySession: SessionState;
  loading: boolean;
  error: string | null;
  joinSession: (documentId: string) => Promise<void>;
  leaveSession: (documentId: string) => Promise<void>;
  updateCursorPosition: (blockId: string, pos: number) => Promise<void>;
  updateTypingStatus: (isTyping: boolean) => Promise<void>;
  getOnlineCount: () => number;
}

// =====================================================
// COULEURS DE CURSEUR PRÉDÉFINIES
// =====================================================

const CURSOR_COLORS = [
  '#2563EB', // Bleu
  '#D97706', // Ambre
  '#7C3AED', // Violet
  '#059669', // Vert
  '#DC2626', // Rouge
  '#DB2777', // Rose
  '#0891B2', // Cyan
  '#7C3AED', // Indigo
];

// =====================================================
// HOOK
// =====================================================

export function useCollabSession(documentId?: string): UseCollabSessionReturn {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [myColor, setMyColor] = useState<string>('#2563EB');
  const [mySession, setMySession] = useState<SessionState>({
    is_online: false,
    cursor_pos: 0,
    is_typing: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // =====================================================
  // 1. REJOINDRE LA SESSION
  // =====================================================

  const joinSession = useCallback(async (docId: string) => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) {
        throw new Error('Utilisateur non connecté');
      }

      // Vérifier si on est déjà dans la session
      const { data: existing } = await supabase
        .from('document_sessions')
        .select('*')
        .eq('document_id', docId)
        .eq('user_id', userId)
        .single();

      if (existing) {
        // Mettre à jour la session existante
        await supabase.rpc('update_session_heartbeat', {
          p_document_id: docId,
          p_user_id: userId,
          p_is_typing: false,
        });

        setMyColor(existing.cursor_color || CURSOR_COLORS[0]);
        setMySession({
          is_online: existing.is_online,
          block_id: existing.block_id || undefined,
          cursor_pos: existing.cursor_pos || 0,
          is_typing: existing.is_typing,
        });
      } else {
        // Créer une nouvelle session
        const { data: newSession } = await supabase
          .from('document_sessions')
          .insert([{
            document_id: docId,
            user_id: userId,
            cursor_color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)],
            cursor_label: user.data.user?.email?.substring(0, 2).toUpperCase() || 'U',
            is_online: true,
            is_typing: false,
          }])
          .select()
          .single();

        if (newSession) {
          setMyColor(newSession.cursor_color);
          setMySession({
            is_online: newSession.is_online,
            block_id: newSession.block_id || undefined,
            cursor_pos: newSession.cursor_pos || 0,
            is_typing: newSession.is_typing,
          });
        }
      }

      // Marquer comme rejoint dans document_collaborators
      await supabase.rpc('join_session', {
        p_document_id: docId,
        p_user_id: userId,
      });
    } catch (err: any) {
      console.error('Erreur joinSession:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // =====================================================
  // 2. QUITTER LA SESSION
  // =====================================================

  const leaveSession = useCallback(async (docId: string) => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId) return;

      // Marquer comme déconnecté
      await supabase.rpc('disconnect_session', {
        p_document_id: docId,
        p_user_id: userId,
      });

      setMySession(prev => ({ ...prev, is_online: false }));
    } catch (err: any) {
      console.error('Erreur leaveSession:', err);
    }
  }, []);

  // =====================================================
  // 3. METTRE À JOUR LA POSITION DU CURSEUR
  // =====================================================

  const updateCursorPosition = useCallback(async (
    blockId: string,
    pos: number
  ) => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId || !documentId) return;

      await supabase.rpc('update_session_heartbeat', {
        p_document_id: documentId,
        p_user_id: userId,
        p_block_id: blockId,
        p_cursor_pos: pos,
        p_is_typing: false,
      });

      setMySession(prev => ({
        ...prev,
        block_id: blockId,
        cursor_pos: pos,
      }));
    } catch (err: any) {
      console.error('Erreur updateCursorPosition:', err);
    }
  }, [documentId]);

  // =====================================================
  // 4. METTRE À JOUR LE STATUT DE FRAPPE
  // =====================================================

  const updateTypingStatus = useCallback(async (isTyping: boolean) => {
    try {
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;

      if (!userId || !documentId) return;

      await supabase.rpc('update_session_heartbeat', {
        p_document_id: documentId,
        p_user_id: userId,
        p_is_typing: isTyping,
      });

      setMySession(prev => ({ ...prev, is_typing: isTyping }));
    } catch (err: any) {
      console.error('Erreur updateTypingStatus:', err);
    }
  }, [documentId]);

  // =====================================================
  // 5. OBTENIR LE NOMBRE DE COLLABORATEURS EN LIGNE
  // =====================================================

  const getOnlineCount = (): number => {
    return collaborators.filter(c => c.is_online).length;
  };

  // =====================================================
  // CHARGEMENT INITIAL
  // =====================================================

  useEffect(() => {
    if (documentId) {
      joinSession(documentId);
    }
  }, [documentId, joinSession]);

  // =====================================================
  // HEARTBEAT (toutes les 30 secondes)
  // =====================================================

  useEffect(() => {
    if (!documentId || !mySession.is_online) return;

    const heartbeatInterval = setInterval(() => {
      const user = supabase.auth.getUser();
      user.then(({ data }) => {
        if (data.user?.id) {
          supabase.rpc('update_session_heartbeat', {
            p_document_id: documentId,
            p_user_id: data.user.id,
            p_is_typing: mySession.is_typing,
          });
        }
      });
    }, 30000); // 30 secondes

    return () => clearInterval(heartbeatInterval);
  }, [documentId, mySession.is_online, mySession.is_typing]);

  // =====================================================
  // REALTIME SUBSCRIPTION - COLLABORATEURS
  // =====================================================

  useEffect(() => {
    if (!documentId) return;

    const channel = supabase
      .channel(`sessions-${documentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'document_sessions',
          filter: `document_id=eq.${documentId}`,
        },
        async (payload) => {
          // Récupérer les collaborateurs en ligne
          const { data } = await supabase.rpc('get_online_collaborators', {
            p_document_id: documentId,
          });

          if (data) {
            setCollaborators(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [documentId]);

  // =====================================================
  // NETTOYAGE À LA DÉCONNEXION
  // =====================================================

  useEffect(() => {
    return () => {
      if (documentId) {
        leaveSession(documentId);
      }
    };
  }, [documentId, leaveSession]);

  // =====================================================
  // RETOUR DU HOOK
  // =====================================================

  return {
    collaborators,
    myColor,
    mySession,
    loading,
    error,
    joinSession,
    leaveSession,
    updateCursorPosition,
    updateTypingStatus,
    getOnlineCount,
  };
}
