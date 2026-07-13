// src/services/editorializationService.ts
import { supabase } from '../supabaseClient';
import type {
    EditorializationTask,
    D4Fragment,
    ManuscriptFragment,
    PlanItem,
} from '../types/editorialization';

// ✅ Type explicite pour les données de livre
// type BookData = {
//     id: string;
//     ztf_id: string;
//     title: string;
//     theme?: string;
// };

export class EditorializationService {
    // =====================================================
    // 📚 TÂCHES D'ÉDITORIALISATION
    // =====================================================
    static async getTasks(): Promise<EditorializationTask[]> {
        const { data, error } = await supabase
            .from('editorialization_tasks')
            .select(`
        *,
        book:ztf_books(id, ztf_id, title, theme, language),
        assigned_user:ztf_users!assigned_to(full_name, email),
        validated_user:ztf_users!validated_by(full_name, email)
      `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    }

    static async getTask(id: string): Promise<EditorializationTask | null> {
        const { data, error } = await supabase
            .from('editorialization_tasks')
            .select(`
        *,
        book:ztf_books(id, ztf_id, title, theme, language, content),
        assigned_user:ztf_users!assigned_to(full_name, email),
        validated_user:ztf_users!validated_by(full_name, email)
      `)
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    }

    static async createTask(
        bookId: string,
        manuscriptTitle?: string,
        manuscriptTheme?: string
    ): Promise<EditorializationTask> {
        const { data, error } = await supabase
            .from('editorialization_tasks')
            .insert({
                book_id: bookId,
                manuscript_title: manuscriptTitle || null,
                manuscript_theme: manuscriptTheme || null,
                status: 'pending',
                structure_plan: [],
                selected_fragments: [],
                word_count: 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .select(`
        *,
        book:ztf_books(id, ztf_id, title, theme, language)
      `)
            .single();
        if (error) throw error;
        return data as EditorializationTask;
    }

    static async startTask(taskId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .update({
                status: 'in_progress',
                assigned_to: userId,
                started_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) throw error;
    }

    static async saveManuscript(
        taskId: string,
        updates: Partial<{
            manuscript_content: string;
            manuscript_title: string;
            manuscript_theme: string;
            structure_plan: PlanItem[];
            selected_fragments: string[];
            word_count: number;
            notes: string;
        }>
    ): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .update({
                ...updates,
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) throw error;
    }

    static async submitTask(
        taskId: string,
        manuscriptContent: string,
        manuscriptTitle: string,
        manuscriptTheme: string,
        structurePlan: PlanItem[],
        selectedFragments: string[],
        wordCount: number,
        notes?: string
    ): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .update({
                status: 'submitted',
                manuscript_content: manuscriptContent,
                manuscript_title: manuscriptTitle,
                manuscript_theme: manuscriptTheme,
                structure_plan: structurePlan,
                selected_fragments: selectedFragments,
                word_count: wordCount,
                notes: notes || null,
                submitted_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) throw error;
    }

    static async validateTask(taskId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .update({
                status: 'validated',
                validated_by: userId,
                validated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) throw error;
    }

    static async rejectTask(
        taskId: string,
        userId: string,
        notes?: string
    ): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .update({
                status: 'rejected',
                validated_by: userId,
                notes: notes || null,
                validated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) throw error;
    }

    static async deleteTask(taskId: string): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .delete()
            .eq('id', taskId);
        if (error) throw error;
    }

    // =====================================================
    // 🧩 FRAGMENTS (depuis les tâches D3 validées)
    // =====================================================
    static async getAvailableFragments(): Promise<D4Fragment[]> {
        const { data: cleaningTasks, error } = await supabase
            .from('cleaning_tasks')
            .select(`
      id,
      book_id,
      cleaned_content,
      word_count_cleaned,
      book:ztf_books(id, ztf_id, title, theme)
    `)
            .eq('status', 'verified')
            .order('created_at', { ascending: false });

        if (error) throw error;

        // ✅ CORRECTION RAPIDE : Cast explicite avec (task: any)
        return (cleaningTasks || []).map((task: any) => ({
            id: `frag-${task.id}`,
            cleaning_task_id: task.id,
            book_id: task.book_id,
            content: task.cleaned_content || '',
            theme: task.book?.theme || 'Non classé',
            word_count: task.word_count_cleaned || 0,
            evaluation: 'complementaire' as const,
            created_at: new Date().toISOString(),
            book: task.book
                ? {
                    id: task.book.id,
                    ztf_id: task.book.ztf_id,
                    title: task.book.title,
                    theme: task.book.theme,
                }
                : undefined,
        }));
    }

    static async getFragmentsByTheme(theme: string): Promise<D4Fragment[]> {
        const allFragments = await this.getAvailableFragments();
        return allFragments.filter(f => f.theme?.toLowerCase() === theme.toLowerCase());
    }

    static async searchFragments(query: string): Promise<D4Fragment[]> {
        const allFragments = await this.getAvailableFragments();
        const search = query.toLowerCase();
        return allFragments.filter(f =>
            f.content.toLowerCase().includes(search) ||
            f.book?.title?.toLowerCase().includes(search) ||
            f.theme?.toLowerCase().includes(search)
        );
    }

    // =====================================================
    // 📖 FRAGMENTS DANS LE MANUSCRIT
    // =====================================================
    static async getManuscriptFragments(taskId: string): Promise<ManuscriptFragment[]> {
        const { data, error } = await supabase
            .from('d4_manuscript_fragments')
            .select(`
        *,
        fragment:d4_fragments(
          id,
          content,
          theme,
          word_count,
          book:ztf_books(id, ztf_id, title)
        )
      `)
            .eq('editorialization_task_id', taskId)
            .order('position_order', { ascending: true });
        if (error) throw error;
        return data || [];
    }

    static async insertFragmentInManuscript(
        taskId: string,
        fragmentId: string,
        positionOrder: number,
        partNumber?: number,
        chapterNumber?: number,
        chapterTitle?: string,
        userId?: string
    ): Promise<ManuscriptFragment> {
        const { data, error } = await supabase
            .from('d4_manuscript_fragments')
            .insert({
                editorialization_task_id: taskId,
                fragment_id: fragmentId,
                position_order: positionOrder,
                part_number: partNumber || null,
                chapter_number: chapterNumber || null,
                chapter_title: chapterTitle || null,
                inserted_by: userId || null,
                inserted_at: new Date().toISOString(),
            })
            .select(`
        *,
        fragment:d4_fragments(
          id,
          content,
          theme,
          word_count,
          book:ztf_books(id, ztf_id, title)
        )
      `)
            .single();
        if (error) throw error;
        return data as ManuscriptFragment;
    }

    static async removeFragmentFromManuscript(
        taskId: string,
        fragmentId: string
    ): Promise<void> {
        const { error } = await supabase
            .from('d4_manuscript_fragments')
            .delete()
            .eq('editorialization_task_id', taskId)
            .eq('fragment_id', fragmentId);
        if (error) throw error;
    }

    static async reorderFragments(
        taskId: string,
        fragmentIds: string[]
    ): Promise<void> {
        const updates = fragmentIds.map((fragmentId, index) =>
            supabase
                .from('d4_manuscript_fragments')
                .update({ position_order: index })
                .eq('editorialization_task_id', taskId)
                .eq('fragment_id', fragmentId)
        );
        const results = await Promise.all(updates);
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            throw errors[0].error;
        }
    }

    // =====================================================
    // 📋 PLAN DE STRUCTURE
    // =====================================================
    static async saveStructurePlan(taskId: string, plan: PlanItem[]): Promise<void> {
        const { error } = await supabase
            .from('editorialization_tasks')
            .update({
                structure_plan: plan,
                updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);
        if (error) throw error;
    }

    // =====================================================
    // 📤 TRANSMISSION D4 → D5
    // =====================================================
    static async createTransmission(
        taskId: string,
        userId: string,
        structureSummary?: string,
        sourcesUsed?: string[],
        notes?: string
    ): Promise<void> {
        const { data: task } = await supabase
            .from('editorialization_tasks')
            .select('book_id')
            .eq('id', taskId)
            .single();
        if (!task) throw new Error('Tâche non trouvée');

        const { error: transmissionError } = await supabase
            .from('d4_transmissions')
            .insert({
                task_id: taskId,
                book_id: task.book_id,
                from_user: userId,
                to_department: 'D5',
                structure_summary: structureSummary || null,
                sources_used: sourcesUsed || [],
                notes: notes || null,
                signed_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            });
        if (transmissionError) throw transmissionError;

        const { error: bookError } = await supabase
            .from('ztf_books')
            .update({
                ztf_status: 'STRUCTURED',
                status: 'STRUCTURED',
                current_department: 'D5',
                updated_at: new Date().toISOString(),
            })
            .eq('id', task.book_id);
        if (bookError) throw bookError;
    }

    static async getTransmissions(taskId?: string) {
        let query = supabase
            .from('d4_transmissions')
            .select(`
        *,
        task:editorialization_tasks(id, manuscript_title),
        book:ztf_books(id, ztf_id, title),
        from_user:ztf_users(full_name, email)
      `)
            .order('signed_at', { ascending: false });
        if (taskId) {
            query = query.eq('task_id', taskId);
        }
        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    // =====================================================
    // 📊 STATISTIQUES
    // =====================================================
    static async getStats() {
        const { data: tasks } = await supabase
            .from('editorialization_tasks')
            .select('id, status, word_count');
        const { count: fragmentsCount } = await supabase
            .from('cleaning_tasks')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'verified');
        return {
            total: tasks?.length || 0,
            pending: tasks?.filter(t => t.status === 'pending').length || 0,
            inProgress: tasks?.filter(t => t.status === 'in_progress').length || 0,
            submitted: tasks?.filter(t => t.status === 'submitted').length || 0,
            validated: tasks?.filter(t => t.status === 'validated').length || 0,
            rejected: tasks?.filter(t => t.status === 'rejected').length || 0,
            availableFragments: fragmentsCount || 0,
            totalWords: tasks?.reduce((sum, t) => sum + (t.word_count || 0), 0) || 0,
        };
    }

    // =====================================================
    // 🔍 RECHERCHE THÉMATIQUE
    // =====================================================
    static async getThemes(): Promise<string[]> {
        const { data: books, error } = await supabase
            .from('ztf_books')
            .select('theme')
            .not('theme', 'is', null)
            .not('theme', 'eq', '')
            .order('theme');
        if (error) throw error;

        const uniqueThemes = Array.from(
            new Set(
                (books || [])
                    .map(b => b.theme as string | undefined)
                    .filter((theme): theme is string => !!theme)
            )
        );
        return uniqueThemes;
    }
}