// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { create } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface InviteRequest {
  publication_id: string;
  email: string;
  duration_days: number;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization')!;
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (userError || !user) {
      throw new Error('Non authentifié');
    }

    const { data: userData } = await supabaseAdmin
      .from('ztf_users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userData?.role !== 'admin') {
      throw new Error('Accès réservé aux administrateurs');
    }

    const { publication_id, email, duration_days }: InviteRequest = await req.json();

    if (!publication_id || !email || !duration_days) {
      throw new Error('Champs requis manquants');
    }

    const { data: publication, error: pubError } = await supabaseAdmin
      .from('super_correction_publications')
      .select('id, sc_status')
      .eq('id', publication_id)
      .single();

    if (pubError || !publication) {
      throw new Error('Publication non trouvée');
    }

    if (publication.sc_status !== 'OPEN') {
      throw new Error('Cette publication n\'accepte plus de correcteurs');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + duration_days);

    const jwtSecret = Deno.env.get('JWT_SECRET') || crypto.randomUUID();
    const header = { alg: 'HS256', typ: 'JWT' };
    const payload = {
      sub: email,
      publication_id,
      scope: 'sc_invite',
      exp: Math.floor(expiresAt.getTime() / 1000),
      iat: Math.floor(Date.now() / 1000),
    };

    const encoder = new TextEncoder();
    const keyData = encoder.encode(jwtSecret);
    const token = await create(header, payload, keyData);

    const { data: correcteur, error: insertError } = await supabaseAdmin
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

    if (insertError) {
      throw new Error('Erreur lors de la création du correcteur invité');
    }

    const baseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173';
    const inviteUrl = `${baseUrl}/sc/invite?token=${token}`;

    console.log(`Email envoyé à ${email} avec le lien: ${inviteUrl}`);

    await supabaseAdmin.from('audit_log').insert({
      user_id: user.id,
      action_type: 'SC_INVITE_GENERATED',
      entity_type: 'sc_correcteur',
      entity_id: correcteur.id,
      details: {
        email,
        publication_id,
        duration_days,
        expires_at: expiresAt.toISOString(),
      },
      created_at: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        invite_url: inviteUrl,
        expires_at: expiresAt.toISOString(),
        correcteur_id: correcteur.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('Erreur generation invite:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});