// src/utils/workflowTest.ts
import { supabase } from '../supabaseClient';

// ✅ Transition de statut entre départements
export async function transitionToNextDepartment(
  bookId: string,
  // currentDept: string,  // ❌ Supprimer ce paramètre inutilisé
  newStatus: string,
  newDept: string
) {
  const { data, error } = await supabase
    .from('ztf_books')
    .update({
      ztf_status: newStatus,
      current_department: newDept,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ✅ Workflow complet D2 → D8
export async function testFullWorkflow(bookId: string) {
  const results = [];
  
  try {
    // D2 → D3
    const d2Result = await transitionToNextDepartment(bookId, 'CLEANED', 'D3');
    results.push({ step: 'D2→D3', success: true, data: d2Result });
    
    // D3 → D4
    const d3Result = await transitionToNextDepartment(bookId, 'STRUCTURED', 'D4');
    results.push({ step: 'D3→D4', success: true, data: d3Result });
    
    // D4 → D5
    const d4Result = await transitionToNextDepartment(bookId, 'REWRITTEN', 'D5');
    results.push({ step: 'D4→D5', success: true, data: d4Result });
    
    // D5 → D6
    const d5Result = await transitionToNextDepartment(bookId, 'CORRECTED', 'D6');
    results.push({ step: 'D5→D6', success: true, data: d5Result });
    
    // D6 → D7
    const d6Result = await transitionToNextDepartment(bookId, 'TRANSLATED', 'D7');
    results.push({ step: 'D6→D7', success: true, data: d6Result });
    
    // D7 → D8
    const d7Result = await transitionToNextDepartment(bookId, 'BAT_PENDING', 'D8');
    results.push({ step: 'D7→D8', success: true, data: d7Result });
    
    // D8 → Publication
    const d8Result = await transitionToNextDepartment(bookId, 'PUBLISHED', 'D0');
    results.push({ step: 'D8→PUBLISHED', success: true, data: d8Result });
    
    return { success: true, results };
  } catch (error) {
    return { success: false, error, results };
  }
}