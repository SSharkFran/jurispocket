"""
Servico de Integracao WhatsApp - Microservico WhatsApp Web
"""

import os
import re
import time
import urllib.parse
from typing import Any, Dict, Optional, Union

import requests


class WhatsAppService:
    """Servico para envio de mensagens via microservico WhatsApp Web."""

    def __init__(self):
        self.provider = os.getenv('WHATSAPP_PROVIDER', 'whatsapp-web')
        self.service_url = os.getenv('WHATSAPP_MICROSERVICE_URL', 'http://localhost:3001').rstrip('/')
        self.service_api_key = os.getenv('WHATSAPP_MICROSERVICE_TOKEN', '')
        self.timeout_seconds = self._parse_timeout_seconds(
            os.getenv('WHATSAPP_MICROSERVICE_TIMEOUT'),
            default=20,
        )

    @staticmethod
    def _parse_timeout_seconds(raw_value: Optional[str], default: int = 20) -> int:
        """Converte timeout de ambiente com fallback seguro."""
        try:
            if raw_value is None:
                return default
            value = str(raw_value).strip()
            if not value:
                return default
            parsed = int(value)
            return parsed if parsed > 0 else default
        except (TypeError, ValueError):
            return default

    def is_configured(self) -> bool:
        """Verifica se o servico esta configurado corretamente."""
        return bool(self.service_url)

    def _get_headers(self) -> Dict[str, str]:
        """Retorna headers padrao para requisicoes."""
        headers: Dict[str, str] = {}
        if self.service_api_key:
            headers['x-api-key'] = self.service_api_key
        return headers

    def _request(self, method: str, path: str, **kwargs):
        """Executa request para o microservico."""
        headers = kwargs.pop('headers', {}) or {}
        headers.update(self._get_headers())

        return requests.request(
            method,
            f"{self.service_url}{path}",
            headers=headers,
            timeout=kwargs.pop('timeout', self.timeout_seconds),
            **kwargs,
        )

    def format_phone(self, phone: str) -> str:
        """
        Formata numero de telefone para padrao internacional.
        Ex: 6892188833 -> 556892188833
        """
        numero_limpo = re.sub(r'\D', '', phone or '')
        if not numero_limpo:
            return ''

        if numero_limpo.startswith('55'):
            return numero_limpo

        if len(numero_limpo) in [10, 11]:
            return '55' + numero_limpo

        return numero_limpo

    def connect_user(self, user_id: Union[int, str, None]) -> Dict[str, Any]:
        """Inicializa sessao WhatsApp de um usuario."""
        if not user_id:
            return {'success': False, 'error': 'user_id obrigatorio'}

        try:
            response = self._request('POST', f'/whatsapp/connect/{user_id}')
            data = response.json() if response.text else {}

            if response.status_code == 200 and data.get('success'):
                return {'success': True, **data}

            return {
                'success': False,
                'error': data.get('error') or f'Erro {response.status_code}: {response.text}',
            }
        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Nao foi possivel conectar ao microservico WhatsApp.',
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def create_instance(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Compatibilidade com codigo legado. Equivale a iniciar sessao."""
        if not user_id:
            return {'success': False, 'error': 'user_id obrigatorio'}
        return self.connect_user(user_id)

    def get_connection_status(self, user_id: Union[int, str, None] = None) -> Dict[str, Any]:
        """Retorna o status da conexao com WhatsApp para um usuario."""
        if not self.is_configured():
            return {
                'connected': False,
                'conectado': False,
                'state': 'not_configured',
                'estado': 'not_configured',
                'error': 'Servico nao configurado',
                'erro': 'Servico nao configurado. Verifique as variaveis de ambiente.',
                'configurado': False,
            }

        if not user_id:
            return {
                'connected': False,
                'conectado': False,
                'state': 'invalid_user',
                'estado': 'invalid_user',
                'error': 'user_id obrigatorio',
                'erro': 'ID do usuario e obrigatorio para status.',
                'configurado': True,
            }

        try:
            response = self._request('GET', f'/whatsapp/status/{user_id}', timeout=10)
            data = response.json() if response.text else {}

            if response.status_code == 200:
                connected = bool(data.get('connected', False))
                state = data.get('state', 'unknown')
                me = data.get('me') or {}
                me_phone = me.get('phone') if isinstance(me, dict) else None
                me_name = me.get('name') if isinstance(me, dict) else None
                return {
                    'connected': connected,
                    'conectado': connected,
                    'state': state,
                    'estado': state,
                    'configurado': True,
                    'user_id': user_id,
                    'has_qrcode': data.get('hasQrCode', False),
                    'last_error': data.get('lastError'),
                    'me': me or None,
                    'phone_number': me_phone,
                    'display_name': me_name,
                    'recent_acks': data.get('recentAcks'),
                }

            return {
                'connected': False,
                'conectado': False,
                'state': 'error',
                'estado': 'error',
                'error': f'Erro HTTP {response.status_code}',
                'erro': f'Erro HTTP {response.status_code}',
                'configurado': True,
                'user_id': user_id,
            }

        except requests.exceptions.ConnectionError:
            return {
                'connected': False,
                'conectado': False,
                'state': 'offline',
                'estado': 'offline',
                'error': 'Microservico WhatsApp offline.',
                'erro': 'Microservico WhatsApp offline. Verifique se o servico esta rodando.',
                'configurado': True,
                'user_id': user_id,
            }
        except Exception as e:
            return {
                'connected': False,
                'conectado': False,
                'state': 'error',
                'estado': 'error',
                'error': str(e),
                'erro': str(e),
                'configurado': True,
                'user_id': user_id,
            }

    def get_qr_code(self, user_id: Union[int, str, None] = None) -> Dict[str, Any]:
        """Obtem QR code de conexao."""
        return self.generate_qr_code(user_id)

    def generate_qr_code(self, user_id: Union[int, str, None] = None) -> Dict[str, Any]:
        """Obtem QR code para conexao de um usuario."""
        if not user_id:
            return {'success': False, 'error': 'user_id obrigatorio'}

        connect_result = self.connect_user(user_id)
        if not connect_result.get('success'):
            return connect_result

        try:
            max_attempts = 5
            for _ in range(max_attempts):
                response = self._request('GET', f'/whatsapp/qrcode/{user_id}', timeout=15)
                data = response.json() if response.text else {}

                if response.status_code == 200 and data.get('success'):
                    return {
                        'success': True,
                        'qrcode': data.get('qrcode'),
                        'state': data.get('state'),
                        'connected': data.get('connected', False),
                    }

                if data.get('connected') and data.get('state') == 'connected':
                    return {
                        'success': False,
                        'error': 'Usuario ja conectado. Nao ha QR code pendente.',
                        'state': data.get('state'),
                        'connected': True,
                    }

                # Aguarda curto intervalo para permitir atualizacao do evento QR no socket
                time.sleep(1)

            return {
                'success': False,
                'error': 'QR code ainda nao disponivel. Aguarde e tente novamente.',
                'state': data.get('state') if 'data' in locals() else None,
                'connected': data.get('connected', False) if 'data' in locals() else False,
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def logout(self, user_id: Union[int, str, None] = None) -> Dict[str, Any]:
        """Desconecta sessao do WhatsApp do usuario."""
        if not user_id:
            return {'success': False, 'error': 'user_id obrigatorio'}

        try:
            response = self._request(
                'POST',
                f'/whatsapp/disconnect/{user_id}',
                json={'logout': True},
                timeout=10,
            )
            data = response.json() if response.text else {}

            if response.status_code == 200 and data.get('success'):
                return {'success': True}

            return {'success': False, 'error': data.get('error') or f'Erro {response.status_code}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_text_message(
        self,
        user_id: Union[int, str, None],
        phone: str,
        message: str,
    ) -> Dict[str, Any]:
        """Envia mensagem de texto via WhatsApp do usuario."""
        if not self.is_configured():
            return {
                'success': False,
                'sucesso': False,
                'error': 'WhatsApp nao configurado',
                'erro': 'Servico nao configurado. Verifique o .env',
                'modo': 'none',
            }

        if not user_id:
            return {
                'success': False,
                'sucesso': False,
                'error': 'user_id obrigatorio',
                'erro': 'Nao foi possivel identificar o usuario da sessao WhatsApp.',
                'modo': 'none',
            }

        formatted_phone = self.format_phone(phone)
        if not formatted_phone:
            return {
                'success': False,
                'sucesso': False,
                'error': 'Telefone invalido',
                'erro': 'Telefone invalido',
                'modo': 'none',
            }

        try:
            payload = {
                'to': formatted_phone,
                'message': message,
            }

            response = self._request(
                'POST',
                f'/whatsapp/send/{user_id}',
                json=payload,
                timeout=30,
            )
            data = response.json() if response.text else {}

            if response.status_code == 200 and data.get('success'):
                delivery_confirmed = data.get('deliveryConfirmed')
                ack_status = data.get('ackStatus')
                ack_source = data.get('ackSource')
                ack_timestamp = data.get('ackTimestamp')
                warning = data.get('warning')

                if delivery_confirmed is False:
                    warning_text = (
                        warning
                        or 'Mensagem enviada sem confirmacao de entrega no WhatsApp.'
                    )
                    return {
                        'success': False,
                        'sucesso': False,
                        'error': warning_text,
                        'erro': warning_text,
                        'modo': 'api_unconfirmed',
                        'message_id': data.get('messageId'),
                        'timestamp': data.get('timestamp'),
                        'phone': formatted_phone,
                        'delay_ms': data.get('delayMs'),
                        'delivery_confirmed': False,
                        'ack_status': ack_status,
                        'ack_source': ack_source,
                        'ack_timestamp': ack_timestamp,
                    }

                return {
                    'success': True,
                    'sucesso': True,
                    'modo': 'api',
                    'message_id': data.get('messageId'),
                    'timestamp': data.get('timestamp'),
                    'phone': formatted_phone,
                    'delay_ms': data.get('delayMs'),
                    'delivery_confirmed': None if delivery_confirmed is None else bool(delivery_confirmed),
                    'ack_status': ack_status,
                    'ack_source': ack_source,
                    'ack_timestamp': ack_timestamp,
                }

            not_connected = response.status_code == 409
            error_text = data.get('error') or f'API erro {response.status_code}'

            return {
                'success': False,
                'sucesso': False,
                'error': error_text,
                'erro': error_text,
                'modo': 'wa.me_fallback' if not_connected else 'error',
                'url_wame': f"https://wa.me/{formatted_phone}?text={urllib.parse.quote(message)}",
            }

        except requests.Timeout:
            return {
                'success': False,
                'sucesso': False,
                'error': 'Timeout na API',
                'erro': 'API demorou muito para responder',
                'modo': 'wa.me_fallback',
                'url_wame': f"https://wa.me/{formatted_phone}?text={urllib.parse.quote(message)}",
            }
        except Exception as e:
            return {
                'success': False,
                'sucesso': False,
                'error': str(e),
                'erro': f'Erro: {str(e)}',
                'modo': 'error',
                'url_wame': f"https://wa.me/{formatted_phone}?text={urllib.parse.quote(message)}",
            }

    def send_message_with_buttons(
        self,
        user_id: Union[int, str, None],
        phone: str,
        message: str,
        buttons: list,
    ) -> Dict[str, Any]:
        """Fallback para texto. Botoes nao sao suportados no MVP."""
        _ = buttons
        return self.send_text_message(user_id, phone, message)


whatsapp_service = WhatsAppService()


def enviar_boas_vindas(telefone: str, nome: str, user_id: Union[int, str, None] = None) -> bool:
    mensagem = (
        f"Ola, *{nome}*!\n\n"
        f"Seja bem-vindo ao *JurisPocket*!\n\n"
        f"Seu cadastro foi realizado com sucesso. Agora voce recebera atualizacoes sobre seus processos por aqui.\n\n"
        f"Em caso de duvidas, entre em contato conosco."
    )
    resultado = whatsapp_service.send_text_message(user_id, telefone, mensagem)
    return resultado.get('success', False)


def enviar_link_publico(
    telefone: str,
    nome_cliente: str,
    titulo_processo: str,
    link: str,
    user_id: Union[int, str, None] = None,
) -> bool:
    mensagem = (
        f"Ola, *{nome_cliente}*!\n\n"
        f"Seu processo *{titulo_processo}* esta disponivel para acompanhamento.\n\n"
        f"*Link de acesso:*\n{link}\n\n"
        f"Voce pode acessar para ver andamentos, prazos e documentos.\n\n"
        f"Em caso de duvidas, entre em contato conosco."
    )
    resultado = whatsapp_service.send_text_message(user_id, telefone, mensagem)
    return resultado.get('success', False)


def notificar_nova_movimentacao(
    telefone: str,
    numero_processo: str,
    descricao: str,
    data: str = None,
    user_id: Union[int, str, None] = None,
) -> bool:
    mensagem = f"Nova movimentacao\n\nProcesso: {numero_processo}\n"
    if data:
        mensagem += f"Data: {data}\n"
    mensagem += f"Descricao: {descricao}\n\nAcesse o sistema para mais detalhes."
    resultado = whatsapp_service.send_text_message(user_id, telefone, mensagem)
    return resultado.get('success', False)


def notificar_novo_prazo(
    telefone: str,
    numero_processo: str,
    prazo_titulo: str,
    data_prazo: str,
    user_id: Union[int, str, None] = None,
) -> bool:
    mensagem = (
        f"Novo prazo\n\n"
        f"Processo: {numero_processo}\n"
        f"Prazo: {prazo_titulo}\n"
        f"Data: {data_prazo}\n\n"
        f"Nao esqueca deste prazo!"
    )
    resultado = whatsapp_service.send_text_message(user_id, telefone, mensagem)
    return resultado.get('success', False)


def notificar_audiencia(
    telefone: str,
    numero_processo: str,
    data_audiencia: str,
    hora: str,
    local: str,
    user_id: Union[int, str, None] = None,
) -> bool:
    mensagem = (
        f"Audiencia marcada\n\n"
        f"Processo: {numero_processo}\n"
        f"Data: {data_audiencia}\n"
        f"Horario: {hora}\n"
        f"Local: {local}\n\n"
        f"Compareca com 30 minutos de antecedencia."
    )
    resultado = whatsapp_service.send_text_message(user_id, telefone, mensagem)
    return resultado.get('success', False)
