"""
Serviço de Notificações por Email
Integração com SMTP (Gmail, Outlook, etc) ou serviços como SendGrid
"""

import os
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import List, Optional, Dict, Any
from datetime import datetime
import sqlite3


class EmailService:
    """Serviço para envio de notificações por email"""
    
    def __init__(self):
        # Configurações SMTP
        self.smtp_host = os.getenv('SMTP_HOST', '')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER', '')
        self.smtp_pass = os.getenv('SMTP_PASS', '')
        self.smtp_from = os.getenv('SMTP_FROM', '')
        
        # Configurações de envio
        self.enabled = all([self.smtp_host, self.smtp_user, self.smtp_pass])
        
    def is_configured(self) -> bool:
        """Verifica se o serviço está configurado"""
        return self.enabled
    
    def _create_smtp_connection(self):
        """Cria conexão SMTP segura"""
        context = ssl.create_default_context()
        
        if self.smtp_port == 465:
            # SSL direto
            server = smtplib.SMTP_SSL(self.smtp_host, self.smtp_port, context=context)
        else:
            # STARTTLS
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            server.starttls(context=context)
        
        server.login(self.smtp_user, self.smtp_pass)
        return server
    
    def send_email(self, to_email: str, subject: str, html_content: str, 
                   text_content: str = None) -> Dict[str, Any]:
        """
        Envia email para um destinatário
        
        Args:
            to_email: Email do destinatário
            subject: Assunto do email
            html_content: Conteúdo HTML
            text_content: Conteúdo texto (opcional)
        
        Returns:
            Dict com 'success', 'message', etc.
        """
        if not self.is_configured():
            return {
                'success': False,
                'error': 'Serviço de email não configurado'
            }
        
        try:
            # Cria mensagem
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.smtp_from or self.smtp_user
            msg['To'] = to_email
            
            # Adiciona versão texto
            if text_content:
                msg.attach(MIMEText(text_content, 'plain', 'utf-8'))
            
            # Adiciona versão HTML
            msg.attach(MIMEText(html_content, 'html', 'utf-8'))
            
            # Envia
            with self._create_smtp_connection() as server:
                server.sendmail(
                    self.smtp_from or self.smtp_user,
                    to_email,
                    msg.as_string()
                )
            
            return {
                'success': True,
                'message': 'Email enviado com sucesso'
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_email_to_multiple(self, to_emails: List[str], subject: str, 
                               html_content: str, text_content: str = None) -> Dict[str, Any]:
        """Envia email para múltiplos destinatários"""
        results = []
        for email in to_emails:
            result = self.send_email(email, subject, html_content, text_content)
            results.append({'email': email, **result})
        
        success_count = sum(1 for r in results if r['success'])
        return {
            'success': success_count > 0,
            'total': len(results),
            'success_count': success_count,
            'results': results
        }


class NotificadorEmail:
    """Notificador específico para o JurisGestão"""
    
    def __init__(self, db_connection_func=None):
        self.email_service = EmailService()
        self.get_db = db_connection_func
    
    def _get_logo_url(self) -> str:
        """Retorna URL do logo"""
        return os.getenv('APP_LOGO_URL', 'https://via.placeholder.com/200x50/667eea/ffffff?text=JurisGestao')
    
    def _get_app_url(self) -> str:
        """Retorna URL da aplicação"""
        return os.getenv('APP_URL', 'http://localhost:3000')
    
    def _criar_template_base(self, titulo: str, conteudo: str, acao_texto: str = None, 
                             acao_link: str = None) -> str:
        """Cria template HTML base para emails"""
        logo_url = self._get_logo_url()
        app_url = self._get_app_url()
        ano_atual = datetime.now().year
        
        acao_html = f'''
        <tr>
            <td style="padding: 20px 30px; text-align: center;">
                <a href="{acao_link}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold;">
                    {acao_texto}
                </a>
            </td>
        </tr>
        ''' if acao_texto and acao_link else ''
        
        return f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{titulo}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4;">
        <tr>
            <td align="center" style="padding: 20px 0;">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⚖️ JurisGestão</h1>
                        </td>
                    </tr>
                    
                    <!-- Título -->
                    <tr>
                        <td style="padding: 30px 30px 20px 30px;">
                            <h2 style="color: #333333; margin: 0; font-size: 20px;">{titulo}</h2>
                        </td>
                    </tr>
                    
                    <!-- Conteúdo -->
                    <tr>
                        <td style="padding: 0 30px 20px 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                            {conteudo}
                        </td>
                    </tr>
                    
                    {acao_html}
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px; text-align: center; border-top: 1px solid #eeeeee; color: #999999; font-size: 12px;">
                            <p>Este é um email automático do sistema JurisGestão.</p>
                            <p>© {ano_atual} JurisGestão. Todos os direitos reservados.</p>
                            <p><a href="{app_url}" style="color: #667eea; text-decoration: none;">Acessar Sistema</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>'''
    
    def _get_usuarios_com_alerta_email(self, workspace_id: int, user_id: int = None):
        """Busca usuários que aceitam notificações por email"""
        if not self.get_db:
            return []
        
        db = self.get_db()
        
        if user_id:
            # Notificação específica para um usuário
            rows = db.execute(
                '''SELECT id, nome, email, alerta_email FROM users 
                   WHERE id = ? AND workspace_id = ? AND alerta_email = 1''',
                (user_id, workspace_id)
            ).fetchall()
        else:
            # Notificação para todos do workspace com alerta_email ativo
            rows = db.execute(
                '''SELECT id, nome, email, alerta_email FROM users 
                   WHERE workspace_id = ? AND alerta_email = 1''',
                (workspace_id,)
            ).fetchall()
        
        return [dict(r) for r in rows if r['email']]
    
    def notificar_nova_movimentacao(self, workspace_id: int, processo_id: int, 
                                    numero_processo: str, descricao: str, 
                                    data_movimento: str = None, user_id: int = None) -> Dict:
        """Notifica sobre nova movimentação processual"""
        if not self.email_service.is_configured():
            return {'success': False, 'error': 'Email não configurado'}
        
        usuarios = self._get_usuarios_com_alerta_email(workspace_id, user_id)
        if not usuarios:
            return {'success': False, 'error': 'Nenhum usuário com alerta de email ativo'}
        
        titulo = f"📋 Nova Movimentação - Processo {numero_processo}"
        
        conteudo = f"""
        <p>Olá,</p>
        <p>Uma nova movimentação foi registrada no processo:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
            <p style="margin: 0;"><strong>Número:</strong> {numero_processo}</p>
            <p style="margin: 5px 0 0 0;"><strong>Descrição:</strong> {descricao}</p>
            {f'<p style="margin: 5px 0 0 0;"><strong>Data:</strong> {data_movimento}</p>' if data_movimento else ''}
        </div>
        <p>Acesse o sistema para mais detalhes.</p>
        """
        
        html = self._criar_template_base(
            titulo=titulo,
            conteudo=conteudo,
            acao_texto="Ver Processo",
            acao_link=f"{self._get_app_url()}/processos/{processo_id}"
        )
        
        emails = [u['email'] for u in usuarios]
        return self.email_service.send_email_to_multiple(emails, titulo, html)
    
    def notificar_novo_prazo(self, workspace_id: int, processo_id: int,
                             numero_processo: str, titulo_prazo: str, 
                             data_prazo: str, descricao: str = None,
                             user_id: int = None) -> Dict:
        """Notifica sobre novo prazo processual"""
        if not self.email_service.is_configured():
            return {'success': False, 'error': 'Email não configurado'}
        
        usuarios = self._get_usuarios_com_alerta_email(workspace_id, user_id)
        if not usuarios:
            return {'success': False, 'error': 'Nenhum usuário com alerta de email ativo'}
        
        titulo = f"⏰ Novo Prazo - Processo {numero_processo}"
        
        conteudo = f"""
        <p>Olá,</p>
        <p>Um novo prazo foi cadastrado:</p>
        <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>Processo:</strong> {numero_processo}</p>
            <p style="margin: 5px 0 0 0;"><strong>Prazo:</strong> {titulo_prazo}</p>
            <p style="margin: 5px 0 0 0;"><strong>Data Limite:</strong> <span style="color: #d73502; font-weight: bold;">{data_prazo}</span></p>
            {f'<p style="margin: 5px 0 0 0;"><strong>Descrição:</strong> {descricao}</p>' if descricao else ''}
        </div>
        <p>Não perca este prazo!</p>
        """
        
        html = self._criar_template_base(
            titulo=titulo,
            conteudo=conteudo,
            acao_texto="Ver Prazo",
            acao_link=f"{self._get_app_url()}/processos/{processo_id}"
        )
        
        emails = [u['email'] for u in usuarios]
        return self.email_service.send_email_to_multiple(emails, titulo, html)
    
    def notificar_nova_tarefa(self, workspace_id: int, tarefa_id: int,
                              titulo_tarefa: str, descricao: str = None,
                              data_vencimento: str = None, usuario_atribuido_id: int = None) -> Dict:
        """Notifica sobre nova tarefa atribuída"""
        if not self.email_service.is_configured():
            return {'success': False, 'error': 'Email não configurado'}
        
        # Se tem usuário atribuído, notifica só ele
        usuarios = self._get_usuarios_com_alerta_email(
            workspace_id, 
            usuario_atribuido_id if usuario_atribuido_id else None
        )
        
        if not usuarios:
            return {'success': False, 'error': 'Nenhum usuário com alerta de email ativo'}
        
        titulo = f"✅ Nova Tarefa Atribuída - {titulo_tarefa}"
        
        vencimento_html = f'<p style="margin: 5px 0 0 0;"><strong>Vencimento:</strong> {data_vencimento}</p>' if data_vencimento else ''
        
        conteudo = f"""
        <p>Olá,</p>
        <p>Uma nova tarefa foi atribuída a você:</p>
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
            <p style="margin: 0;"><strong>Tarefa:</strong> {titulo_tarefa}</p>
            {f'<p style="margin: 5px 0 0 0;"><strong>Descrição:</strong> {descricao}</p>' if descricao else ''}
            {vencimento_html}
        </div>
        """
        
        html = self._criar_template_base(
            titulo=titulo,
            conteudo=conteudo,
            acao_texto="Ver Tarefa",
            acao_link=f"{self._get_app_url()}/tarefas"
        )
        
        emails = [u['email'] for u in usuarios]
        return self.email_service.send_email_to_multiple(emails, titulo, html)
    
    def notificar_audiencia(self, workspace_id: int, processo_id: int,
                           numero_processo: str, data_audiencia: str, 
                           hora: str, local: str, user_id: int = None) -> Dict:
        """Notifica sobre audiência marcada"""
        if not self.email_service.is_configured():
            return {'success': False, 'error': 'Email não configurado'}
        
        usuarios = self._get_usuarios_com_alerta_email(workspace_id, user_id)
        if not usuarios:
            return {'success': False, 'error': 'Nenhum usuário com alerta de email ativo'}
        
        titulo = f"⚖️ Audiência Marcada - Processo {numero_processo}"
        
        conteudo = f"""
        <p>Olá,</p>
        <p>Uma audiência foi marcada:</p>
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #0066cc;">
            <p style="margin: 0;"><strong>Processo:</strong> {numero_processo}</p>
            <p style="margin: 5px 0 0 0;"><strong>Data:</strong> {data_audiencia}</p>
            <p style="margin: 5px 0 0 0;"><strong>Horário:</strong> {hora}</p>
            <p style="margin: 5px 0 0 0;"><strong>Local:</strong> {local}</p>
        </div>
        <p><strong>⚠️ Importante:</strong> Compareça com pelo menos 30 minutos de antecedência.</p>
        """
        
        html = self._criar_template_base(
            titulo=titulo,
            conteudo=conteudo,
            acao_texto="Ver Processo",
            acao_link=f"{self._get_app_url()}/processos/{processo_id}"
        )
        
        emails = [u['email'] for u in usuarios]
        return self.email_service.send_email_to_multiple(emails, titulo, html)
    
    def notificar_lembrete_prazo(self, workspace_id: int, dias_antes: int = 3) -> Dict:
        """Envia lembretes de prazos próximos"""
        if not self.email_service.is_configured() or not self.get_db:
            return {'success': False, 'error': 'Serviço não configurado'}
        
        from datetime import datetime, timedelta
        
        db = self.get_db()
        data_limite = (datetime.now() + timedelta(days=dias_antes)).strftime('%Y-%m-%d')
        
        # Busca prazos próximos
        prazos = db.execute('''
            SELECT p.*, pr.numero as processo_numero, pr.id as processo_id
            FROM prazos p
            JOIN processos pr ON p.processo_id = pr.id
            WHERE p.workspace_id = ? 
            AND p.status = 'pendente'
            AND p.data_prazo <= ?
            ORDER BY p.data_prazo
        ''', (workspace_id, data_limite)).fetchall()
        
        if not prazos:
            return {'success': True, 'message': 'Nenhum prazo próximo encontrado'}
        
        usuarios = self._get_usuarios_com_alerta_email(workspace_id)
        if not usuarios:
            return {'success': False, 'error': 'Nenhum usuário com alerta de email ativo'}
        
        # Cria lista de prazos
        prazos_html = ""
        for prazo in prazos:
            prazos_html += f"""
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{prazo['processo_numero']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee;">{prazo['tipo']}</td>
                <td style="padding: 10px; border-bottom: 1px solid #eee; color: #d73502; font-weight: bold;">{prazo['data_prazo']}</td>
            </tr>
            """
        
        titulo = f"⏰ Lembretes de Prazos - Próximos {dias_antes} dias"
        
        conteudo = f"""
        <p>Olá,</p>
        <p>Você tem <strong>{len(prazos)} prazo(s)</strong> pendente(s) nos próximos {dias_antes} dias:</p>
        
        <table width="100%" style="border-collapse: collapse; margin: 15px 0;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Processo</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Tipo</th>
                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Data</th>
                </tr>
            </thead>
            <tbody>
                {prazos_html}
            </tbody>
        </table>
        
        <p>Não deixe para a última hora!</p>
        """
        
        html = self._criar_template_base(
            titulo=titulo,
            conteudo=conteudo,
            acao_texto="Ver Prazos",
            acao_link=f"{self._get_app_url()}/prazos"
        )
        
        emails = [u['email'] for u in usuarios]
        return self.email_service.send_email_to_multiple(emails, titulo, html)


# Instância global
email_service = EmailService()
notificador_email = NotificadorEmail()


def configurar_db(db_func):
    """Configura a função de conexão com o banco de dados"""
    notificador_email.get_db = db_func


# Funções de conveniência para uso rápido
def enviar_email(to_email: str, subject: str, html_content: str) -> Dict:
    """Envia email simples"""
    return email_service.send_email(to_email, subject, html_content)


def notificar_movimentacao_email(workspace_id: int, processo_id: int, 
                                 numero_processo: str, descricao: str,
                                 data_movimento: str = None) -> Dict:
    """Notifica movimentação por email"""
    return notificador_email.notificar_nova_movimentacao(
        workspace_id, processo_id, numero_processo, descricao, data_movimento
    )


def notificar_prazo_email(workspace_id: int, processo_id: int,
                          numero_processo: str, titulo_prazo: str,
                          data_prazo: str, descricao: str = None) -> Dict:
    """Notifica prazo por email"""
    return notificador_email.notificar_novo_prazo(
        workspace_id, processo_id, numero_processo, titulo_prazo, data_prazo, descricao
    )


def notificar_tarefa_email(workspace_id: int, tarefa_id: int,
                           titulo_tarefa: str, descricao: str = None,
                           data_vencimento: str = None, usuario_atribuido_id: int = None) -> Dict:
    """Notifica tarefa por email"""
    return notificador_email.notificar_nova_tarefa(
        workspace_id, tarefa_id, titulo_tarefa, descricao, data_vencimento, usuario_atribuido_id
    )
