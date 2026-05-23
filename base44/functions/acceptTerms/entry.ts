import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const { terms_id, terms_version } = await req.json();

    if (!terms_id || !terms_version) {
      return Response.json({ error: 'Missing terms_id or terms_version' }, { status: 400 });
    }

    // Registrar aceite do termo (se autenticado)
    if (user && user.email) {
      try {
        await base44.asServiceRole.entities.UserTermsAcceptance.create({
          user_id: user.id || user.email,
          user_email: user.email,
          terms_id: terms_id,
          terms_version: terms_version,
          accepted_at: new Date().toISOString()
        });
      } catch (acceptError) {
        console.error('Error creating acceptance record:', acceptError);
        // Não falhar se não conseguir registrar, apenas log
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error accepting terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});