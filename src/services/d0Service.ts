// src/services/d0Service.ts
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { ZtfBookInsert, ZtfFileType, ZtfDepartment } from '../types/ztf';
import { parseZtfNomenclature } from '../utils/nomenclature';

// Utiliser la SERVICE ROLE KEY pour contourner RLS
const supabaseAdmin = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface ImportResult {
  success: boolean;
  ztf_id?: string;
  error?: string;
}

export async function importZtfFile(
  file: File,
  theme: string,
  language: 'EN' | 'FR' | 'EN+FR',
  responsibleId: string,
  targetDate: string
): Promise<ImportResult> {
  try {
    // 1. Validation de la nomenclature
    const parsed = parseZtfNomenclature(file.name);
    if (!parsed.valid) {
      return { success: false, error: parsed.message };
    }

    // 2. Récupérer l'utilisateur courant avec le client STANDARD
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Erreur authentification:', userError);
      return { 
        success: false, 
        error: 'Utilisateur non authentifié. Veuillez vous déconnecter et vous reconnecter.' 
      };
    }

    // 3. Upload vers Supabase Storage (avec service role key)
    const filePath = `${parsed.type}/${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('document-files')
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error('Erreur upload:', uploadError);
      throw uploadError;
    }

    // 4. Générer l'ID ZTF via la fonction SQL
    const { data: ztfId, error: idError } = await supabaseAdmin.rpc('generate_ztf_id', {
      p_type: parsed.type,
      p_year: parseInt(parsed.year!, 10)
    });

    if (idError || !ztfId) {
      console.error('Erreur génération ID:', idError);
      throw new Error('Erreur lors de la génération de l\'ID ZTF');
    }

    // 5. Vérifier si le fichier existe déjà (gestion des doublons)
    const { data: existingFile } = await supabaseAdmin
      .from('raw_files')
      .select('id')
      .eq('ztf_id', ztfId)
      .single();

    if (existingFile) {
      // Supprimer l'ancien fichier
      await supabaseAdmin
        .from('raw_files')
        .delete()
        .eq('id', existingFile.id);
      
      console.log('🗑️ Ancien fichier supprimé:', existingFile.id);
    }

    // 6. Insérer dans raw_files
    const { data: rawFile, error: rawError } = await supabaseAdmin
      .from('raw_files')
      .insert({
        file_name: file.name,
        file_url: filePath,
        file_type: parsed.extension,
        file_size: file.size,
        mime_type: file.type,
        storage_path: filePath,
        bucket_name: 'document-files',
        ztf_id: ztfId,
        ztf_type: parsed.type,
        theme: theme,
        language: language,
        nomenclature_valid: true,
        expected_nomenclature: file.name,
        imported_by: user.id
      })
      .select()
      .single();

    if (rawError) {
      console.error('Erreur raw_files:', rawError);
      throw rawError;
    }

    // 7. Vérifier si le livre existe déjà dans ztf_books
    const { data: existingBook } = await supabaseAdmin
      .from('ztf_books')
      .select('id')
      .eq('ztf_id', ztfId)
      .single();

    if (existingBook) {
      // Supprimer l'ancien livre
      await supabaseAdmin
        .from('ztf_books')
        .delete()
        .eq('id', existingBook.id);
      
      console.log('️ Ancien livre supprimé:', existingBook.id);
    }

    // 8. Insérer dans ztf_books
    const bookInsert: ZtfBookInsert = {
      ztf_id: ztfId,
      title: `${parsed.type} - ${theme} (${parsed.year})`,
      theme: theme,
      language: language,
      ztf_status: 'DRAFT',
      current_department: getDepartmentForType(parsed.type!),
      responsible_id: responsibleId,
      target_date: targetDate,
      source_ids: rawFile ? [rawFile.id] : [],
      metadata: {
        original_filename: file.name,
        parsed: parsed,
        imported_at: new Date().toISOString()
      }
    };

    const { error: bookError } = await supabaseAdmin
      .from('ztf_books')
      .insert(bookInsert);

    if (bookError) {
      console.error('Erreur ztf_books:', bookError);
      throw bookError;
    }


    // ✅ 7. CRÉER UNE ENTRÉE VIDE DANS book_content
    await supabaseAdmin
      .from('book_content')
      .insert({
        book_id: rawFile.id, // Utiliser l'ID du fichier raw_files
        department: getDepartmentForType(parsed.type!),
        content: '', // Contenu vide au début
        word_count: 0,
        char_count: 0,
        last_edited_by: user.id
      });


    // 9. Journal d'activité D0
    await supabaseAdmin.from('d0_activity_log').insert({
      entity_type: 'raw_file',
      entity_id: rawFile.id,
      action_type: 'file_import',
      user_id: user.id,
      department: 'D0',
      details: { filename: file.name, ztf_id: ztfId },
      new_status: 'DRAFT'
    });

    return { success: true, ztf_id: ztfId };

  } catch (error: any) {
    console.error('Erreur import D0:', error);
    return { success: false, error: error.message || 'Erreur inconnue lors de l\'import' };
  }
}

function getDepartmentForType(type: ZtfFileType): ZtfDepartment {
  const map: Record<ZtfFileType, ZtfDepartment> = {
    AUD: 'D0', TRANS: 'D2', CLEAN: 'D3', BOOK: 'D4',
    STYLE: 'D5', CORR: 'D6', TRAD: 'D7', BAT: 'D8'
  };
  return map[type] || 'D0';
}