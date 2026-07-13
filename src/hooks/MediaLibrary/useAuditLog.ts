import { useState, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface AuditLog {
  id: string;
  entity_type: 'raw_files' | 'transcriptions' | 'book_projects' | 'proofreading_v1' | 'proofreading_v2' | 'transcription_raw_files' | 'book_project_transcriptions' | 'document';
  entity_id: string;
  action_type: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'STATUS_CHANGE' | 'REASSIGN' | 'LINK' | 'UNLINK' | 'EXPORT' | 'IMPORT';
  user_id?: string;
  user_email?: string;
  user_name?: string;
  details: Record<string, any>;
  previous_values?: Record<string, any>;
  new_values?: Record<string, any>;
  reason?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  created_at: string;
}

export function useAuditLog() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const logAction = useCallback(async (action: {
    entity_type: AuditLog['entity_type'];
    entity_id: string;
    action_type: AuditLog['action_type'];
    details?: Record<string, any>;
    previous_values?: Record<string, any>;
    new_values?: Record<string, any>;
    reason?: string;
  }): Promise<boolean> => {
    try {
      setLoading(true);
      const user = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          entity_type: action.entity_type,
          entity_id: action.entity_id,
          action_type: action.action_type,
          user_id: user.data.user?.id,
          user_email: user.data.user?.email,
          user_name: user.data.user?.user_metadata?.full_name,
          details: action.details || {},
          previous_values: action.previous_values,
          new_values: action.new_values,
          reason: action.reason,
        });
      
      if (error) throw error;
      
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const getAuditLogs = useCallback(async (
    entityType?: AuditLog['entity_type'],
    entityId?: string,
    limit: number = 100
  ): Promise<AuditLog[]> => {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (entityType) {
        query = query.eq('entity_type', entityType);
      }
      
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, []);

  return {
    loading,
    error,
    logAction,
    getAuditLogs,
  };
}