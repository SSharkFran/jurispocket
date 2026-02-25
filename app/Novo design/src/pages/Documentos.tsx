import { motion } from "framer-motion";
import { FileText, Plus, Search, Download, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const documentos = [
  { id: 1, nome: "Procuração Ad Judicia", tipo: "docx", processo: "0001234-56.2024", cliente: "Miguel Andrade", tamanho: "45 KB", data: "25/02/2026" },
  { id: 2, nome: "Petição Inicial", tipo: "docx", processo: "0005678-90.2024", cliente: "Ana Santos", tamanho: "128 KB", data: "22/02/2026" },
  { id: 3, nome: "Contrato de Honorários", tipo: "pdf", processo: null, cliente: "Carlos Ferreira", tamanho: "89 KB", data: "20/02/2026" },
  { id: 4, nome: "Contestação", tipo: "docx", processo: "0003456-78.2024", cliente: "Luciana Mendes", tamanho: "156 KB", data: "18/02/2026" },
  { id: 5, nome: "Comprovante de pagamento", tipo: "pdf", processo: "0001234-56.2024", cliente: "Miguel Andrade", tamanho: "220 KB", data: "15/02/2026" },
];

const templates = [
  { id: 1, nome: "Procuração Ad Judicia", categoria: "Geral", usos: 45 },
  { id: 2, nome: "Petição Inicial Trabalhista", categoria: "Trabalhista", usos: 32 },
  { id: 3, nome: "Contrato de Honorários", categoria: "Contratos", usos: 28 },
  { id: 4, nome: "Recurso Ordinário", categoria: "Recursos", usos: 15 },
];

const Documentos = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-2xl font-bold">Documentos & Templates</h1>
      <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Plus className="mr-2 h-4 w-4" /> Upload
      </Button>
    </div>

    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input placeholder="Buscar documentos..." className="pl-10 bg-secondary border-border" />
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Documentos Recentes</h3>
        <div className="space-y-2">
          {documentos.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="text-sm font-medium">{d.nome}</div>
                  <div className="text-xs text-muted-foreground">{d.cliente} · {d.tamanho} · {d.data}</div>
                </div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary"><Download className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 text-sm">Templates</h3>
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} className="p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer">
              <div className="text-sm font-medium">{t.nome}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">{t.categoria}</span>
                <span className="text-xs text-muted-foreground">{t.usos} usos</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
);

export default Documentos;
