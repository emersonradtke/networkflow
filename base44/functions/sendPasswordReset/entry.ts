import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { email, userName } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email é obrigatório' }, { status: 400 });
    }

    // Instruir o usuário para fazer login e redefinir a senha através da plataforma
    // pois não temos URL de reset dinâmica configurada
    const resetUrl = 'Acesse o dashboard e use a opção de redefinir senha no menu de configurações';

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Redefinir sua senha - Bold Life',
      body: `Olá ${userName || 'usuário'},\n\nUm administrador solicitou a redefinição de sua senha.\n\n${resetUrl}\n\nSe você não solicitou isso, entre em contato com um administrador.\n\nAtenciosamente,\nEquipe Bold Life`
    });

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar reset de senha:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});