"""
Servico de Integracao WhatsApp - Evolution API v2
"""

import os
import re
import urllib.parse
from typing import Any, Dict

import requests


class WhatsAppService:
    """Servico para envio de mensagens WhatsApp via Evolution API."""

    def __init__(self):
        self.provider = os.getenv('WHATSAPP_PROVIDER', 'evolution')
        self.evolution_url = os.getenv('EVOLUTION_API_URL', 'http://localhost:8080').rstrip('/')
        self.evolution_key = os.getenv('EVOLUTION_API_KEY', '')
        self.instance_name = os.getenv('EVOLUTION_INSTANCE_NAME', 'juris-instance')

    def is_configured(self) -> bool:
        """Verifica se o servico esta configurado corretamente."""
        return self.provider == 'evolution' and bool(self.evolution_key) and bool(self.evolution_url)

    def _get_headers(self) -> Dict[str, str]:
        """Retorna headers padrao para requisicoes."""
        return {
            'apikey': self.evolution_key,
            'Content-Type': 'application/json',
        }

    def _candidate_base_urls(self) -> list:
        """
        Retorna URLs candidatas para conexao com Evolution.
        Se o host for 'evolution' (comum em Docker), tenta localhost como fallback.
        """
        candidates = [self.evolution_url]
        try:
            parsed = urllib.parse.urlparse(self.evolution_url)
            host = (parsed.hostname or '').lower()
            if host == 'evolution':
                scheme = parsed.scheme or 'http'
                port = f":{parsed.port}" if parsed.port else ''
                fallback = f"{scheme}://localhost{port}"
                if fallback not in candidates:
                    candidates.append(fallback)
        except Exception:
            pass
        return candidates

    def _request(self, method: str, path: str, **kwargs):
        """Executa request com fallback de DNS para localhost quando necessario."""
        last_error = None
        for base_url in self._candidate_base_urls():
            try:
                response = requests.request(method, f"{base_url}{path}", **kwargs)
                # Se fallback funcionou, persiste para proximas chamadas
                if base_url != self.evolution_url:
                    self.evolution_url = base_url
                return response
            except requests.exceptions.ConnectionError as exc:
                last_error = exc
                text = str(exc)
                if 'NameResolutionError' in text or "Failed to resolve 'evolution'" in text:
                    continue
                raise

        if last_error:
            raise last_error
        raise requests.exceptions.ConnectionError('Falha de conexao com Evolution API')

    def format_phone(self, phone: str) -> str:
        """
        Formata numero de telefone para padrao internacional.
        Ex: 6892188833 -> 556892188833
        """
        numero_limpo = re.sub(r'\D', '', phone or '')
        if not numero_limpo.startswith('55'):
            numero_limpo = '55' + numero_limpo
        return numero_limpo

    def create_instance(self) -> Dict[str, Any]:
        """Cria a instancia na Evolution API se nao existir."""
        try:
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
                    "CONNECTION_UPDATE",
                ],
            }

            response = self._request(
                'POST',
                '/instance/create',
                json=payload,
                headers={'Content-Type': 'application/json'},
                timeout=30,
            )

            if response.status_code in [200, 201]:
                data = response.json()
                return {
                    'success': True,
                    'instance': data.get('instance', {}),
                    'hash': data.get('hash', {}),
                }
            if response.status_code == 400 and 'already exists' in response.text:
                return {'success': True, 'message': 'Instancia ja existe'}
            return {'success': False, 'error': f'Erro {response.status_code}: {response.text}'}

        except requests.exceptions.ConnectionError:
            return {
                'success': False,
                'error': 'Nao foi possivel conectar a Evolution API. Verifique se ela esta rodando.',
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_connection_status(self) -> Dict[str, Any]:
        """Retorna o status da conexao com WhatsApp."""
        if not self.is_configured():
            return {
                'conectado': False,
                'erro': 'Servico nao configurado. Verifique as variaveis de ambiente.',
                'configurado': False,
            }

        try:
            response = self._request(
                'GET',
                f'/instance/connectionState/{self.instance_name}',
                headers=self._get_headers(),
                timeout=10,
            )

            if response.status_code == 200:
                data = response.json()
                state = data.get('instance', {}).get('state', 'unknown')
                return {
                    'conectado': state == 'open',
                    'estado': state,
                    'instancia': self.instance_name,
                    'configurado': True,
                }
            if response.status_code == 404:
                return {
                    'conectado': False,
                    'estado': 'not_found',
                    'erro': 'Instancia nao encontrada. Execute a criacao da instancia.',
                    'instancia': self.instance_name,
                    'configurado': True,
                }
            return {
                'conectado': False,
                'estado': 'error',
                'erro': f'Erro HTTP {response.status_code}',
                'configurado': True,
            }

        except requests.exceptions.ConnectionError:
            return {
                'conectado': False,
                'estado': 'offline',
                'erro': 'Evolution API offline. Verifique se o servico esta rodando.',
                'configurado': True,
            }
        except Exception as e:
            return {
                'conectado': False,
                'estado': 'error',
                'erro': str(e),
                'configurado': True,
            }

    def get_qr_code(self) -> Dict[str, Any]:
        """Obtem o QR Code para conexao."""
        return self.generate_qr_code()

    def generate_qr_code(self) -> Dict[str, Any]:
        """Obtem o QR Code para conexao."""
        try:
            response = self._request(
                'GET',
                f'/instance/connect/{self.instance_name}',
                headers=self._get_headers(),
                timeout=15,
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'qrcode': data.get('base64'),
                    'code': data.get('code'),
                    'pairingCode': data.get('pairingCode'),
                }
            return {'success': False, 'error': f'Erro {response.status_code}: {response.text}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def logout(self) -> Dict[str, Any]:
        """Desconecta a instancia do WhatsApp."""
        try:
            response = self._request(
                'DELETE',
                f'/instance/logout/{self.instance_name}',
                headers=self._get_headers(),
                timeout=10,
            )
            if response.status_code == 200:
                return {'success': True}
            return {'success': False, 'error': f'Erro {response.status_code}'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def send_text_message(self, phone: str, message: str) -> Dict[str, Any]:
        """Envia mensagem de texto via WhatsApp."""
        if not self.is_configured():
            return {
                'success': False,
                'sucesso': False,
                'error': 'WhatsApp nao configurado',
                'erro': 'Servico nao configurado. Verifique o .env',
                'modo': 'none',
            }

        status = self.get_connection_status()
        if not status.get('conectado'):
            return {
                'success': False,
                'sucesso': False,
                'error': 'WhatsApp nao conectado',
                'erro': f"WhatsApp nao conectado. Estado: {status.get('estado')}",
                'modo': 'none',
                'url_wame': f"https://wa.me/{self.format_phone(phone)}?text={urllib.parse.quote(message)}",
            }

        formatted_phone = self.format_phone(phone)

        try:
            payload = {
                'number': formatted_phone,
                'text': message,
                'options': {
                    'delay': 1200,
                    'presence': 'composing',
                },
            }

            response = self._request(
                'POST',
                f'/message/sendText/{self.instance_name}',
                json=payload,
                headers=self._get_headers(),
                timeout=30,
            )

            if response.status_code == 200:
                data = response.json()
                return {
                    'success': True,
                    'sucesso': True,
                    'modo': 'api',
                    'message_id': data.get('key', {}).get('id'),
                    'timestamp': data.get('messageTimestamp'),
                    'phone': formatted_phone,
                }

            return {
                'success': False,
                'sucesso': False,
                'error': f'API erro {response.status_code}: {response.text}',
                'erro': f'Erro na API: {response.status_code}',
                'modo': 'wa.me_fallback',
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

    def send_message_with_buttons(self, phone: str, message: str, buttons: list) -> Dict[str, Any]:
        """Envia mensagem com botoes (se suportado pela API)."""
        formatted_phone = self.format_phone(phone)

        try:
            payload = {
                'number': formatted_phone,
                'title': message[:50],
                'description': message,
                'footer': 'JurisGestao',
                'buttons': buttons,
            }

            response = self._request(
                'POST',
                f'/message/sendButtons/{self.instance_name}',
                json=payload,
                headers=self._get_headers(),
                timeout=30,
            )

            if response.status_code == 200:
                return {'success': True, 'sucesso': True, 'modo': 'api'}
            return self.send_text_message(phone, message)
        except Exception:
            return self.send_text_message(phone, message)


whatsapp_service = WhatsAppService()


def enviar_boas_vindas(telefone: str, nome: str) -> bool:
    mensagem = (
        f"Ola, *{nome}*!\n\n"
        f"Seja bem-vindo ao *JurisGestao*!\n\n"
        f"Seu cadastro foi realizado com sucesso. Agora voce recebera atualizacoes sobre seus processos por aqui.\n\n"
        f"Em caso de duvidas, entre em contato conosco."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def enviar_link_publico(telefone: str, nome_cliente: str, titulo_processo: str, link: str) -> bool:
    mensagem = (
        f"Ola, *{nome_cliente}*!\n\n"
        f"Seu processo *{titulo_processo}* esta disponivel para acompanhamento.\n\n"
        f"*Link de acesso:*\n{link}\n\n"
        f"Voce pode acessar para ver andamentos, prazos e documentos.\n\n"
        f"Em caso de duvidas, entre em contato conosco."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def notificar_nova_movimentacao(telefone: str, numero_processo: str, descricao: str, data: str = None) -> bool:
    mensagem = f"Nova movimentacao\n\nProcesso: {numero_processo}\n"
    if data:
        mensagem += f"Data: {data}\n"
    mensagem += f"Descricao: {descricao}\n\nAcesse o sistema para mais detalhes."
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def notificar_novo_prazo(telefone: str, numero_processo: str, prazo_titulo: str, data_prazo: str) -> bool:
    mensagem = (
        f"Novo prazo\n\n"
        f"Processo: {numero_processo}\n"
        f"Prazo: {prazo_titulo}\n"
        f"Data: {data_prazo}\n\n"
        f"Nao esqueca deste prazo!"
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)


def notificar_audiencia(telefone: str, numero_processo: str, data_audiencia: str, hora: str, local: str) -> bool:
    mensagem = (
        f"Audiencia marcada\n\n"
        f"Processo: {numero_processo}\n"
        f"Data: {data_audiencia}\n"
        f"Horario: {hora}\n"
        f"Local: {local}\n\n"
        f"Compareca com 30 minutos de antecedencia."
    )
    resultado = whatsapp_service.send_text_message(telefone, mensagem)
    return resultado.get('success', False)
