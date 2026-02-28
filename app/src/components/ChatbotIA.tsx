import { useState, useRef, useEffect } from 'react';
import { ia } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Bot, Send, Sparkles, Loader2 } from 'lucide-react';

// ============================================================================
// CONFIGURAÇÃO DO COPILOTO JURÍDICO
// ============================================================================

// Nome do assistente
const ASSISTENTE_NOME = 'Copiloto Jurídico';

// Subtítulo abaixo do nome
const ASSISTENTE_SUBTITULO = 'Assistente IA do JurisGestão';

// Mensagem de boas-vindas (primeira mensagem do bot)
const MENSAGEM_BOAS_VINDAS = `👋 Olá! Sou o **${ASSISTENTE_NOME}**.

Sou seu assistente virtual especializado em gestão jurídica. Posso ajudar você a:

• 🔍 **Buscar processos** e consultar andamentos
• 📌 **Resumo 360** do processo (movimentações, prazos, tarefas e financeiro)
• 🚨 **Prazos críticos** (atrasados, hoje e próximos dias)
• 👥 **Localizar clientes** e seus dados
• 📅 **Verificar prazos** e tarefas pendentes
• 💰 **Analisar o financeiro** do escritório
• 💬 **Gerar mensagens de WhatsApp** contextuais para cliente ou equipe
• ⚖️ **Tirar dúvidas** sobre seus casos
• 📝 **Sugerir ações** e organizar sua agenda

Como posso ser útil para você hoje?`;

// Texto do footer (quem fornece a IA)
const FOOTER_TEXT = 'Powered by IA • Llama 3.3';

// ============================================================================

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function ChatbotIA() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: MENSAGEM_BOAS_VINDAS,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await ia.chat(input, sessionId);
      
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.resposta,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-1 py-0.5 rounded text-xs">$1</code>')
      .replace(/\n/g, '<br />');
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/30 z-50 transition-all duration-300 ${
          isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        <Bot className="w-6 h-6 text-white" />
      </Button>

      {/* Chat Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border border-white/10 p-0 overflow-hidden [&>button]:hidden">
          {/* Header sem botão de fechar duplicado */}
          <DialogHeader className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <DialogTitle className="text-white text-base">{ASSISTENTE_NOME}</DialogTitle>
                <p className="text-xs text-slate-400">{ASSISTENTE_SUBTITULO}</p>
              </div>
            </div>
          </DialogHeader>

          {/* Messages */}
          <ScrollArea className="h-80 px-4 py-4" ref={scrollRef}>
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'flex-row-reverse' : ''
                  }`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {message.role === 'user' ? (
                      <AvatarFallback className="bg-slate-700 text-slate-300 text-xs">
                        EU
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xs">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Card
                    className={`max-w-[80%] p-3 text-sm ${
                      message.role === 'user'
                        ? 'bg-cyan-500/20 border-cyan-500/30 text-white'
                        : 'bg-slate-800/50 border-white/10 text-slate-200'
                    }`}
                  >
                    <div
                      dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                      className="prose prose-invert prose-sm max-w-none"
                    />
                  </Card>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-blue-600 text-white text-xs">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <Card className="bg-slate-800/50 border-white/10 p-3">
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-white/10 bg-slate-900/50">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite sua mensagem..."
                className="flex-1 bg-slate-800 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-cyan-500"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              {FOOTER_TEXT}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
