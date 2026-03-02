import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Sparkles, FileText, Scale, Lightbulb, Copy, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ia } from '@/services/api';
import { toast } from 'sonner';

const sugestoes = [
  { icon: Scale, text: 'Liste os prazos críticos dos próximos 7 dias e os atrasados.' },
  { icon: FileText, text: 'Faça um resumo 360 do processo 1009019-92.2025.4.01.3000.' },
  { icon: Lightbulb, text: 'Gere uma mensagem de WhatsApp para atualizar o cliente do processo 1009019-92.2025.4.01.3000.' },
  { icon: Lightbulb, text: 'Crie uma tarefa para pedir documentos do processo BPC LOAS e atribua para Francisco.' },
];

type MessageRole = 'user' | 'assistant';

interface PendingAction {
  id: number;
  action_type?: string;
  preview?: string;
  status?: string;
}

interface IAChatResponse {
  resposta?: string;
  session_id?: string;
  acao_pendente?: PendingAction;
  status?: string;
}

interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp?: Date;
  pendingAction?: PendingAction;
}

const createMessageId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const CopilotIAPage = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const appendAssistantMessage = (data: IAChatResponse) => {
    const assistantMessage: Message = {
      id: createMessageId(),
      role: 'assistant',
      content: data?.resposta || 'Não consegui gerar uma resposta agora.',
      timestamp: new Date(),
      pendingAction: data?.acao_pendente
        ? {
            ...data.acao_pendente,
            status: String(data.acao_pendente.status || 'pending').toLowerCase(),
          }
        : undefined,
    };
    setMessages((prev) => [...prev, assistantMessage]);
  };

  const atualizarStatusAcao = (actionId: number, status: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (!msg.pendingAction || msg.pendingAction.id !== actionId) return msg;
        return {
          ...msg,
          pendingAction: {
            ...msg.pendingAction,
            status,
          },
        };
      })
    );
  };

  const handleSend = async () => {
    const inputLimpo = input.trim();
    if (!inputLimpo || isLoading) return;

    const userMessage: Message = {
      id: createMessageId(),
      role: 'user',
      content: inputLimpo,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await ia.chat(inputLimpo, sessionId);
      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }
      appendAssistantMessage(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Erro ao comunicar com a IA');
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePendingAction = async (actionId: number, decision: 'confirmar' | 'cancelar') => {
    if (isLoading) return;

    const userConfirmationText =
      decision === 'confirmar' ? 'Confirmar ação sugerida.' : 'Recusar ação sugerida.';
    setMessages((prev) => [
      ...prev,
      {
        id: createMessageId(),
        role: 'user',
        content: userConfirmationText,
        timestamp: new Date(),
      },
    ]);

    atualizarStatusAcao(actionId, 'processing');
    setIsLoading(true);

    try {
      const response =
        decision === 'confirmar'
          ? await ia.confirmarAcao(actionId, sessionId)
          : await ia.cancelarAcao(actionId, sessionId);

      if (response.data.session_id) {
        setSessionId(response.data.session_id);
      }

      const statusResposta = String(response.data?.status || '').toLowerCase();
      if (statusResposta === 'success') {
        atualizarStatusAcao(actionId, decision === 'confirmar' ? 'executed' : 'canceled');
      } else {
        atualizarStatusAcao(actionId, 'pending');
      }

      appendAssistantMessage(response.data);
    } catch (error: any) {
      atualizarStatusAcao(actionId, 'pending');
      toast.error(error.response?.data?.message || 'Erro ao processar confirmação da ação');
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: '❌ Não foi possível processar sua confirmação agora. Tente novamente.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success('Texto copiado!');
  };

  const formatMessageContent = (content: string) =>
    content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-secondary px-1 py-0.5 rounded text-xs">$1</code>');

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] min-h-[460px]">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4 mb-6"
      >
        <div className="h-12 w-12 rounded-2xl bg-accent/10 flex items-center justify-center glow-accent">
          <Bot className="h-6 w-6 text-accent" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Copiloto Jurídico
            <Sparkles className="h-5 w-5 text-accent" />
          </h1>
          <p className="text-sm text-muted-foreground">IA especializada em direito brasileiro</p>
        </div>
      </motion.div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-accent/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Como posso ajudar?</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Pergunte sobre processos, peça análises jurídicas ou solicite ações reais com confirmação pelos botões.
            </p>
            <div className="grid gap-3 w-full max-w-lg">
              {sugestoes.map((s) => (
                <button
                  key={s.text}
                  onClick={() => setInput(s.text)}
                  className="glass-card-hover p-4 text-left flex items-center gap-3 text-sm"
                >
                  <s.icon className="h-5 w-5 text-accent shrink-0" />
                  <span className="text-muted-foreground">{s.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence>
          {messages.map((msg, i) => {
            const pendingStatus = String(msg.pendingAction?.status || 'pending').toLowerCase();
            const showPendingButtons =
              msg.role === 'assistant' && !!msg.pendingAction && (pendingStatus === 'pending' || pendingStatus === 'processing');

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl p-4 ${
                    msg.role === 'user'
                      ? 'bg-primary/10 border border-primary/20 text-foreground'
                      : 'glass-card'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-3">
                      <Bot className="h-4 w-4 text-accent" />
                      <span className="text-xs font-medium text-accent">Copiloto IA</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
                        onClick={() => handleCopy(msg.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                  <div
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                  />

                  {showPendingButtons && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white"
                        disabled={isLoading || pendingStatus === 'processing'}
                        onClick={() => handlePendingAction(msg.pendingAction!.id, 'confirmar')}
                      >
                        {pendingStatus === 'processing' ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Check className="h-3.5 w-3.5 mr-1" />
                        )}
                        Confirmar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-3 border-red-500/40 text-red-300 hover:bg-red-500/10"
                        disabled={isLoading || pendingStatus === 'processing'}
                        onClick={() => handlePendingAction(msg.pendingAction!.id, 'cancelar')}
                      >
                        <X className="h-3.5 w-3.5 mr-1" />
                        Recusar
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {isLoading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
            <div className="glass-card max-w-[80%] rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium text-accent">Copiloto IA</span>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="glass-card p-3 flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pergunte ao Copiloto Jurídico..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && input.trim() && !isLoading) {
              handleSend();
            }
          }}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl"
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

export default CopilotIAPage;
