"""Services module for Juris System"""

from .whatsapp_service import (
    whatsapp_service,
    enviar_boas_vindas,
    enviar_link_publico,
    notificar_nova_movimentacao,
    notificar_novo_prazo,
)

__all__ = [
    'whatsapp_service',
    'enviar_boas_vindas',
    'enviar_link_publico',
    'notificar_nova_movimentacao',
    'notificar_novo_prazo',
]
