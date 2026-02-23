"""
Serviço de Integração WhatsApp - Evolution API v2
"""

import os
import requests
import json
from typing import Optional, Dict, Any
import urllib.parse
import re


class WhatsAppService:
    """Serviço para envio de mensagens WhatsApp via Evolution API"""
    
    def __init__(self):
        self.provider = os.getenv('WHATSAPP_PROVIDER', 'evolution')
        self.evolution_url = os.getenv('EVOLUTION_API_URL', 'http://localhost:8080')
        self.evolution_key = os.getenv('EVOLUTION_API_KEY', '')
        self.instance_name = os.getenv('EVOLUTION_INSTANCE_NAME', 'juris-instance')
        
    def is_configured(self) -> bool:
        """Verifica se o serviço está configurado corretamente"""
        return (
            self.provider == 'evolution' 
            and bool(self.evolution_key) 
            and bool(self.evolution_url)
        )
    
    def _get_headers(self) -> Dict[str, str]:
        """Retorna headers padrão para requisições"""
        return {
            'apikey': self.evolution_key,
            'Content-Type': 'application/json'
        }
    
    def format_phone(self, phone: str) -> str:
        """
        Formata número de telefone para padrão internacional
        Ex: 6892188833 -> 556892188833
        """
        # Remove tudo que não é dígito
        numero_limpo = re.sub(r'\D', '', phone)
        
        # Se não começar com 55, adiciona
        if not numero_limpo.startswith('55'):
            numero_limpo = '55' + numero_limpo
            
        return numero_limpo
    
    def create_instance(self) -> Dict[str, Any]:
        """
        Cria a instância na Evolution API se não existir
        """
        try:
            url = f"{self.evolution_url}/instance/create"
            
            payload = {
                "instanceName": self.instance_name,
                "token": self.evolution_key,
                "qrcode": True,
                "webhook": None,
                "webhook_by_events": False,
                "events": [
                    "APPLICATION_STARTUP",
                    "QRCODE_UPDATED",
                    "MESSAGES_SET",
                    "MESSAGES_UPSERT",
                    "MESSAGES_UPDATE",
                    "SEND_MESSAGE",
                    "CONNECTION_UPDATE"
                ]
            }
            
            response = requests.post(
                url,
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    'success': True,
                    'instance': data.get('instance', {}),
                    'hash': data.get('hash', {})
                }
            elif response.status_code == 400 and 'already exists' in response.text:
                return {
                    'success': True,
                    'message': 'Instância já existe'
                }
            else:
                return {
                    'success': False,
                    'error': f'Erro {response.status_code}: {response.text}'
                }
                
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Não foi possível conectar à Evolution API. Verifique se ela está rodando.'
            }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_connection_status(self) -> Dict[str, Any]:
        """
        Retorna o status da conexão com WhatsApp
        """
        if not self.is_configured():
            return {
                'conectado': False,
                'erro': 'Serviço não configurado. Verifique as variáveis de ambiente.',
                'configurado': False
            }
        
        try:
            url = f"{self.evolution_url}/instance/connectionState/{self.instance_name}"
            response = requests.get(url, headers=self._get_headers(), timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                state = data.get('instance', {}).get('state', 'unknown')
                return {
                    'conectado': state == 'open',
                    'estado': state,
                    'instancia': self.instance_name,
                    'configurado': True
                }
            elif response.status_code == 404:
                # Instância não existe, precisa criar
                return {
                    'conectado': False,
                    'estado': 'not_found',
                    'erro': 'Instância não encontrada. Execute a criação da instância.',
                    'instancia': self.instance_name,
                    'configurado': True
                }
            else:
                return {
                    'conectado': False,
                    'estado': 'error',
                    'erro': f'Erro HTTP {response.status_code}',
                    'configurado': True
                }
                
        except requests.exceptions.ConnectionError:
            return {
                'conectado': False,
                'estado': 'offline',
                'erro': 'Evolution API offline. Verifique se o serviço está rodando.',
                'configurado': True
            }
        except Exception as e:
            return {
                'conectado': False,
                'estado': 'error',
                'erro': str(e),
                'configurado': True
            }
    
    def get_qr_code(self) -> Dict[str, Any]:
        """
        Obtém o QR Code para conexão
        """
        return self.generate_qr_code()
    
    def generate_qr_code(self) -> Dict[str, Any]:
        """
        Obtém o QR Code para conexão (alias para compatibilidade)
        """
        try:
            url = f"{self.evolution_url}/instance/connect/{self.instance_name}"
            response = requests.get(url, headers=self._get_headers(), timeout=15)
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'qrcode': data.get('base64'),
                    'code': data.get('code'),
                    'pairingCode': data.get('pairingCode')
                }
            else:
                return {
                    'success': False,
                    'error': f'Erro {response.status_code}: {response.text}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def logout(self) -> Dict[str, Any]:
        """
        Desconecta a instância do WhatsApp
        """
        try:
            url = f"{self.evolution_url}/instance/logout/{self.instance_name}"
            response = requests.delete(url, headers=self._get_headers(), timeout=10)
            
            if response.status_code == 200:
                return {'success': True}
            else:
                return {
                    'success': False,
                    'error': f'Erro {response.status_code}'
                }
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def send_text_message(self, phone: str, message: str) -> Dict[str, Any]:
        """
        Envia mensagem de texto via WhatsApp
        
        Args:
            phone: Número de telefone (com ou sem código do país)
            message: Texto da mensagem
            
        Returns:
            Dict com 'success', 'sucesso', 'error', 'erro', etc.
        """
        # Verifica configuração
        if not self.is_configured():
            return {
                'success': False,
                'sucesso': False,
                'error': 'WhatsApp não configurado',
                'erro': 'Serviço não configurado. Verifique o .env',
                'modo': 'none'
            }
        
        # Verifica status da conexão
        status = self.get_connection_status()
        if not status.get('conectado'):
            return {
                'success': False,
                'sucesso': False,
                'error': 'WhatsApp não conectado',
                'erro': f"WhatsApp não conectado. Estado: {status.get('estado')}",
                'modo': 'none',
                'url_wame': f"https://wa.me/{self.format_phone(phone)}?text={urllib.parse.quote(message)}"
            }
        
        # Formata o número
        formatted_phone = self.format_phone(phone)
        
        try:
            url = f"{self.evolution_url}/message/sendText/{self.instance_name}"
            
            payload = {
                'number': formatted_phone,
                'text': message,
                'options': {
                    'delay': 1200,
                    'presence': 'composing'
                }
            }
            
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'sucesso': True,
                    'modo': 'api',
                    'message_id': data.get('key', {}).get('id'),
                    'timestamp': data.get('messageTimestamp'),
                    'phone': formatted_phone
                }
            else:
                error_text = response.text
                return {
                    'success': False,
                    'sucesso': False,
                    'error': f'API erro {response.status_code}: {error_text}',
                    'erro': f'Erro na API: {response.status_code}',
                    'modo': 'wa.me_fallback',
                    'url_wame': f"https://wa.me/{formatted_phone}?text={urllib.parse.quote(message)}"
                }
                
        except requests.Timeout:
            return {
                'success': False,
                'sucesso': False,
                'error': 'Timeout na API',
                'erro': 'API demorou muito para responder',
                'modo': 'wa.me_fallback',
                'url_wame': f"https://wa.me/{formatted_phone}?text={urllib.parse.quote(message)}"
            }
        except Exception as e:
            return {
                'success': False,
                'sucesso': False,
                'error': str(e),
                'erro': f'Erro: {str(e)}',
                'modo': 'error',
                'url_wame': f"https://wa.me/{formatted_phone}?text={urllib.parse.quote(message)}"
            }
    
    def send_message_with_buttons(self, phone: str, message: str, buttons: list) -> Dict[str, Any]:
        """
        Envia mensagem com botões (se suportado pela API)
        """
        formatted_phone = self.format_phone(phone)
        
        try:
            url = f"{self.evolution_url}/message/sendButtons/{self.instance_name}"
            
            payload = {
                'number': formatted_phone,
                'title': message[:50],
                'description': message,
                'footer': 'JurisGestão',
                'buttons': buttons
            }
            
            response = requests.post(
                url,
                json=payload,
                headers=self._get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                return {
                    'success': True,
                    'sucesso': True,
                    'modo': 'api'
                }
            else:
                # Fallback para texto simples
                return self.send_text_message(phone, message)
                
        except Exception as e:
            return self.send_text_message(phone, message)


# Instância global do serviço
whatsapp_service = WhatsAppService()


# ============================================================================
# FUNÇÕES AUXILIARES DE ALTO NÍVEL
# ============================================================================

def enviar_boas_vindas(telefone: str, nome: str) -> bool:
    """Envia mensagem de boas-vindas para novo cliente"""
    mensagem = (
        f"👋 Olá, *{nome}*!\n\n"
        f"Seja bem-vindo ao *JurisGestão*! 🏛️\n\n"
        f"Seu cadastro foi realizado com sucesso. "
        f"Agora você receberá atualizações sobre seus processos por aqui.\n\n"
        f"Em caso de dúvidas, entre em contato conosco."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def enviar_link_publico(telefone: str, nome_cliente: str, titulo_processo: str, link: str) -> bool:
    """Envia link público de acompanhamento de processo"""
    mensagem = (
        f"👋 Olá, *{nome_cliente}*!\n\n"
        f"📋 Seu processo *{titulo_processo}* está disponível para acompanhamento.\n\n"
        f"🔗 *Link de acesso:*\n{link}\n\n"
        f"Você pode acessar para ver andamentos, prazos e documentos.\n\n"
        f"Em caso de dúvidas, entre em contato conosco."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def notificar_nova_movimentacao(telefone: str, numero_processo: str, descricao: str, data: str = None) -> bool:
    """Notifica cliente sobre nova movimentação no processo"""
    mensagem = (
        f"📋 *Nova Movimentação*\n\n"
        f"⚖️ Processo: {numero_processo}\n"
    )
    if data:
        mensagem += f"📅 Data: {data}\n"
    mensagem += (
        f"📝 Descrição: {descricao}\n\n"
        f"Acesse o sistema para mais detalhes."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def notificar_novo_prazo(telefone: str, numero_processo: str, prazo_titulo: str, data_prazo: str) -> bool:
    """Notifica cliente sobre novo prazo processual"""
    mensagem = (
        f"⏰ *Novo Prazo*\n\n"
        f"⚖️ Processo: {numero_processo}\n"
        f"📌 Prazo: {prazo_titulo}\n"
        f"📅 Data: {data_prazo}\n\n"
        f"⚠️ Não esqueça deste prazo!"
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def notificar_audiencia(telefone: str, numero_processo: str, data_audiencia: str, hora: str, local: str) -> bool:
    """Notifica cliente sobre audiência marcada"""
    mensagem = (
        f"⚖️ *Audiência Marcada*\n\n"
        f"📋 Processo: {numero_processo}\n"
        f"📅 Data: {data_audiencia}\n"
        f"🕐 Horário: {hora}\n"
        f"📍 Local: {local}\n\n"
        f"Compareça com 30 minutos de antecedência."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)
