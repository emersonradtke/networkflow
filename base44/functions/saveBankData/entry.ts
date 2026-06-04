import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { associate_id, cpf, email, bankData } = body;

    // Resolver o ID do associate
    let associateId = associate_id;

    if (!associateId) {
      let found = [];
      if (cpf) {
        found = await base44.asServiceRole.entities.Associate.filter({ cpf });
      }
      if (!found.length && email) {
        found = await base44.asServiceRole.entities.Associate.filter({ email });
      }
      associateId = found[0]?.id;
    }

    if (!associateId) {
      return Response.json({ error: 'Associate não encontrado' }, { status: 404 });
    }

    await base44.asServiceRole.entities.Associate.update(associateId, bankData);

    return Response.json({ success: true, associate_id: associateId });
  } catch (error) {
    console.error('saveBankData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});