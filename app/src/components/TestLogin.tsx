import { useState } from 'react';
import { auth } from '@/services/api';

export function TestLogin() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult('Testando...');
    
    try {
      console.log('Testando login direto...');
      const response = await auth.login('teste123@teste.com', '123456');
      console.log('Sucesso:', response.data);
      setResult(`✅ Sucesso! Token: ${response.data.token.substring(0, 30)}...`);
    } catch (error: any) {
      console.error('Erro:', error);
      setResult(`❌ Erro: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-slate-800 rounded-lg m-4">
      <h2 className="text-white text-lg mb-2">Teste de Login Direto</h2>
      <button
        onClick={testLogin}
        disabled={loading}
        className="px-4 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 disabled:opacity-50"
      >
        {loading ? 'Testando...' : 'Testar Login'}
      </button>
      {result && (
        <pre className="mt-2 p-2 bg-slate-900 text-white text-sm overflow-auto max-h-40">
          {result}
        </pre>
      )}
    </div>
  );
}
