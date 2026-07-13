// src/services/superCorrectionService.ts
import { supabase } from '../supabaseClient';
import type {
  SuperCorrectionPublication,
  SCCorrecteur,
  SCCommentaire,
  SCStatus,
  SCCommentType,
} from '../types/superCorrection';

export class SuperCorrectionService {

  // =====================================================
  // 📖 PUBLICATIONS
  // =====================================================

  static async getPublications(includeClosed = false): Promise<SuperCorrectionPublication[]> {
    let query = supabase
      .from('super_correction_publications')
      .select(`
        *,
        book:ztf_books(id, ztf_id, title, theme, language, ztf_status, content),
        publisher:ztf_users!published_by(id, full_name, email),
        correcteurs:sc_correcteurs(
          id,
          user_id,
          invite_email,
          reading_progress,
          has_validated,
          validated_at,
          user:ztf_users(id, full_name, email)
        ),
        commentaires:sc_commentaires(
          id,
          contenu,
          type_commentaire,
          texte_selectionne,
          resolu,
          created_at,
          correcteur:sc_correcteurs(
            id,
            user:ztf_users(full_name, email),
            invite_email
          )
        )
      `)
      .order('published_at', { ascending: false });

    if (!includeClosed) {
      query = query.neq('sc_status', 'CLOSED');
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  static async getPublication(id: string): Promise<SuperCorrectionPublication | null> {
    const { data, error } = await supabase
      .from('super_correction_publications')
      .select(`
        *,
        book:ztf_books(id, ztf_id, title, theme, language, ztf_status, content),
        publisher:ztf_users!published_by(id, full_name, email),
        correcteurs:sc_correcteurs(
          id,
          user_id,
          invite_email,
          reading_progress,
          has_validated,
          validated_at,
          expires_at,
          user:ztf_users(id, full_name, email)
        ),
        commentaires:sc_commentaires(
          *,
          correcteur:sc_correcteurs(id, user:ztf_users(full_name, email), invite_email)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  // ✅ CORRECTION: bookId doit être un UUID, pas un ztf_id
  static async publishBook(
    bookId: string,
    validationThreshold: number,
    languageScope: 'EN' | 'FR' | 'BOTH',
    publishedBy: string,
    fileUrl?: string
  ): Promise<SuperCorrectionPublication> {
    const insertData: any = {
      book_id: bookId,
      validation_threshold: validationThreshold,
      language_scope: languageScope,
      published_by: publishedBy,
      sc_status: 'OPEN'
    };

    if (fileUrl) {
      insertData.file_url = fileUrl;
    }

    // ✅ Étape 1: Insertion simple
    const { data: inserted, error: insertError } = await supabase
      .from('super_correction_publications')
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Erreur insertion:', insertError);
      throw insertError;
    }

    // ✅ Étape 2: Récupérer les données complètes avec jointures
    const { data: publication, error: selectError } = await supabase
      .from('super_correction_publications')
      .select(`
      *,
      book:ztf_books(id, ztf_id, title, theme, language, ztf_status, content),
      publisher:ztf_users!super_correction_publications_published_by_fkey(id, full_name, email)
    `)
      .eq('id', inserted.id)
      .single();

    if (selectError) {
      console.error('❌ Erreur sélection:', selectError);
      throw selectError;
    }

    return publication as SuperCorrectionPublication;
  }

  static async updateStatus(
    publicationId: string,
    newStatus: SCStatus,
    userId: string,  // ✅ Maintenant utilisé pour l'audit
    unlockReason?: string
  ): Promise<void> {
    const updateData: any = {
      sc_status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === 'LOCKED') updateData.locked_at = new Date().toISOString();
    if (newStatus === 'CLOSED') updateData.closed_at = new Date().toISOString();
    if (newStatus === 'OPEN' && unlockReason) updateData.unlock_reason = unlockReason;

    const { error } = await supabase
      .from('super_correction_publications')
      .update(updateData)
      .eq('id', publicationId);

    if (error) throw error;

    // ✅ AJOUT: Traçage dans audit_log (utilise userId)
    await supabase.from('audit_log').insert({
      user_id: userId,
      action_type: `SC_STATUS_${newStatus}`,
      entity_type: 'super_correction',
      entity_id: publicationId,
      details: { unlock_reason: unlockReason },
      created_at: new Date().toISOString(),
    });
  }

  // =====================================================
  // 👥 CORRECTEURS
  // =====================================================

  static async getCorrecteurs(publicationId: string): Promise<SCCorrecteur[]> {
    const { data, error } = await supabase
      .from('sc_correcteurs')
      .select(`
        *,
        user:ztf_users(id, full_name, email)
      `)
      .eq('publication_id', publicationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addCorrecteur(
    publicationId: string,
    userId: string
  ): Promise<SCCorrecteur> {
    const { data, error } = await supabase
      .from('sc_correcteurs')
      .upsert(
        {
          publication_id: publicationId,
          user_id: userId,
          reading_progress: 0.0,
          has_validated: false,
        },
        {
          onConflict: 'publication_id,user_id',
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (error) throw error;
    return data as SCCorrecteur;
  }

  static async updateReadingProgress(
    correcteurId: string,
    progress: number
  ): Promise<void> {
    const { error } = await supabase
      .from('sc_correcteurs')
      .update({
        reading_progress: Math.min(1.0, Math.max(0.0, progress)),
        updated_at: new Date().toISOString(),
      })
      .eq('id', correcteurId);

    if (error) throw error;
  }

  static async validateBook(correcteurId: string): Promise<void> {
    const { error } = await supabase
      .from('sc_correcteurs')
      .update({
        has_validated: true,
        validated_at: new Date().toISOString(),
        reading_progress: 1.0,
        updated_at: new Date().toISOString(),
      })
      .eq('id', correcteurId);

    if (error) throw error;
  }

  // =====================================================
  // 💬 COMMENTAIRES
  // =====================================================

  static async getCommentaires(publicationId: string): Promise<SCCommentaire[]> {
    const { data, error } = await supabase
      .from('sc_commentaires')
      .select(`
        *,
        correcteur:sc_correcteurs(
          id,
          invite_email,
          user:ztf_users(id, full_name, email)
        )
      `)
      .eq('publication_id', publicationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  static async addCommentaire(
    publicationId: string,
    correcteurId: string,
    anchorParagraph: number,
    anchorTextStart: number,
    anchorTextEnd: number,
    typeCommentaire: SCCommentType,
    contenu: string
  ): Promise<SCCommentaire> {
    const { data, error } = await supabase
      .from('sc_commentaires')
      .insert({
        publication_id: publicationId,
        correcteur_id: correcteurId,
        anchor_paragraph: anchorParagraph,
        anchor_text_start: anchorTextStart,
        anchor_text_end: anchorTextEnd,
        type_commentaire: typeCommentaire,
        contenu,
      })
      .select(`
        *,
        correcteur:sc_correcteurs(id, invite_email, user:ztf_users(full_name, email))
      `)
      .single();

    if (error) throw error;
    return data;
  }

  static async resolveCommentaire(
    commentaireId: string,
    userId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('sc_commentaires')
      .update({
        resolu: true,
        resolu_par: userId,
        resolu_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', commentaireId);

    if (error) throw error;
  }

  // =====================================================
  // 📊 STATISTIQUES
  // =====================================================

  static async getStats() {
    const { data: publications } = await supabase
      .from('super_correction_publications')
      .select('id, sc_status, validation_threshold, validation_count');

    const open = publications?.filter(p => p.sc_status === 'OPEN').length || 0;
    const locked = publications?.filter(p => p.sc_status === 'LOCKED').length || 0;
    const closed = publications?.filter(p => p.sc_status === 'CLOSED').length || 0;

    const { count: totalCommentaires } = await supabase
      .from('sc_commentaires')
      .select('*', { count: 'exact', head: true });

    const { count: unresolvedCommentaires } = await supabase
      .from('sc_commentaires')
      .select('*', { count: 'exact', head: true })
      .eq('resolu', false);

    return {
      open,
      locked,
      closed,
      total: (publications?.length || 0),
      totalCommentaires: totalCommentaires || 0,
      unresolvedCommentaires: unresolvedCommentaires || 0,
    };
  }


  static async generateInviteLink(request: {
    publication_id: string;
    email: string;
    expires_in_days?: number;
  }): Promise<{
    id: string;
    publication_id: string;
    email: string;
    token: string;
    expires_at: string;
    created_at: string;
    is_active: boolean;
  }> {
    const { publication_id, email, expires_in_days = 7 } = request;

    // Générer un token unique
    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Insérer dans sc_correcteurs comme invité
    const { data, error } = await supabase
      .from('sc_correcteurs')
      .insert({
        publication_id,
        invite_email: email,
        invite_token: token,
        expires_at: expiresAt.toISOString(),
        reading_progress: 0,
        has_validated: false,
      })
      .select()
      .single();

    if (error) throw new Error(error.message || 'Erreur création invitation');

    return {
      id: data.id,
      publication_id: data.publication_id,
      email: data.invite_email,
      token: data.invite_token,
      expires_at: data.expires_at,
      created_at: data.created_at,
      is_active: true,
    };
  }
}


