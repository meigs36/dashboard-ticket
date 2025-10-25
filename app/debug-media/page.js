// app/debug-media/page.js - PAGINA DEBUG MEDIA
'use client'

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export default function DebugMediaPage() {
  const { user } = useAuth();
  const [allegati, setAllegati] = useState([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${type.toUpperCase()}] ${message}`);
  }

  async function testStorageAccess() {
    setLoading(true);
    addLog('🔍 Inizio test accesso Storage...', 'info');

    try {
      // 1. Test query database
      addLog('1️⃣ Test query database interventi_allegati...', 'info');
      const { data: dbAllegati, error: dbError } = await supabase
        .from('interventi_allegati')
        .select('*')
        .order('caricato_il', { ascending: false })
        .limit(5);

      if (dbError) {
        addLog(`❌ Errore database: ${dbError.message}`, 'error');
      } else {
        addLog(`✅ Trovati ${dbAllegati.length} allegati nel database`, 'success');
        setAllegati(dbAllegati);
      }

      // 2. Test accesso Storage bucket
      addLog('2️⃣ Test accesso bucket Storage...', 'info');
      const { data: files, error: storageError } = await supabase
        .storage
        .from('interventi-media')
        .list('', { limit: 5 });

      if (storageError) {
        addLog(`❌ Errore Storage: ${storageError.message}`, 'error');
      } else {
        addLog(`✅ Trovati ${files?.length || 0} file nello Storage`, 'success');
      }

      // 3. Test URL pubblico
      if (dbAllegati && dbAllegati.length > 0) {
        const firstFile = dbAllegati[0];
        addLog('3️⃣ Test URL pubblico primo file...', 'info');
        
        const { data: publicURL } = supabase
          .storage
          .from('interventi-media')
          .getPublicUrl(firstFile.storage_path);

        addLog(`📎 URL generato: ${publicURL.publicUrl}`, 'info');

        // Test fetch URL
        try {
          const response = await fetch(publicURL.publicUrl, { method: 'HEAD' });
          if (response.ok) {
            addLog(`✅ URL accessibile (${response.status})`, 'success');
          } else {
            addLog(`❌ URL non accessibile (${response.status})`, 'error');
          }
        } catch (fetchError) {
          addLog(`❌ Errore fetch URL: ${fetchError.message}`, 'error');
        }
      }

      // 4. Test bucket info
      addLog('4️⃣ Test configurazione bucket...', 'info');
      const { data: buckets } = await supabase.storage.listBuckets();
      const mediaBucket = buckets?.find(b => b.id === 'interventi-media');
      
      if (mediaBucket) {
        addLog(`✅ Bucket trovato:`, 'success');
        addLog(`   - ID: ${mediaBucket.id}`, 'info');
        addLog(`   - Pubblico: ${mediaBucket.public}`, 'info');
        addLog(`   - File size limit: ${mediaBucket.file_size_limit || 'illimitato'}`, 'info');
      } else {
        addLog(`❌ Bucket 'interventi-media' non trovato!`, 'error');
      }

    } catch (error) {
      addLog(`❌ Errore generale: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function testAudioPlay(url) {
    addLog(`🎵 Test playback audio: ${url}`, 'info');
    
    const audio = new Audio(url);
    
    audio.onloadedmetadata = () => {
      addLog(`✅ Audio metadata caricati - Durata: ${audio.duration}s`, 'success');
    };
    
    audio.onerror = (e) => {
      addLog(`❌ Errore playback: ${e.type}`, 'error');
    };
    
    try {
      await audio.play();
      addLog(`✅ Audio playing!`, 'success');
      setTimeout(() => audio.pause(), 2000); // Stop dopo 2s
    } catch (error) {
      addLog(`❌ Errore play: ${error.message}`, 'error');
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">⚠️ Login Richiesto</h1>
          <a href="/login" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
            Vai al Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            🔧 Debug Media System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Diagnostica problemi audio/foto
          </p>
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <button
            onClick={testStorageAccess}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg font-medium"
          >
            {loading ? '🔄 Test in corso...' : '▶️ Avvia Test Diagnostico'}
          </button>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-gray-800 rounded-lg shadow p-4 mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-white font-semibold">📋 Log Test</h2>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-gray-400 hover:text-white"
              >
                Pulisci
              </button>
            </div>
            <div className="space-y-1 font-mono text-xs max-h-96 overflow-y-auto">
              {logs.map((log, i) => (
                <div 
                  key={i}
                  className={`${
                    log.type === 'error' ? 'text-red-400' :
                    log.type === 'success' ? 'text-green-400' :
                    'text-gray-300'
                  }`}
                >
                  [{log.timestamp}] {log.message}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allegati trovati */}
        {allegati.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              📎 Allegati Trovati ({allegati.length})
            </h2>
            <div className="space-y-3">
              {allegati.map((allegato) => (
                <div 
                  key={allegato.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {allegato.nome_file}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Tipo: {allegato.tipo} • {Math.round(allegato.dimensione_bytes / 1024)} KB
                      </p>
                      <p className="text-xs text-gray-400 mt-1 font-mono break-all">
                        Path: {allegato.storage_path}
                      </p>
                    </div>
                    {allegato.tipo === 'audio' && (
                      <button
                        onClick={() => testAudioPlay(allegato.url)}
                        className="ml-4 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                      >
                        🎵 Test Play
                      </button>
                    )}
                  </div>

                  {/* URL */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded p-2 mb-2">
                    <p className="text-xs text-gray-500 mb-1">URL:</p>
                    <a 
                      href={allegato.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline break-all"
                    >
                      {allegato.url}
                    </a>
                  </div>

                  {/* Player/Preview */}
                  {allegato.tipo === 'audio' && (
                    <audio 
                      controls 
                      className="w-full"
                      src={allegato.url}
                      onError={(e) => addLog(`❌ Errore player: ${allegato.nome_file}`, 'error')}
                      onLoadedMetadata={() => addLog(`✅ Player OK: ${allegato.nome_file}`, 'success')}
                    />
                  )}

                  {allegato.tipo === 'foto' && (
                    <img 
                      src={allegato.url}
                      alt={allegato.nome_file}
                      className="w-full h-48 object-cover rounded mt-2"
                      onError={(e) => addLog(`❌ Errore foto: ${allegato.nome_file}`, 'error')}
                      onLoad={() => addLog(`✅ Foto OK: ${allegato.nome_file}`, 'success')}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
            💡 Come Interpretare i Risultati
          </h3>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>✅ Verde = Tutto OK</li>
            <li>❌ Rosso = Problema trovato</li>
            <li>Se "URL non accessibile" → Problema policy Storage</li>
            <li>Se "Errore playback" → Problema formato file o CORS</li>
            <li>Se "Bucket non pubblico" → Esegui fix-audio-playback.sql</li>
          </ul>
        </div>

      </div>
    </div>
  );
}
