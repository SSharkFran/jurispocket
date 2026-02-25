import { motion } from "framer-motion";
import { Plus, Search, Eye, Globe, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const processos = [
  { id: 1, numero: "0001234-56.2024.8.26.0100", titulo: "Reclamação Trabalhista", cliente: "Miguel Andrade", tipo: "Trabalhista", status: "ativo", vara: "2ª Vara do Trabalho", comarca: "São Paulo", valor: "R$ 85.000,00", fase: "Instrução", ultimoMov: "Decisão proferida" },
  { id: 2, numero: "0005678-90.2024.8.13.0001", titulo: "Ação de Indenização", cliente: "Ana Beatriz Santos", tipo: "Cível", status: "ativo", vara: "5ª Vara Cível", comarca: "Rio de Janeiro", valor: "R$ 150.000,00", fase: "Citação", ultimoMov: "Citação realizada" },
  { id: 3, numero: "0009012-34.2024.5.01.0042", titulo: "Rescisão Indireta", cliente: "Carlos Ferreira", tipo: "Trabalhista", status: "ativo", vara: "42ª Vara do Trabalho", comarca: "Belo Horizonte", valor: "R$ 62.000,00", fase: "Audiência", ultimoMov: "Audiência designada" },
  { id: 4, numero: "0003456-78.2024.8.19.0001", titulo: "Divórcio Litigioso", cliente: "Luciana Mendes", tipo: "Família", status: "pendente", vara: "1ª Vara de Família", comarca: "Porto Alegre", valor: "R$ 200.000,00", fase: "Contestação", ultimoMov: "Contestação apresentada" },
  { id: 5, numero: "0007890-12.2024.8.16.0001", titulo: "Cobrança de Honorários", cliente: "Roberto Almeida", tipo: "Cível", status: "encerrado", vara: "3ª Vara Cível", comarca: "Curitiba", valor: "R$ 45.000,00", fase: "Sentença", ultimoMov: "Trânsito em julgado" },
];

const statusColors: Record<string, string> = {
  ativo: "badge-ativo",
  pendente: "badge-pendente",
  encerrado: "badge-concluido",
};

const Processos = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold">Processos</h1>
        <p className="text-sm text-muted-foreground">{processos.length} processos cadastrados</p>
      </div>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" /> Novo Processo
      </Button>
    </div>

    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Buscar por número ou cliente..." className="pl-10 bg-secondary border-border" />
    </div>

    <div className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 text-left">
              <th className="p-4 text-xs font-medium text-muted-foreground">Processo</th>
              <th className="p-4 text-xs font-medium text-muted-foreground">Cliente</th>
              <th className="p-4 text-xs font-medium text-muted-foreground hidden md:table-cell">Tipo</th>
              <th className="p-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Vara</th>
              <th className="p-4 text-xs font-medium text-muted-foreground hidden lg:table-cell">Valor</th>
              <th className="p-4 text-xs font-medium text-muted-foreground">Status</th>
              <th className="p-4 text-xs font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {processos.map((p, i) => (
              <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
              >
                <td className="p-4">
                  <div className="font-medium">{p.titulo}</div>
                  <div className="text-xs text-muted-foreground">{p.numero}</div>
                </td>
                <td className="p-4 text-muted-foreground">{p.cliente}</td>
                <td className="p-4 hidden md:table-cell"><span className="feature-badge">{p.tipo}</span></td>
                <td className="p-4 text-muted-foreground hidden lg:table-cell text-xs">{p.vara}</td>
                <td className="p-4 hidden lg:table-cell font-medium">{p.valor}</td>
                <td className="p-4"><span className={statusColors[p.status]}>{p.status}</span></td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Globe className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><MoreHorizontal className="h-4 w-4" /></Button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

export default Processos;
