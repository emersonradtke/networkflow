import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const terms = await base44.asServiceRole.entities.TermsOfService.list('-created_date', 200);
    return Response.json({ success: true, terms });
  } catch (error) {
    console.error('Error fetching terms:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});