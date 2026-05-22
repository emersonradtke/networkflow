import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // Enviar email com instrução para reset de senha
    const resetUrl = `${Deno.env.get('APP_URL') || 'https://app.boldlife.com.br'}/auth/reset-password?email=${encodeURIComponent(email)}`;

    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'Redefinir sua senha - Bold Life',
      body: `Olá ${userName || 'usuário'},\n\nVocê recebeu uma solicitação para redefinir sua senha.\n\nClique no link abaixo para redefinir:\n${resetUrl}\n\nSe você não solicitou isso, ignore este email.\n\nAtenciosamente,\nEquipe Bold Life`
    });

    return Response.json({ success: true, message: 'Email enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar reset de senha:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});