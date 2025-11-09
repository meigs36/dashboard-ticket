'use client';
import { useState, useRef } from 'react';
import { 
  uploadCustomerDocument, 
  uploadMultipleDocuments,
  loadCustomerDocuments,
  deleteCustomerDocument,
  validateDocumentFile,
  formatFileSize,
  getDocumentIcon,
  getDocumentStatusBadge
} from '@/lib/customerDocumentUpload';

/**
 * Componente per upload documenti onboarding
 * @param {string} clienteId - ID del cliente
 * @param {Function} onDocumentsChanged - Callback quando documenti cambiano
 * @param {boolean} allowMultiple - Permetti upload multiplo
 */
export default function DocumentUploadWizard({ 
  clienteId, 
  onDocumentsChanged = () => {},
  allowMultiple = false 
}) {
  const [categoria, setCategoria] = useState('contratto');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [documents, setDocuments] = useState([]);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Categorie disponibili
  const CATEGORIES = [
    { value: 'contratto', label: 'Contratti', icon: '📄', required: true },
    { value: 'identita', label: 'Documenti Identità', icon: '🪪', required: true },
    { value: 'certificato', label: 'Certificati Aziendali', icon: '📜', required: false },
    { value: 'altro', label: 'Altri Documenti', icon: '📎', required: false }
  ];

  // Carica documenti esistenti
  const loadDocs = async () => {
    try {
      const docs = await loadCustomerDocuments(clienteId);
      setDocuments(docs);
      onDocumentsChanged(docs);
    } catch (err) {
      console.error('Errore caricamento documenti:', err);
      setError('Errore nel caricamento dei documenti');
    }
  };

  // Handle file selection
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    if (allowMultiple) {
      handleMultipleUpload(files);
    } else {
      handleSingleUpload(files[0]);
    }
  };

  // Upload singolo
  const handleSingleUpload = async (file) => {
    // Valida file
    const validation = validateDocumentFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadCustomerDocument(
        file,
        clienteId,
        categoria,
        null,
        { obbligatorio: CATEGORIES.find(c => c.value === categoria)?.required }
      );

      console.log('Documento caricato:', result);
      
      // Ricarica lista
      await loadDocs();
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Errore upload:', err);
      setError('Errore durante il caricamento del documento');
    } finally {
      setIsUploading(false);
    }
  };

  // Upload multiplo
  const handleMultipleUpload = async (files) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const results = await uploadMultipleDocuments(
        files,
        clienteId,
        categoria,
        (current, total) => {
          setUploadProgress(Math.round((current / total) * 100));
        }
      );

      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;

      if (failed > 0) {
        setError(`${successful} caricati con successo, ${failed} falliti`);
      }

      // Ricarica lista
      await loadDocs();
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error('Errore upload multiplo:', err);
      setError('Errore durante il caricamento dei documenti');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Elimina documento
  const handleDelete = async (documentId) => {
    if (!confirm('Sei sicuro di voler eliminare questo documento?')) {
      return;
    }

    try {
      await deleteCustomerDocument(documentId);
      await loadDocs();
    } catch (err) {
      console.error('Errore eliminazione:', err);
      setError('Errore durante l\'eliminazione');
    }
  };

  // Trigger file input
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Carica documenti al mount
  useState(() => {
    if (clienteId) {
      loadDocs();
    }
  }, [clienteId]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Carica Documenti
        </h3>
        <p className="text-sm text-gray-600">
          Carica i documenti necessari per completare l'onboarding
        </p>
      </div>

      {/* Selezione categoria */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo Documento
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategoria(cat.value)}
              className={`
                relative p-4 rounded-lg border-2 transition-all
                ${categoria === cat.value 
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : 'border-gray-200 hover:border-blue-300 bg-white'
                }
              `}
            >
              <div className="text-center">
                <div className="text-3xl mb-2">{cat.icon}</div>
                <div className="text-sm font-medium text-gray-900">
                  {cat.label}
                </div>
                {cat.required && (
                  <div className="text-xs text-red-600 mt-1">
                    Obbligatorio
                  </div>
                )}
              </div>
              {categoria === cat.value && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Area upload */}
      <div>
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          className={`
            w-full py-8 px-4 border-2 border-dashed rounded-xl
            transition-all duration-200
            ${isUploading 
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
              : 'border-blue-300 hover:border-blue-500 bg-blue-50/30 hover:bg-blue-50 cursor-pointer'
            }
          `}
        >
          <div className="flex flex-col items-center gap-3">
            {isUploading ? (
              <>
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm font-medium text-gray-700">
                  Caricamento in corso...
                </p>
                {uploadProgress > 0 && (
                  <div className="w-full max-w-xs">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 mt-1 text-center">
                      {uploadProgress}%
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">
                    Clicca per selezionare {allowMultiple ? 'i file' : 'il file'}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    PDF, JPG, PNG, WEBP, DOC, DOCX (max 10 MB)
                  </p>
                </div>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Errori */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-900">Errore</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Lista documenti caricati */}
      {documents.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Documenti Caricati ({documents.length})
          </h4>
          <div className="space-y-3">
            {documents.map((doc) => {
              const statusBadge = getDocumentStatusBadge(doc.stato);
              return (
                <div 
                  key={doc.id}
                  className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  {/* Icona */}
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                      {getDocumentIcon(doc.mime_type)}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {doc.nome_originale}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusBadge.color}`}>
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-600">
                      <span className="capitalize">{doc.categoria}</span>
                      <span>•</span>
                      <span>{formatFileSize(doc.dimensione_bytes)}</span>
                      <span>•</span>
                      <span>{new Date(doc.caricato_il).toLocaleDateString('it-IT')}</span>
                    </div>
                  </div>

                  {/* Azioni */}
                  <div className="flex items-center gap-2">
                    {doc.signedUrl && (
                      <a
                        href={doc.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Visualizza"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    )}
                    
                    {doc.stato === 'pending' && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Elimina"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info helper */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Documenti obbligatori per completare l'onboarding:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              {CATEGORIES.filter(c => c.required).map(c => (
                <li key={c.value}>{c.label}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
