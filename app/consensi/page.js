'use client'

import { useState, useCallback } from 'react'
import { Search, Building2, Shield, CheckCircle2, AlertTriangle, FileText, Loader2, Download, ChevronDown, ChevronUp, User, Wifi, Eye, Clock, XCircle, Scale } from 'lucide-react'
import SignaturePad from '@/components/SignaturePad'

// =====================================================
// TESTI LEGALI DEI CONSENSI
// =====================================================
const TESTO_CONSENSO = {
  titolo: "AUTORIZZAZIONE ALL'ACCESSO REMOTO PER ASSISTENZA TECNICA",
  premesse: `Il presente documento è redatto ai sensi del Regolamento (UE) 2016/679 (GDPR), in particolare degli articoli 28 e 32, del D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018, e del Provvedimento del Garante per la Protezione dei Dati Personali del 27 novembre 2008 relativo agli Amministratori di Sistema.`,

  articoli: [
    {
      num: 1,
      titolo: "Oggetto",
      testo: "Con la presente, il Titolare dello studio autorizza Odonto Service S.r.l. (di seguito \"Fornitore\") ad accedere in modalità remota ai sistemi informatici dello studio per finalità di installazione, configurazione, manutenzione e assistenza tecnica del software e delle apparecchiature fornite."
    },
    {
      num: 2,
      titolo: "Strumenti di accesso remoto",
      testo: "L'accesso remoto avverrà esclusivamente mediante strumenti professionali quali TeamViewer, AnyDesk o equivalenti, che garantiscono connessione cifrata end-to-end (AES-256). Il Fornitore si impegna a utilizzare esclusivamente strumenti conformi agli standard di sicurezza riconosciuti a livello internazionale."
    },
    {
      num: 3,
      titolo: "Modalità di accesso",
      testo: "L'accesso remoto avverrà esclusivamente: (a) su richiesta esplicita del Titolare o previo appuntamento concordato; (b) con un operatore dello studio presente o informato della sessione in corso; (c) limitatamente alle operazioni strettamente necessarie all'intervento tecnico. Al termine di ogni sessione, la connessione remota verrà immediatamente terminata."
    },
    {
      num: 4,
      titolo: "Dati sanitari e obbligo di riservatezza",
      testo: "Il Titolare prende atto che i sistemi oggetto di accesso remoto possono contenere dati personali e dati particolari (sanitari) ai sensi dell'art. 9 GDPR relativi ai pazienti dello studio. Il Fornitore si impegna a: (a) non accedere, copiare, estrarre o trattare in alcun modo tali dati; (b) segnalare immediatamente al Titolare qualsiasi accesso incidentale a dati sanitari; (c) mantenere la massima riservatezza su qualsiasi informazione di cui venga a conoscenza durante le sessioni di assistenza, anche dopo la cessazione del rapporto contrattuale."
    },
    {
      num: 5,
      titolo: "Registrazione degli accessi",
      testo: "In conformità al Provvedimento del Garante del 27 novembre 2008 (Amministratori di Sistema), il Fornitore si impegna a mantenere un registro degli accessi remoti effettuati, contenente: data, ora di inizio e fine, identità del tecnico, attività svolte. Tali registrazioni saranno conservate per un periodo minimo di 6 (sei) mesi e rese disponibili al Titolare su richiesta."
    },
    {
      num: 6,
      titolo: "Durata e validità",
      testo: "La presente autorizzazione ha validità a tempo indeterminato dalla data di sottoscrizione e resta efficace fino a revoca scritta da parte del Titolare."
    },
    {
      num: 7,
      titolo: "Diritto di revoca",
      testo: "Il Titolare ha diritto di revocare la presente autorizzazione in qualsiasi momento, mediante comunicazione scritta (anche via email o PEC) a Odonto Service S.r.l. La revoca avrà effetto dal momento della ricezione della comunicazione."
    }
  ]
}

// =====================================================
// PAGINA PRINCIPALE
// =====================================================
export default function ConsensiPage() {
  // Stati
  const [step, setStep] = useState('search') // search | form | success
  const [codiceCliente, setCodiceCliente] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Dati dal server
  const [cliente, setCliente] = useState(null)
  const [tecnici, setTecnici] = useState([])
  const [consensoEsistente, setConsensoEsistente] = useState(null)

  // Form
  const [tecnicoId, setTecnicoId] = useState('')
  const [firmatoDaNome, setFirmatoDaNome] = useState('')
  const [firmatoDaRuolo, setFirmatoDaRuolo] = useState('')
  const [note, setNote] = useState('')
  const [showArticoli, setShowArticoli] = useState(false)

  // Consensi checkbox
  const [consensi, setConsensi] = useState({
    accesso_remoto: false,
    dati_sanitari: false,
    modalita_accesso: false,
    autorizzazione_titolare: false
  })

  // Firma
  const [firmaDataUrl, setFirmaDataUrl] = useState(null)

  // Submitting
  const [submitting, setSubmitting] = useState(false)
  const [successData, setSuccessData] = useState(null)

  // ===== Verifica codice cliente =====
  const verificaCliente = async () => {
    if (!codiceCliente.trim()) {
      setError('Inserisci il codice cliente')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/consensi/verifica-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codice_cliente: codiceCliente.trim() })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Errore nella verifica')
        return
      }
      setCliente(data.cliente)
      setTecnici(data.tecnici || [])
      setConsensoEsistente(data.consenso_esistente)
      setStep('form')
    } catch (err) {
      setError('Errore di connessione al server')
    } finally {
      setLoading(false)
    }
  }

  // ===== Genera hash SHA-256 =====
  const generateHash = async (text) => {
    const encoder = new TextEncoder()
    const data = encoder.encode(text)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  // ===== Submit consenso =====
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validazioni
    if (!tecnicoId) { setError('Seleziona il tecnico presente'); return }
    if (!firmatoDaNome.trim()) { setError('Inserisci nome e cognome del firmatario'); return }
    if (!consensi.accesso_remoto || !consensi.dati_sanitari ||
        !consensi.modalita_accesso || !consensi.autorizzazione_titolare) {
      setError('Tutti i consensi devono essere accettati')
      return
    }
    if (!firmaDataUrl) { setError('La firma grafica è obbligatoria'); return }

    setSubmitting(true)
    setError('')

    try {
      // Genera hash del documento
      const docContent = JSON.stringify({
        cliente_id: cliente.id,
        ragione_sociale: cliente.ragione_sociale,
        partita_iva: cliente.partita_iva,
        tecnico_id: tecnicoId,
        firmato_da: firmatoDaNome.trim(),
        consensi: consensi,
        timestamp: new Date().toISOString(),
        testo_consenso: TESTO_CONSENSO
      })
      const hash = await generateHash(docContent)

      // Certificato
      const certificato = {
        tipo: 'Firma Elettronica Semplice (FES)',
        normativa: 'Art. 21 D.Lgs. 82/2005 (CAD) - Reg. UE 910/2014 (eIDAS)',
        timestamp: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        user_agent: navigator.userAgent,
        screen_resolution: `${screen.width}x${screen.height}`,
        platform: navigator.platform,
        language: navigator.language,
        documento_hash_algorithm: 'SHA-256',
        documento_hash: hash
      }

      const res = await fetch('/api/consensi/salva', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: cliente.id,
          tecnico_id: tecnicoId,
          consenso_accesso_remoto: consensi.accesso_remoto,
          consenso_dati_sanitari: consensi.dati_sanitari,
          consenso_modalita_accesso: consensi.modalita_accesso,
          consenso_autorizzazione_titolare: consensi.autorizzazione_titolare,
          firma_grafica_base64: firmaDataUrl,
          documento_hash: hash,
          certificato_json: certificato,
          firmato_da_nome: firmatoDaNome.trim(),
          firmato_da_ruolo: firmatoDaRuolo.trim() || null,
          note: note.trim() || null
        })
      })

      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Errore nel salvataggio')
        return
      }

      setSuccessData(result)
      setStep('success')
    } catch (err) {
      setError('Errore di connessione al server')
    } finally {
      setSubmitting(false)
    }
  }

  // ===== Toggle consenso =====
  const toggleConsenso = (key) => {
    setConsensi(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const tuttiAccettati = Object.values(consensi).every(v => v)

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="min-h-screen py-8 px-4">
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
            🦷
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Odonto Service</h1>
            <p className="text-sm text-gray-500">Autorizzazione Accesso Remoto</p>
          </div>
        </div>
      </div>

      {/* ===== STEP 1: Ricerca cliente ===== */}
      {step === 'search' && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-blue-600" size={28} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Inserisci Codice Cliente</h2>
              <p className="text-sm text-gray-500 mt-1">
                Il tecnico inserisce il codice per caricare i dati dello studio
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={codiceCliente}
                  onChange={e => { setCodiceCliente(e.target.value.toUpperCase()); setError('') }}
                  onKeyDown={e => e.key === 'Enter' && verificaCliente()}
                  placeholder="Es. C7998"
                  className="w-full px-4 py-3 text-lg text-center font-mono border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                  autoFocus
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-lg p-3 text-sm">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}

              <button
                onClick={verificaCliente}
                disabled={loading || !codiceCliente.trim()}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 size={18} className="animate-spin" /> Verifica in corso...</>
                ) : (
                  <><Search size={18} /> Cerca Cliente</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== STEP 2: Form consensi ===== */}
      {step === 'form' && cliente && (
        <div className="max-w-3xl mx-auto">
          <form onSubmit={handleSubmit}>

            {/* Consenso esistente warning */}
            {consensoEsistente && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={20} />
                <div>
                  <p className="font-semibold text-amber-800">Consenso già presente</p>
                  <p className="text-sm text-amber-700">
                    Esiste già un consenso firmato da <strong>{consensoEsistente.firmato_da_nome}</strong> il{' '}
                    {new Date(consensoEsistente.created_at).toLocaleDateString('it-IT')}.
                    Procedendo, verrà registrato un nuovo consenso senza annullare il precedente.
                  </p>
                </div>
              </div>
            )}

            {/* Dati cliente */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="text-blue-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Dati dello Studio</h3>
                  <p className="text-xs text-gray-500">Codice: {cliente.codice_cliente}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Ragione Sociale</span>
                  <p className="font-semibold text-gray-900">{cliente.ragione_sociale}</p>
                </div>
                <div>
                  <span className="text-gray-500">P. IVA</span>
                  <p className="font-semibold text-gray-900">{cliente.partita_iva || '—'}</p>
                </div>
                <div className="md:col-span-2">
                  <span className="text-gray-500">Indirizzo</span>
                  <p className="font-semibold text-gray-900">
                    {cliente.indirizzo || '—'}{cliente.comune ? `, ${cliente.cap} ${cliente.comune}` : ''}{cliente.provincia ? ` (${cliente.provincia})` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Tecnico e firmatario */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <User className="text-green-600" size={20} />
                </div>
                <h3 className="font-bold text-gray-900">Dati Operativi</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tecnico presente *</label>
                  <select
                    value={tecnicoId}
                    onChange={e => setTecnicoId(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                    required
                  >
                    <option value="">Seleziona tecnico...</option>
                    {tecnici.map(t => (
                      <option key={t.id} value={t.id}>{t.cognome} {t.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ruolo del firmatario</label>
                  <select
                    value={firmatoDaRuolo}
                    onChange={e => setFirmatoDaRuolo(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                  >
                    <option value="">Seleziona ruolo...</option>
                    <option value="Titolare">Titolare dello Studio</option>
                    <option value="Responsabile">Responsabile / Direttore Sanitario</option>
                    <option value="Amministratore">Amministratore</option>
                    <option value="Delegato">Delegato dal Titolare</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome e Cognome del firmatario *</label>
                  <input
                    type="text"
                    value={firmatoDaNome}
                    onChange={e => setFirmatoDaNome(e.target.value)}
                    placeholder="Es. Dr. Mario Rossi"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Testo del consenso */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                  <Scale className="text-purple-600" size={20} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900">{TESTO_CONSENSO.titolo}</h3>
                  <p className="text-xs text-gray-500">Leggere attentamente prima di firmare</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowArticoli(!showArticoli)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  {showArticoli ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showArticoli ? 'Nascondi' : 'Leggi testo completo'}
                </button>
              </div>

              {/* Premesse */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 leading-relaxed mb-4">
                <p className="font-medium text-gray-700 mb-1">Premesse normative</p>
                {TESTO_CONSENSO.premesse}
              </div>

              {/* Articoli (collassabili) */}
              {showArticoli && (
                <div className="space-y-4 mb-4 border-t pt-4">
                  {TESTO_CONSENSO.articoli.map(art => (
                    <div key={art.num} className="text-sm">
                      <p className="font-semibold text-gray-800 mb-1">
                        Art. {art.num} — {art.titolo}
                      </p>
                      <p className="text-gray-600 leading-relaxed pl-4 border-l-2 border-blue-100">
                        {art.testo}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Checkbox consensi */}
              <div className="space-y-3 border-t pt-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Dichiaro di aver letto e compreso il testo sopra riportato e:
                </p>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${consensi.accesso_remoto ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={consensi.accesso_remoto}
                    onChange={() => toggleConsenso('accesso_remoto')}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Autorizzo l'accesso remoto per assistenza tecnica</p>
                    <p className="text-xs text-gray-500">Art. 1-2-3: Oggetto, strumenti e modalità di accesso</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${consensi.dati_sanitari ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={consensi.dati_sanitari}
                    onChange={() => toggleConsenso('dati_sanitari')}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Prendo atto della possibile presenza di dati sanitari</p>
                    <p className="text-xs text-gray-500">Art. 4: Consapevolezza e obbligo di riservatezza del Fornitore</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${consensi.modalita_accesso ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={consensi.modalita_accesso}
                    onChange={() => toggleConsenso('modalita_accesso')}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Accetto le modalità di accesso e registrazione sessioni</p>
                    <p className="text-xs text-gray-500">Art. 5: Logging degli accessi per min. 6 mesi (Garante Privacy)</p>
                  </div>
                </label>

                <label className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${consensi.autorizzazione_titolare ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input
                    type="checkbox"
                    checked={consensi.autorizzazione_titolare}
                    onChange={() => toggleConsenso('autorizzazione_titolare')}
                    className="mt-0.5 w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Confermo di essere autorizzato a firmare per lo studio</p>
                    <p className="text-xs text-gray-500">Dichiaro di avere i poteri per sottoscrivere il presente consenso</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Firma */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileText className="text-amber-600" size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Firma Digitale</h3>
                  <p className="text-xs text-gray-500">Firma Elettronica Semplice (FES) — Art. 21 D.Lgs. 82/2005</p>
                </div>
              </div>

              <SignaturePad
                onSignatureChange={setFirmaDataUrl}
                height={180}
              />

              <div className="mt-3 bg-gray-50 rounded-lg p-3 text-xs text-gray-500 flex items-start gap-2">
                <Shield size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <span>
                  La firma verrà associata al documento tramite hash crittografico SHA-256, certificando:
                  indirizzo IP di rete, data e ora, identità del browser e dispositivo.
                </span>
              </div>
            </div>

            {/* Note opzionali */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Note aggiuntive (opzionale)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Es. postazioni interessate, software specifici, orari preferiti per l'accesso remoto..."
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-200 outline-none resize-none text-sm"
              />
            </div>

            {/* Errore */}
            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl p-4 mb-6 text-sm">
                <AlertTriangle size={18} />
                {error}
              </div>
            )}

            {/* Pulsanti */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep('search'); setError('') }}
                className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                ← Cambia cliente
              </button>

              <button
                type="submit"
                disabled={submitting || !tuttiAccettati || !firmaDataUrl || !tecnicoId || !firmatoDaNome.trim()}
                className="px-8 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg"
              >
                {submitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Salvataggio in corso...</>
                ) : (
                  <><CheckCircle2 size={18} /> Conferma e Salva Consenso</>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== STEP 3: Successo ===== */}
      {step === 'success' && (
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="text-green-600" size={40} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Consenso Registrato</h2>
            <p className="text-gray-500 mb-6">
              Il consenso per l'accesso remoto è stato salvato correttamente per <strong>{cliente?.ragione_sociale}</strong>.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 text-sm text-left mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Firmatario</span>
                <span className="font-medium">{firmatoDaNome}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Data</span>
                <span className="font-medium">{new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tecnico</span>
                <span className="font-medium">{tecnici.find(t => t.id === tecnicoId)?.cognome} {tecnici.find(t => t.id === tecnicoId)?.nome}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setStep('search')
                  setCodiceCliente('')
                  setCliente(null)
                  setConsensi({ accesso_remoto: false, dati_sanitari: false, modalita_accesso: false, autorizzazione_titolare: false })
                  setFirmaDataUrl(null)
                  setFirmatoDaNome('')
                  setFirmatoDaRuolo('')
                  setNote('')
                  setTecnicoId('')
                  setError('')
                }}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
              >
                Nuovo Consenso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="max-w-3xl mx-auto mt-8 text-center text-xs text-gray-400">
        <p>Odonto Service S.r.l. — Piattaforma Assistenza Tecnica</p>
        <p className="mt-1">Documento conforme a GDPR (Reg. UE 2016/679), D.Lgs. 196/2003, Provv. Garante 27/11/2008</p>
      </div>
    </div>
  )
}
