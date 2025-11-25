'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ClienteSearchSelect from '@/components/ClienteSearchSelect';

// Componente separato che usa useSearchParams
function NuovoTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clienteIdFromUrl = searchParams.get('cliente');
  
  const [loading, setLoading] = useState(false);
  const [macchinari, setMacchinari] = useState([]);
  const [formData, setFormData] = useState({
    id_cliente: clienteIdFromUrl || '',
    id_macchinario: '',
    oggetto: '',
    descrizione: '',
    priorita: 'media',
    categoria: 'guasto_macchina',
    canale_origine: 'admin_manuale'
  });

  // Carica macchinari quando viene selezionato un cliente
  useEffect(() => {
    const fetchMacchinari = async () => {
      if (!formData.id_cliente) {
        setMacchinari([]);
        return;
      }

      const { data } = await supabase
        .from('macchinari')
        .select('id, tipo_macchinario, marca, modello, numero_seriale')
        .eq('id_cliente', formData.id_cliente)
        .eq('stato', 'attivo')
        .order('tipo_macchinario');
      
      if (data) setMacchinari(data);
    };
    
    fetchMacchinari();
  }, [formData.id_cliente]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.id_cliente) {
      alert('Seleziona un cliente');
      return;
    }
    
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('ticket')
        .insert([{
          ...formData,
          id_macchinario: formData.id_macchinario || null
        }])
        .select()
        .single();

      if (error) throw error;

      alert('Ticket creato con successo!');
      router.push(`/ticket/${data.id}`);
    } catch (error) {
      console.error('Errore:', error);
      alert('Errore nella creazione del ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleClienteChange = (clienteId) => {
    setFormData(prev => ({
      ...prev,
      id_cliente: clienteId,
      id_macchinario: '' // Reset macchinario quando cambia cliente
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Nuovo Ticket</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Indietro
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 space-y-6">
          {/* Cliente - Nuovo componente di ricerca */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Cliente *
            </label>
            <ClienteSearchSelect
              value={formData.id_cliente}
              onChange={handleClienteChange}
              placeholder="Cerca cliente per nome, codice o città..."
            />
          </div>

          {/* Macchinario */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Macchinario (opzionale)
            </label>
            <select
              name="id_macchinario"
              value={formData.id_macchinario}
              onChange={handleChange}
              disabled={!formData.id_cliente}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Nessun macchinario specifico</option>
              {macchinari.map(mac => (
                <option key={mac.id} value={mac.id}>
                  {mac.tipo_macchinario} - {mac.marca} {mac.modello} ({mac.numero_seriale})
                </option>
              ))}
            </select>
            {!formData.id_cliente && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Seleziona prima un cliente per vedere i macchinari
              </p>
            )}
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Categoria *
            </label>
            <select
              name="categoria"
              value={formData.categoria}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="guasto_macchina">🔧 Guasto Macchina</option>
              <option value="manutenzione_software">💻 Manutenzione Software</option>
              <option value="consulenza">💬 Consulenza</option>
              <option value="installazione">📦 Installazione</option>
              <option value="altro">📋 Altro</option>
            </select>
          </div>

          {/* Priorità */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priorità *
            </label>
            <select
              name="priorita"
              value={formData.priorita}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="bassa">🟢 Bassa</option>
              <option value="media">🟡 Media</option>
              <option value="alta">🟠 Alta</option>
              <option value="critica">🔴 Critica</option>
            </select>
          </div>

          {/* Canale Origine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Canale Origine
            </label>
            <select
              name="canale_origine"
              value={formData.canale_origine}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="admin_manuale">🖥️ Inserimento Manuale</option>
              <option value="telefono">📞 Telefono</option>
              <option value="whatsapp">💬 WhatsApp</option>
              <option value="form_web">🌐 Form Web</option>
            </select>
          </div>

          {/* Oggetto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Oggetto *
            </label>
            <input
              type="text"
              name="oggetto"
              value={formData.oggetto}
              onChange={handleChange}
              required
              placeholder="Breve descrizione del problema"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Descrizione *
            </label>
            <textarea
              name="descrizione"
              value={formData.descrizione}
              onChange={handleChange}
              required
              rows={6}
              placeholder="Descrizione dettagliata del problema..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || !formData.id_cliente}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? 'Creazione...' : 'Crea Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Componente principale con Suspense
export default function NuovoTicketPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <NuovoTicketForm />
    </Suspense>
  );
}
