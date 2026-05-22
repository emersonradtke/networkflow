import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { associate_id } = await req.json();

    if (!associate_id) {
      return Response.json({ error: 'associate_id required' }, { status: 400 });
    }

    // Get associate details
    const associate = await base44.asServiceRole.entities.Associate.get(associate_id);
    
    if (!associate) {
      return Response.json({ error: 'Associate not found' }, { status: 404 });
    }

    if (associate.status !== 'active') {
      return Response.json({ error: 'Associate must be active' }, { status: 400 });
    }

    // Check if user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: associate.email });
    if (existingUsers.length > 0) {
      return Response.json({ success: true, message: 'User already exists' });
    }

    // Create user with role "associado"
    const newUser = await base44.users.inviteUser(associate.email, 'associado');

    // Update associate with user_id reference
    await base44.asServiceRole.entities.Associate.update(associate_id, {
      user_id: associate.id,
    });

    return Response.json({ 
      success: true, 
      message: 'User created successfully',
      user: newUser 
    });
  } catch (error) {
    console.error('Error creating associate user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});