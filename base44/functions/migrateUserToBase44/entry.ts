import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin required' }, { status: 403 });
    }

    const { directUserId, email, role } = await req.json();

    // Validations
    if (!directUserId || !email || !role) {
      return Response.json({ error: 'Missing: directUserId, email, role' }, { status: 400 });
    }

    if (!email.includes('@')) {
      return Response.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (!['user', 'admin'].includes(role)) {
      return Response.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Get DirectUser
    const directUsers = await base44.asServiceRole.entities.DirectUser.filter({ id: directUserId });
    if (directUsers.length === 0) {
      return Response.json({ error: 'DirectUser not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const directUser = directUsers[0];

    // Validate DirectUser is active and not already migrated
    if (!directUser.is_active) {
      return Response.json({ 
        error: 'DirectUser is already inactive',
        code: 'ALREADY_INACTIVE'
      }, { status: 400 });
    }

    if (directUser._migrated_to_base44) {
      return Response.json({ 
        error: 'DirectUser already migrated',
        code: 'ALREADY_MIGRATED'
      }, { status: 400 });
    }

    // Check if Base44 user already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email });
    if (existingUsers.length > 0) {
      return Response.json({ 
        error: 'User already exists in Base44',
        code: 'USER_EXISTS',
        base44_user_id: existingUsers[0].id 
      }, { status: 409 });
    }

    // Invite user to Base44
    const mappedRole = role === 'admin' ? 'admin' : 'user';
    await base44.users.inviteUser(email, mappedRole);

    // Mark DirectUser as migrated
    await base44.asServiceRole.entities.DirectUser.update(directUserId, {
      is_active: false,
      _migrated_to_base44: true
    });

    return Response.json({ 
      success: true,
      email,
      base44_role: mappedRole,
      message: `User ${email} migrated successfully`
    });

  } catch (error) {
    console.error('Migration error:', error);
    return Response.json({ 
      error: error.message,
      code: 'MIGRATION_ERROR'
    }, { status: 500 });
  }
});