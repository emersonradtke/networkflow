import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, role = 'user' } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists in Base44
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    
    if (existingUsers.length > 0) {
      return Response.json({ 
        success: true,
        user: existingUsers[0],
        created: false,
        message: 'User already exists'
      });
    }

    // If not exists and we have auth, invite them
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ 
        error: 'Admin privileges required to create users',
        success: false 
      }, { status: 403 });
    }

    // Invite user
    const mappedRole = role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(email, mappedRole);

    // Get newly created user
    const newUsers = await base44.asServiceRole.entities.User.filter({ email });
    
    return Response.json({ 
      success: true,
      user: newUsers[0] || { email, role: mappedRole },
      created: true,
      message: 'User created and invited',
      invitation_sent: true
    });

  } catch (error) {
    console.error('Error with Base44 user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});