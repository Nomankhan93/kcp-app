import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function normalizePhone(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, '') : '';
}

function normalizeTrackingNo(value: unknown) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const trackingNo = normalizeTrackingNo(body.trackingNo);
    const mobile = normalizePhone(body.mobile);

    if (!trackingNo || !mobile) {
      return jsonResponse({ error: 'Tracking number and mobile number are required.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Download service is not configured.' }, 500);
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: application, error: lookupError } = await serviceClient
      .from('certificate_applications')
      .select('id, status, tracking_no, applicant_mobile, issued_certificate_path')
      .eq('tracking_no', trackingNo)
      .eq('applicant_mobile', mobile)
      .maybeSingle();

    if (lookupError) {
      console.error('Certificate lookup failed:', lookupError.message);
      return jsonResponse({ error: 'Unable to verify certificate access.' }, 500);
    }

    if (!application?.issued_certificate_path) {
      return jsonResponse({ error: 'Certificate is not available for download.' }, 404);
    }

    const allowedStatuses = new Set(['certificate_uploaded', 'ready_for_collection', 'delivered']);
    if (!allowedStatuses.has(application.status)) {
      return jsonResponse({ error: 'Certificate is not ready for download.' }, 403);
    }

    if (!String(application.issued_certificate_path).startsWith('issued-certificates/')) {
      return jsonResponse({ error: 'Invalid certificate file path.' }, 403);
    }

    const { data: signedUrlData, error: signedUrlError } = await serviceClient.storage
      .from('certificate-documents')
      .createSignedUrl(application.issued_certificate_path, 60 * 15);

    if (signedUrlError || !signedUrlData?.signedUrl) {
      console.error('Signed URL creation failed:', signedUrlError?.message);
      return jsonResponse({ error: 'Unable to create secure certificate link.' }, 500);
    }

    return jsonResponse({ signedUrl: signedUrlData.signedUrl, expiresIn: 60 * 15 });
  } catch (error) {
    console.error('Unexpected issued certificate download error:', error);
    return jsonResponse({ error: 'Unexpected download service error.' }, 500);
  }
});
