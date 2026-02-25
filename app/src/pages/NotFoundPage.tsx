import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NotFoundPage = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="h-10 w-10 text-destructive" />
          </div>
        </div>
        
        <h1 className="text-6xl font-bold mb-4 text-gradient">404</h1>
        <p className="text-xl text-foreground mb-2">Página não encontrada</p>
        <p className="text-sm text-muted-foreground mb-8">
          A página que você está procurando não existe ou foi movida.
        </p>
        
        <Link to="/app">
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Home className="mr-2 h-4 w-4" />
            Voltar para o Dashboard
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
