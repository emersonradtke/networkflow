import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { directUserId, email, role } = await req.json();

    if (!directUserId || !email || !role) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get existing DirectUser
    const directUsers = await base44.asServiceRole.entities.DirectUser.filter({ id: directUserId });
    if (directUsers.length === 0) {
      return Response.json({ error: 'DirectUser not found' }, { status: 404 });
    }

    const directUser = directUsers[0];

    // Check if Base44 user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ 
        success: false, 
        message: 'User already exists in Base44',
        base44_user_id: existingUsers[0].id 
      });
    }

    // Invite user to Base44 (creates native User)
    const mappedRole = role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(email, mappedRole);

    // Update DirectUser to mark as migrated
    await base44.asServiceRole.entities.DirectUser.update(directUserId, {
      is_active: false, // Disable legacy login
      _migrated_to_base44: true // Mark as migrated
    });

    return Response.json({ 
      success: true, 
      message: 'User migrated successfully',
      email,
      base44_role: mappedRole,
      action: 'User invited to Base44 and legacy account disabled'
    });

  } catch (error) {
    console.error('Error migrating user:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});