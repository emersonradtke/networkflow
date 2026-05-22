import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Count DirectUser records
    const directUsers = await base44.asServiceRole.entities.DirectUser.list();
    const activeDirect = directUsers.filter(u => u.is_active !== false).length;
    const migratedDirect = directUsers.filter(u => u._migrated_to_base44 === true).length;

    // Count Base44 Users
    const base44Users = await base44.asServiceRole.entities.User.list();

    // Count Associates
    const associates = await base44.asServiceRole.entities.Associate.list();
    const associatesWithUser = associates.filter(a => a.user_id).length;

    return Response.json({
      migration_status: {
        direct_user_total: directUsers.length,
        direct_user_active: activeDirect,
        direct_user_migrated: migratedDirect,
        base44_users_total: base44Users.length,
        associates_total: associates.length,
        associates_with_user_link: associatesWithUser,
        migration_progress: Math.round((migratedDirect / directUsers.length) * 100),
        phase: 'PHASE_1_PREPARATION'
      },
      summary: {
        still_on_legacy: activeDirect - migratedDirect,
        ready_to_migrate: activeDirect,
        already_migrated: migratedDirect,
        next_step: 'Review and approve individual migrations'
      }
    });

  } catch (error) {
    console.error('Error auditing migration:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});