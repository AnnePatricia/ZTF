// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verify } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { token }: { token: string } = await req.json();

    if (!token) {
      throw new Error('Token manquant');
    }

    const jwtSecret = Deno.env.get('JWT_SECRET') || crypto.randomUUID();
    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    
    let payload: any;
    
    try {
      payload = await verify(token, keyData);
    } catch (error) {
      return new Response(
        JSON.stringify({ valid: false, error: 'Token invalide ou expiré' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (payload.scope !== 'sc_invite') {
      throw new Error('Token non valide pour Super Correction');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: correcteur, error } = await supabaseAdmin
      .from('sc_correcteurs')
      .select(`
        id,
        publication_id,
        invite_email,
        expires_at,
        reading_progress,
        has_validated,
        publication:super_correction_publications(
          id,
          sc_status,
          book:ztf_books(id, ztf_id, title, theme)
        )
      `)
      .eq('invite_token', token)
      .single();

    if (error || !correcteur) {
      throw new Error('Correcteur invité non trouvé');
    }

    const now = new Date();
    const expiresAt = new Date(correcteur.expires_at);
    
    if (now > expiresAt) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Lien expiré. Contactez l\'administrateur pour obtenir un nouveau lien.',
          expired: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    if (correcteur.publication.sc_status === 'CLOSED') {
      throw new Error('Cette publication a été fermée par l\'administrateur');
    }

    return new Response(
      JSON.stringify({
        valid: true,
        correcteur: {
          id: correcteur.id,
          publication_id: correcteur.publication_id,
          email: correcteur.invite_email,
          reading_progress: correcteur.reading_progress,
          has_validated: correcteur.has_validated,
        },
        publication: {
          id: correcteur.publication.id,
          ztf_id: correcteur.publication.book.ztf_id,
          title: correcteur.publication.book.title,
          theme: correcteur.publication.book.theme,
          sc_status: correcteur.publication.sc_status,
        },
        expires_at: correcteur.expires_at,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erreur validation token:', error);
    return new Response(
      JSON.stringify({ valid: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});