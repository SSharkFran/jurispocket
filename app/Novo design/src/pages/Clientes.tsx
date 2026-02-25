import { motion } from "framer-motion";
import { Plus, Search, Phone, Mail, MapPin, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const clientes = [
  { id: 1, nome: "Miguel Andrade", email: "miguel@email.com", telefone: "(11) 99876-5432", cpf: "123.456.789-00", cidade: "São Paulo - SP", processos: 3, status: "ativo" },
  { id: 2, nome: "Ana Beatriz Santos", email: "ana.santos@email.com", telefone: "(21) 98765-4321", cpf: "987.654.321-00", cidade: "Rio de Janeiro - RJ", processos: 2, status: "ativo" },
  { id: 3, nome: "Carlos Ferreira", email: "carlos.f@email.com", telefone: "(31) 97654-3210", cpf: "456.789.123-00", cidade: "Belo Horizonte - MG", processos: 1, status: "ativo" },
  { id: 4, nome: "Luciana Mendes", email: "luciana.m@email.com", telefone: "(51) 96543-2109", cpf: "321.654.987-00", cidade: "Porto Alegre - RS", processos: 4, status: "ativo" },
  { id: 5, nome: "Roberto Almeida", email: "roberto.a@email.com", telefone: "(41) 95432-1098", cpf: "654.987.321-00", cidade: "Curitiba - PR", processos: 1, status: "inativo" },
  { id: 6, nome: "Patrícia Oliveira", email: "patricia.o@email.com", telefone: "(71) 94321-0987", cpf: "789.123.456-00", cidade: "Salvador - BA", processos: 2, status: "ativo" },
];

const Clientes = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">{clientes.length} clientes cadastrados</p>
      </div>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" /> Novo Cliente
      </Button>
    </div>

    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Buscar clientes..." className="pl-10 bg-secondary border-border" />
    </div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clientes.map((c, i) => (
        <motion.div key={c.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass-card-hover p-5"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                {c.nome.split(" ").map(n => n[0]).join("").slice(0,2)}
              </div>
              <div>
                <h3 className="font-semibold text-sm">{c.nome}</h3>
                <span className="text-xs text-muted-foreground">{c.cpf}</span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{c.email}</div>
            <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{c.telefone}</div>
            <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" />{c.cidade}</div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">{c.processos} processo(s)</span>
            <span className={c.status === "ativo" ? "badge-ativo" : "badge-pendente"}>{c.status}</span>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

export default Clientes;
