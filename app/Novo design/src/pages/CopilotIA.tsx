import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Send, Sparkles, FileText, Scale, Lightbulb, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

const sugestoes = [
  { icon: Scale, text: "Analise o risco de recurso no processo 001234" },
  { icon: FileText, text: "Gere uma petição inicial para ação trabalhista" },
  { icon: Lightbulb, text: "Qual a jurisprudência sobre dano moral no TJSP?" },
];

const chatMessages = [
  { role: "user", content: "Analise o processo 0001234-56.2024.8.26.0100 e me diga quais são os riscos de perder o recurso." },
  { role: "assistant", content: `## Análise de Risco — Processo 0001234-56.2024.8.26.0100

**Cliente:** Miguel Andrade  
**Tipo:** Reclamação Trabalhista  
**Fase:** Instrução  

### Pontos de Risco Identificados:

1. **Testemunho contraditório** — A testemunha arrolada pelo reclamante apresentou inconsistências no depoimento sobre o horário extraordinário, o que enfraquece a prova oral.

2. **Documentação incompleta** — Não foram juntados os controles de ponto dos meses 03/2023 a 06/2023, período crucial para o cálculo das horas extras.

3. **Jurisprudência desfavorável** — O TRT-2 tem consolidado entendimento restritivo sobre horas extras para cargos de gestão (Súmula 287/TST).

### Probabilidade de Êxito no Recurso:
- **Estimativa:** 45-55% de chance de reforma parcial
- **Recomendação:** Negociar acordo com desconto de 30% sobre o valor pleiteado

### Sugestão de Estratégia:
Priorizar a produção de prova documental complementar antes da audiência de instrução. Solicitar inversão do ônus da prova quanto aos controles de ponto.` },
];

const CopilotIA = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(chatMessages);

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
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

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Bot className="h-16 w-16 text-accent/30 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Como posso ajudar?</h3>
            <p className="text-sm text-muted-foreground mb-8 max-w-md">
              Pergunte sobre processos, peça análises jurídicas ou gere documentos com inteligência artificial.
            </p>
            <div className="grid gap-3 w-full max-w-lg">
              {sugestoes.map(s => (
                <button key={s.text} onClick={() => setInput(s.text)}
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
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[80%] rounded-2xl p-4 ${
                msg.role === "user" 
                  ? "bg-primary/10 border border-primary/20 text-foreground" 
                  : "glass-card"
              }`}>
                {msg.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-3">
                    <Bot className="h-4 w-4 text-accent" />
                    <span className="text-xs font-medium text-accent">Copiloto IA</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground">
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content.split("\n").map((line, li) => {
                    if (line.startsWith("## ")) return <h2 key={li} className="text-base font-bold mb-2 text-foreground">{line.replace("## ", "")}</h2>;
                    if (line.startsWith("### ")) return <h3 key={li} className="text-sm font-semibold mt-3 mb-1 text-foreground">{line.replace("### ", "")}</h3>;
                    if (line.startsWith("**") && line.endsWith("**")) return <p key={li} className="font-semibold">{line.replace(/\*\*/g, "")}</p>;
                    if (line.startsWith("- **")) return <p key={li} className="ml-2 text-muted-foreground">{line.replace(/\*\*/g, "")}</p>;
                    if (line.match(/^\d+\./)) return <p key={li} className="ml-2 text-muted-foreground mt-1">{line}</p>;
                    return <p key={li} className="text-muted-foreground">{line}</p>;
                  })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="glass-card p-3 flex items-center gap-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Pergunte ao Copiloto Jurídico..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onKeyDown={e => {
            if (e.key === "Enter" && input.trim()) {
              setMessages([...messages, { role: "user", content: input }]);
              setInput("");
            }
          }}
        />
        <Button size="icon" className="h-9 w-9 bg-accent text-accent-foreground hover:bg-accent/90 rounded-xl"
          onClick={() => {
            if (input.trim()) {
              setMessages([...messages, { role: "user", content: input }]);
              setInput("");
            }
          }}
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default CopilotIA;
