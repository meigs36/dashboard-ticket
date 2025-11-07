'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    // Step 1: Dati Aziendali
    ragione_sociale: '',
    partita_iva: '',
    codice_fiscale: '',
    indirizzo: '',
    citta: '',
    cap: '',
    provincia: '',
    telefono: '',
    email: '',
    pec: '',
    sito_web: '',
    note: '',
    
    // Step 2: Contatti/Referenti
    referenti: [{
      nome: '',
      cognome: '',
      ruolo: '',
      telefono: '',
      email: '',
      principale: true
    }],
    
    // Step 3: Macchinari
    macchinari: [{
      tipo: '',
      marca: '',
      modello: '',
      numero_seriale: '',
      data_installazione: '',
      ubicazione: '',
      numero_libro: '',
      garanzia_scadenza: '',
      contratto_manutenzione: false,
      note_tecniche: ''
    }],
    
    // Step 4: Preferenze
    orario_preferito_interventi: '',
    note_particolari: '',
    accetta_termini: false
  });

  const totalSteps = 4;

  // Colori più trasparenti per ogni step
  const stepColors = {
    1: {
      bg: 'bg-blue-50/40',
      border: 'border-blue-200/50',
      accent: 'bg-blue-500',
      text: 'text-blue-900',
      light: 'text-blue-600'
    },
    2: {
      bg: 'bg-amber-50/40',
      border: 'border-amber-200/50',
      accent: 'bg-amber-500',
      text: 'text-amber-900',
      light: 'text-amber-600'
    },
    3: {
      bg: 'bg-emerald-50/40',
      border: 'border-emerald-200/50',
      accent: 'bg-emerald-500',
      text: 'text-emerald-900',
      light: 'text-emerald-600'
    },
    4: {
      bg: 'bg-slate-50/40',
      border: 'border-slate-200/50',
      accent: 'bg-slate-500',
      text: 'text-slate-900',
      light: 'text-slate-600'
    }
  };

  const currentColor = stepColors[currentStep];

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      // TODO: Salvare bozza su Supabase
      console.log('Salvataggio bozza:', formData);
      await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
      alert('Bozza salvata con successo!');
    } catch (error) {
      console.error('Errore salvataggio bozza:', error);
      alert('Errore nel salvataggio della bozza');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.accetta_termini) {
      alert('Devi accettare i termini e condizioni');
      return;
    }

    setIsSaving(true);
    try {
      // TODO: Integrare con Supabase
      console.log('Dati configurazione completa:', formData);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay
      alert('Configurazione completata! Benvenuto nel portale.');
      router.push('/portal/dashboard');
    } catch (error) {
      console.error('Errore completamento:', error);
      alert('Errore nel completamento della configurazione');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addReferente = () => {
    setFormData(prev => ({
      ...prev,
      referenti: [...prev.referenti, {
        nome: '',
        cognome: '',
        ruolo: '',
        telefono: '',
        email: '',
        principale: false
      }]
    }));
  };

  const removeReferente = (index) => {
    setFormData(prev => ({
      ...prev,
      referenti: prev.referenti.filter((_, i) => i !== index)
    }));
  };

  const updateReferente = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      referenti: prev.referenti.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }));
  };

  const addMacchinario = () => {
    setFormData(prev => ({
      ...prev,
      macchinari: [...prev.macchinari, {
        tipo: '',
        marca: '',
        modello: '',
        numero_seriale: '',
        data_installazione: '',
        ubicazione: '',
        numero_libro: '',
        garanzia_scadenza: '',
        contratto_manutenzione: false,
        note_tecniche: ''
      }]
    }));
  };

  const removeMacchinario = (index) => {
    setFormData(prev => ({
      ...prev,
      macchinari: prev.macchinari.filter((_, i) => i !== index)
    }));
  };

  const updateMacchinario = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      macchinari: prev.macchinari.map((macc, i) => 
        i === index ? { ...macc, [field]: value } : macc
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Header sticky identico alla portal */}
      <header className="sticky top-0 bg-white/80 backdrop-blur-md shadow-sm z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Image 
              src="/Logo.webp" 
              alt="OdontoService" 
              width={120}
              height={90}
              className="object-contain drop-shadow-md"
            />
          </div>
          <div className="text-sm text-gray-600 font-medium">
            Configurazione Iniziale
          </div>
        </div>
      </header>

      {/* Container principale */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Completa la configurazione
          </h1>
          <p className="text-gray-600">
            Inserisci i dati per attivare il tuo portale clienti
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center flex-1">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                  transition-all duration-300
                  ${currentStep >= step 
                    ? `${stepColors[step].accent} text-white shadow-lg scale-110` 
                    : 'bg-gray-200 text-gray-500'
                  }
                `}>
                  {step}
                </div>
                <div className={`
                  text-xs mt-2 font-medium text-center
                  ${currentStep === step ? currentColor.text : 'text-gray-500'}
                `}>
                  {step === 1 && 'Dati Aziendali'}
                  {step === 2 && 'Referenti'}
                  {step === 3 && 'Macchinari'}
                  {step === 4 && 'Riepilogo'}
                </div>
              </div>
            ))}
          </div>
          <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className={`absolute top-0 left-0 h-full ${currentColor.accent} transition-all duration-500 ease-out`}
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Container con colore step TRASPARENTE */}
        <div className={`
          ${currentColor.bg} ${currentColor.border} 
          border-2 rounded-2xl shadow-xl p-8 mb-6
          transition-all duration-300
        `}>
          <form onSubmit={handleSubmit}>
            
            {/* STEP 1: Dati Aziendali */}
            {currentStep === 1 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentColor.accent} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${currentColor.text}`}>
                      Dati Aziendali
                    </h2>
                    <p className={`text-sm ${currentColor.light}`}>
                      Informazioni generali della tua attività
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ragione Sociale *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ragione_sociale}
                      onChange={(e) => handleChange('ragione_sociale', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="Es. Studio Dentistico Rossi"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partita IVA *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.partita_iva}
                      onChange={(e) => handleChange('partita_iva', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="12345678901"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Codice Fiscale
                    </label>
                    <input
                      type="text"
                      value={formData.codice_fiscale}
                      onChange={(e) => handleChange('codice_fiscale', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="RSSMRA80A01H501Z"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Indirizzo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.indirizzo}
                      onChange={(e) => handleChange('indirizzo', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="Via Roma, 123"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Città *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.citta}
                      onChange={(e) => handleChange('citta', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="Milano"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        CAP *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.cap}
                        onChange={(e) => handleChange('cap', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                        placeholder="20100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Provincia *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.provincia}
                        onChange={(e) => handleChange('provincia', e.target.value)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                        placeholder="MI"
                        maxLength={2}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => handleChange('telefono', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="+39 02 12345678"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="info@studio.it"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PEC
                    </label>
                    <input
                      type="email"
                      value={formData.pec}
                      onChange={(e) => handleChange('pec', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="pec@studio.pec.it"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sito Web
                    </label>
                    <input
                      type="url"
                      value={formData.sito_web}
                      onChange={(e) => handleChange('sito_web', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-gray-400"
                      placeholder="https://www.studio.it"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      value={formData.note}
                      onChange={(e) => handleChange('note', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
                      placeholder="Eventuali note o informazioni aggiuntive..."
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Referenti */}
            {currentStep === 2 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentColor.accent} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${currentColor.text}`}>
                      Referenti Aziendali
                    </h2>
                    <p className={`text-sm ${currentColor.light}`}>
                      Persone di contatto per amministrazione e assistenza
                    </p>
                  </div>
                </div>

                {formData.referenti.map((referente, index) => (
                  <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Referente {index + 1}
                        {referente.principale && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                            Principale
                          </span>
                        )}
                      </h3>
                      {formData.referenti.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReferente(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={referente.nome}
                          onChange={(e) => updateReferente(index, 'nome', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="Mario"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cognome *
                        </label>
                        <input
                          type="text"
                          required
                          value={referente.cognome}
                          onChange={(e) => updateReferente(index, 'cognome', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="Rossi"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ruolo *
                        </label>
                        <select
                          required
                          value={referente.ruolo}
                          onChange={(e) => updateReferente(index, 'ruolo', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent text-gray-900"
                        >
                          <option value="" className="text-gray-400">Seleziona...</option>
                          <option value="titolare">Titolare</option>
                          <option value="amministratore">Amministratore</option>
                          <option value="responsabile_tecnico">Responsabile Tecnico</option>
                          <option value="segreteria">Segreteria</option>
                          <option value="altro">Altro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefono *
                        </label>
                        <input
                          type="tel"
                          required
                          value={referente.telefono}
                          onChange={(e) => updateReferente(index, 'telefono', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="+39 333 1234567"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={referente.email}
                          onChange={(e) => updateReferente(index, 'email', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="mario.rossi@studio.it"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={referente.principale}
                            onChange={(e) => updateReferente(index, 'principale', e.target.checked)}
                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-700">
                            Contatto principale
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addReferente}
                  className="w-full py-3 border-2 border-dashed border-amber-300 rounded-lg text-amber-600 hover:border-amber-400 hover:bg-amber-50 font-medium transition-all"
                >
                  + Aggiungi altro referente
                </button>
              </div>
            )}

            {/* STEP 3: Macchinari */}
            {currentStep === 3 && (
              <div className="space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentColor.accent} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${currentColor.text}`}>
                      Macchinari e Attrezzature
                    </h2>
                    <p className={`text-sm ${currentColor.light}`}>
                      Riuniti, autoclavi, compressori e altre attrezzature
                    </p>
                  </div>
                </div>

                {formData.macchinari.map((macchinario, index) => (
                  <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        Macchinario {index + 1}
                      </h3>
                      {formData.macchinari.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMacchinario(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Rimuovi
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo *
                        </label>
                        <select
                          required
                          value={macchinario.tipo}
                          onChange={(e) => updateMacchinario(index, 'tipo', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900"
                        >
                          <option value="" className="text-gray-400">Seleziona...</option>
                          <option value="riunito">Riunito</option>
                          <option value="autoclave">Autoclave</option>
                          <option value="compressore">Compressore</option>
                          <option value="aspiratore">Aspiratore</option>
                          <option value="rx">RX Endorale</option>
                          <option value="ortopantomografo">Ortopantomografo</option>
                          <option value="tac">TAC/CBCT</option>
                          <option value="altro">Altro</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Marca
                        </label>
                        <input
                          type="text"
                          value={macchinario.marca}
                          onChange={(e) => updateMacchinario(index, 'marca', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="Es. Castellini"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Modello
                        </label>
                        <input
                          type="text"
                          value={macchinario.modello}
                          onChange={(e) => updateMacchinario(index, 'modello', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="Es. Duo Plus"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Numero Seriale
                        </label>
                        <input
                          type="text"
                          value={macchinario.numero_seriale}
                          onChange={(e) => updateMacchinario(index, 'numero_seriale', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="SN123456"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Installazione
                        </label>
                        <input
                          type="date"
                          value={macchinario.data_installazione}
                          onChange={(e) => updateMacchinario(index, 'data_installazione', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ubicazione
                        </label>
                        <input
                          type="text"
                          value={macchinario.ubicazione}
                          onChange={(e) => updateMacchinario(index, 'ubicazione', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="Es. Sala 1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Numero Libro
                        </label>
                        <input
                          type="text"
                          value={macchinario.numero_libro}
                          onChange={(e) => updateMacchinario(index, 'numero_libro', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent placeholder:text-gray-400"
                          placeholder="N. Libro"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scadenza Garanzia
                        </label>
                        <input
                          type="date"
                          value={macchinario.garanzia_scadenza}
                          onChange={(e) => updateMacchinario(index, 'garanzia_scadenza', e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={macchinario.contratto_manutenzione}
                            onChange={(e) => updateMacchinario(index, 'contratto_manutenzione', e.target.checked)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">
                            Contratto di manutenzione attivo
                          </span>
                        </label>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Note Tecniche
                        </label>
                        <textarea
                          value={macchinario.note_tecniche}
                          onChange={(e) => updateMacchinario(index, 'note_tecniche', e.target.value)}
                          rows={2}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none placeholder:text-gray-400"
                          placeholder="Eventuali note tecniche..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addMacchinario}
                  className="w-full py-3 border-2 border-dashed border-emerald-300 rounded-lg text-emerald-600 hover:border-emerald-400 hover:bg-emerald-50 font-medium transition-all"
                >
                  + Aggiungi altro macchinario
                </button>
              </div>
            )}

            {/* STEP 4: Riepilogo */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentColor.accent} w-12 h-12 rounded-xl flex items-center justify-center`}>
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-2xl font-bold ${currentColor.text}`}>
                      Riepilogo e Conferma
                    </h2>
                    <p className={`text-sm ${currentColor.light}`}>
                      Verifica i dati inseriti prima di completare
                    </p>
                  </div>
                </div>

                {/* Riepilogo Dati Aziendali */}
                <div className="bg-blue-50/60 rounded-xl p-5 border border-blue-200/60">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Dati Aziendali
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-gray-600">Ragione Sociale:</span>
                      <p className="font-medium text-gray-900">{formData.ragione_sociale || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">P.IVA:</span>
                      <p className="font-medium text-gray-900">{formData.partita_iva || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-600">Indirizzo:</span>
                      <p className="font-medium text-gray-900">
                        {formData.indirizzo}, {formData.cap} {formData.citta} ({formData.provincia})
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Telefono:</span>
                      <p className="font-medium text-gray-900">{formData.telefono || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">{formData.email || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Riepilogo Referenti */}
                <div className="bg-amber-50/60 rounded-xl p-5 border border-amber-200/60">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Referenti ({formData.referenti.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.referenti.map((ref, i) => (
                      <div key={i} className="text-sm bg-white rounded-lg p-3">
                        <p className="font-medium text-gray-900">
                          {ref.nome} {ref.cognome}
                          {ref.principale && <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Principale</span>}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {ref.ruolo} • {ref.telefono} • {ref.email}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riepilogo Macchinari */}
                <div className="bg-emerald-50/60 rounded-xl p-5 border border-emerald-200/60">
                  <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Macchinari ({formData.macchinari.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.macchinari.map((macc, i) => (
                      <div key={i} className="text-sm bg-white rounded-lg p-3">
                        <p className="font-medium text-gray-900">
                          {macc.tipo.toUpperCase()} - {macc.marca} {macc.modello}
                        </p>
                        <p className="text-gray-600 text-xs mt-1">
                          {macc.numero_seriale && `SN: ${macc.numero_seriale} • `}
                          {macc.ubicazione && `${macc.ubicazione}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Accettazione Termini */}
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.accetta_termini}
                      onChange={(e) => handleChange('accetta_termini', e.target.checked)}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                    />
                    <div className="text-sm">
                      <p className="font-medium text-gray-900 mb-1">
                        Accetto i termini e le condizioni *
                      </p>
                      <p className="text-gray-600">
                        Confermo che i dati inseriti sono corretti e autorizzo il trattamento 
                        degli stessi secondo la normativa sulla privacy (GDPR).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Bottoni Navigazione */}
            <div className="flex items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all"
                  >
                    ← Indietro
                  </button>
                )}
                
                {currentStep < totalSteps && (
                  <button
                    type="button"
                    onClick={handleSaveDraft}
                    disabled={isSaving}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-all disabled:opacity-50"
                  >
                    {isSaving ? 'Salvataggio...' : '💾 Salva Bozza'}
                  </button>
                )}
              </div>

              <div>
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className={`px-8 py-2.5 ${currentColor.accent} text-white rounded-lg hover:opacity-90 font-medium transition-all shadow-lg`}
                  >
                    Avanti →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSaving}
                    className={`px-8 py-2.5 ${currentColor.accent} text-white rounded-lg hover:opacity-90 font-medium transition-all shadow-lg disabled:opacity-50`}
                  >
                    {isSaving ? 'Completamento...' : '✓ Completa Configurazione'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center text-sm text-gray-500 mt-6">
          <p>Hai bisogno di aiuto? Contattaci: <a href="mailto:support@odontoservice.it" className="text-blue-600 hover:underline">support@odontoservice.it</a></p>
        </div>
      </div>
    </div>
  );
}
