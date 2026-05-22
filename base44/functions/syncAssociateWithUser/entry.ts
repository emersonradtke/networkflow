import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create Associate linked to this user
    const associates = await base44.asServiceRole.entities.Associate.filter({ 
      user_id: user.id 
    });

    if (associates.length > 0) {
      return Response.json({ 
        success: true,
        associate: associates[0],
        created: false
      });
    }

    // If no associate exists yet, that's ok for now
    // Associate will be created during registration flow
    return Response.json({ 
      success: true,
      associate: null,
      created: false,
      message: 'No associate linked yet'
    });

  } catch (error) {
    console.error('Error syncing associate:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});