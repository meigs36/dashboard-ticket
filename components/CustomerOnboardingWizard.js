'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'

export default function CustomerOnboardingWizard({ clienteId, onComplete }) {
  const router = useRouter()
  const fileInputRef = useRef(null)
  
  const [currentStep, setCurrentStep] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState(false)
  const [visitedSteps, setVisitedSteps] = useState([1]) // Track visited steps
  
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
    email_amministrazione: '',
    sito_web: '',
    note: '',
    
    // Step 2: Referenti
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
    
    // Step 4: Documenti
    documenti: [],
    
    // Step 5: Conferma
    accetta_termini: false
  })

  const totalSteps = 5
  const progressPercentage = (currentStep / totalSteps) * 100

  // Configurazione step con colori
  const steps = [
    { 
      number: 1, 
      label: 'Dati Aziendali', 
      shortLabel: 'Azienda',
      color: 'blue',
      bgColor: 'bg-blue-600',
      textColor: 'text-blue-900',
      lightColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      bgLight: 'bg-blue-50'
    },
    { 
      number: 2, 
      label: 'Referenti', 
      shortLabel: 'Referenti',
      color: 'amber',
      bgColor: 'bg-amber-500',
      textColor: 'text-amber-900',
      lightColor: 'text-amber-600',
      borderColor: 'border-amber-200',
      bgLight: 'bg-amber-50'
    },
    { 
      number: 3, 
      label: 'Macchinari e Attrezzature', 
      shortLabel: 'Macchinari',
      color: 'emerald',
      bgColor: 'bg-emerald-500',
      textColor: 'text-emerald-900',
      lightColor: 'text-emerald-600',
      borderColor: 'border-emerald-200',
      bgLight: 'bg-emerald-50'
    },
    { 
      number: 4, 
      label: 'Documenti Aziendali', 
      shortLabel: 'Documenti',
      color: 'purple',
      bgColor: 'bg-purple-600',
      textColor: 'text-purple-900',
      lightColor: 'text-purple-600',
      borderColor: 'border-purple-200',
      bgLight: 'bg-purple-50'
    },
    { 
      number: 5, 
      label: 'Riepilogo e Conferma', 
      shortLabel: 'Conferma',
      color: 'slate',
      bgColor: 'bg-slate-600',
      textColor: 'text-slate-900',
      lightColor: 'text-slate-600',
      borderColor: 'border-slate-200',
      bgLight: 'bg-slate-50'
    }
  ]

  const currentStepConfig = steps[currentStep - 1]

  const DOCUMENT_CATEGORIES = [
    { id: 'visura_camerale', label: 'Visura Camerale', icon: '🏢' },
    { id: 'certificato_agibilita', label: 'Certificato Agibilità', icon: '✅' },
    { id: 'planimetria', label: 'Planimetria Studio', icon: '🗺️' },
    { id: 'certificazioni_sanitarie', label: 'Certificazioni Sanitarie', icon: '🏥' },
    { id: 'altro', label: 'Altro Documento', icon: '📄' }
  ]

  const TIPI_MACCHINARIO = [
    'Riunito Odontoiatrico',
    'Autoclave',
    'RX Endorale',
    'Panoramica',
    'TAC Cone Beam',
    'Ablatore Ultrasuoni',
    'Compressore',
    'Aspiratore',
    'Lampada Polimerizzazione',
    'Micromotore',
    'Turbina',
    'Scanner Intraorale',
    'Altro'
  ]

  // ==================== HANDLERS ====================

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

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
    }))
  }

  const removeReferente = (index) => {
    setFormData(prev => ({
      ...prev,
      referenti: prev.referenti.filter((_, i) => i !== index)
    }))
  }

  const updateReferente = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      referenti: prev.referenti.map((ref, i) => 
        i === index ? { ...ref, [field]: value } : ref
      )
    }))
  }

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
    }))
  }

  const removeMacchinario = (index) => {
    setFormData(prev => ({
      ...prev,
      macchinari: prev.macchinari.filter((_, i) => i !== index)
    }))
  }

  const updateMacchinario = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      macchinari: prev.macchinari.map((macc, i) => 
        i === index ? { ...macc, [field]: value } : macc
      )
    }))
  }

  // ==================== UPLOAD DOCUMENTI ====================

  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files)
    if (files.length === 0) return

    setUploadingFiles(true)

    try {
      const uploadedDocs = []

      for (const file of files) {
        // Validazione file
        if (file.size > 10 * 1024 * 1024) {
          alert(`File ${file.name} troppo grande (max 10MB)`)
          continue
        }

        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          alert(`Tipo file ${file.name} non supportato`)
          continue
        }

        // Upload a Supabase Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${clienteId}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `onboarding/${fileName}`

        const { data, error } = await supabase.storage
          .from('customer-documents')
          .upload(filePath, file)

        if (error) throw error

        // Aggiungi a stato locale
        uploadedDocs.push({
          nome_file: file.name,
          tipo_file: file.type,
          dimensione: file.size,
          percorso: filePath,
          categoria: 'altro',
          storage_url: data.path
        })
      }

      setFormData(prev => ({
        ...prev,
        documenti: [...prev.documenti, ...uploadedDocs]
      }))

      alert(`${uploadedDocs.length} documento/i caricato/i con successo!`)
    } catch (error) {
      console.error('Errore upload:', error)
      alert('Errore durante l\'upload dei documenti')
    } finally {
      setUploadingFiles(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const removeDocument = async (index) => {
    const doc = formData.documenti[index]
    
    try {
      const { error } = await supabase.storage
        .from('customer-documents')
        .remove([doc.percorso])

      if (error) throw error

      setFormData(prev => ({
        ...prev,
        documenti: prev.documenti.filter((_, i) => i !== index)
      }))
    } catch (error) {
      console.error('Errore eliminazione:', error)
      alert('Errore durante l\'eliminazione del documento')
    }
  }

  const updateDocumentCategory = (index, categoria) => {
    setFormData(prev => ({
      ...prev,
      documenti: prev.documenti.map((doc, i) => 
        i === index ? { ...doc, categoria } : doc
      )
    }))
  }

  // ==================== NAVIGATION ====================

  const goToStep = (stepNumber) => {
    // Permetti di andare solo a step già visitati o al prossimo step
    const maxAllowedStep = Math.max(...visitedSteps) + 1
    
    if (stepNumber <= maxAllowedStep && stepNumber >= 1 && stepNumber <= totalSteps) {
      setCurrentStep(stepNumber)
      
      // Aggiungi step ai visitati se non c'è già
      if (!visitedSteps.includes(stepNumber)) {
        setVisitedSteps(prev => [...prev, stepNumber])
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      
      // Aggiungi il nuovo step ai visitati
      if (!visitedSteps.includes(newStep)) {
        setVisitedSteps(prev => [...prev, newStep])
      }
      
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ==================== SALVATAGGIO ====================

  const saveDraft = async () => {
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('customer_onboarding_drafts')
        .upsert({
          cliente_id: clienteId,
          form_data: formData,
          current_step: currentStep,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
      alert('✅ Bozza salvata con successo!')
    } catch (error) {
      console.error('Errore salvataggio:', error)
      alert('❌ Errore durante il salvataggio della bozza')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.accetta_termini) {
      alert('Devi accettare i termini e le condizioni per continuare')
      return
    }

    setIsSaving(true)

    try {
      // 1. Aggiorna dati cliente
      const { error: clienteError } = await supabase
        .from('clienti')
        .update({
          ragione_sociale: formData.ragione_sociale,
          partita_iva: formData.partita_iva,
          codice_fiscale: formData.codice_fiscale,
          indirizzo: formData.indirizzo,
          citta: formData.citta,
          cap: formData.cap,
          provincia: formData.provincia,
          telefono: formData.telefono,
          email: formData.email,
          pec: formData.pec,
          email_amministrazione: formData.email_amministrazione,
          sito_web: formData.sito_web,
          note: formData.note,
          onboarding_completato: true,
          onboarding_completato_il: new Date().toISOString()
        })
        .eq('id', clienteId)

      if (clienteError) throw clienteError

      // 2. Inserisci referenti
      for (const ref of formData.referenti) {
        if (ref.nome && ref.cognome) {
          await supabase.from('customer_referenti').insert({
            cliente_id: clienteId,
            ...ref
          })
        }
      }

      // 3. Inserisci macchinari
      for (const macc of formData.macchinari) {
        if (macc.tipo && macc.marca) {
          await supabase.from('customer_macchinari').insert({
            cliente_id: clienteId,
            ...macc
          })
        }
      }

      // 4. Collega documenti
      for (const doc of formData.documenti) {
        await supabase.from('customer_documenti').insert({
          cliente_id: clienteId,
          ...doc,
          caricato_da: 'cliente',
          caricato_il: new Date().toISOString()
        })
      }

      // 5. Elimina bozza
      await supabase
        .from('customer_onboarding_drafts')
        .delete()
        .eq('cliente_id', clienteId)

      alert('✅ Configurazione completata con successo!')

      if (onComplete) {
        onComplete()
      } else {
        router.push('/portal/dashboard')
      }

    } catch (error) {
      console.error('Errore completamento:', error)
      alert('❌ Errore durante il completamento. Riprova.')
    } finally {
      setIsSaving(false)
    }
  }

  // ==================== UTILITY ====================

  const getFileIcon = (mimeType) => {
    if (mimeType.includes('pdf')) return '📄'
    if (mimeType.includes('image')) return '🖼️'
    return '📎'
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Determina se uno step è cliccabile
  const isStepClickable = (stepNumber) => {
    const maxAllowedStep = Math.max(...visitedSteps) + 1
    return stepNumber <= maxAllowedStep
  }

  // ==================== RENDER ====================

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* HEADER STICKY CON LOGO */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo - PIÙ GRANDE */}
            <div className="flex items-center gap-4">
              <Image 
                src="/Logo.webp" 
                alt="OdontoService"
                width={120}
                height={90}
                className="object-contain"
                priority
              />
            </div>

            {/* Step Counter */}
            <div className="text-right">
              <div className="text-sm font-semibold text-gray-900">
                Step {currentStep} di {totalSteps}
              </div>
              <div className="text-xs text-gray-600">
                {Math.round(progressPercentage)}% completato
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTENUTO PRINCIPALE */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        {/* Progress Bar & Step Indicators */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full ${currentStepConfig.bgColor} transition-all duration-500`}
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* Step Circles - CLICCABILI */}
          <div className="flex items-center justify-between relative">
            {steps.map((step, index) => {
              const isClickable = isStepClickable(step.number)
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex flex-col items-center gap-2 flex-1">
                  {/* Circle - CLICCABILE */}
                  <button
                    type="button"
                    onClick={() => goToStep(step.number)}
                    disabled={!isClickable}
                    className={`
                      w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center
                      font-bold text-white text-sm sm:text-base transition-all duration-300
                      ${currentStep >= step.number ? step.bgColor : 'bg-gray-300'}
                      ${isActive ? 'ring-4 ring-offset-2 ring-opacity-50 scale-110' : ''}
                      ${isClickable ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-not-allowed opacity-60'}
                      ${isCompleted ? 'hover:brightness-110' : ''}
                    `}
                    style={isActive ? { 
                      ringColor: step.bgColor,
                      boxShadow: `0 0 0 4px ${step.bgColor}20`
                    } : {}}
                    title={isClickable ? `Vai a ${step.label}` : 'Step non ancora disponibile'}
                  >
                    {step.number}
                  </button>
                  
                  {/* Label */}
                  <div className="text-center">
                    <div className={`text-xs sm:text-sm font-medium transition-colors ${
                      currentStep >= step.number ? step.lightColor : 'text-gray-400'
                    }`}>
                      {step.shortLabel}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div 
                      className="hidden sm:block absolute top-6 h-0.5 bg-gray-200 -z-10 transition-all duration-500"
                      style={{ 
                        width: `calc((100% - ${100 / steps.length}%) / ${steps.length - 1})`,
                        left: `calc(${(100 / steps.length) * (index + 0.5)}%)`,
                        backgroundColor: currentStep > step.number ? step.bgColor : '#e5e7eb'
                      }} 
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            {/* STEP 1: Dati Aziendali */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentStepConfig.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${currentStepConfig.textColor}`}>
                      {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Inserisci i dati della tua azienda
                    </p>
                  </div>
                </div>

                {/* Card con sfondo azzurrino */}
                <div className={`${currentStepConfig.bgLight} rounded-xl p-4 border ${currentStepConfig.borderColor}`}>
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Ragione Sociale */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Ragione Sociale *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.ragione_sociale}
                      onChange={(e) => handleChange('ragione_sociale', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Es. Studio Odontoiatrico Rossi & Associati"
                    />
                  </div>

                  {/* P.IVA */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Partita IVA *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.partita_iva}
                      onChange={(e) => handleChange('partita_iva', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="12345678901"
                    />
                  </div>

                  {/* Codice Fiscale */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Codice Fiscale
                    </label>
                    <input
                      type="text"
                      value={formData.codice_fiscale}
                      onChange={(e) => handleChange('codice_fiscale', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="RSSMRA80A01H501Z"
                    />
                  </div>

                  {/* Indirizzo */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Indirizzo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.indirizzo}
                      onChange={(e) => handleChange('indirizzo', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Via Roma, 123"
                    />
                  </div>

                  {/* Città */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Città *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.citta}
                      onChange={(e) => handleChange('citta', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Milano"
                    />
                  </div>

                  {/* CAP */}
                  <div className="sm:w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CAP *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.cap}
                      onChange={(e) => handleChange('cap', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="20121"
                    />
                  </div>

                  {/* Provincia */}
                  <div className="sm:w-1/2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Provincia *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.provincia}
                      onChange={(e) => handleChange('provincia', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="MI"
                      maxLength={2}
                    />
                  </div>

                  {/* Telefono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.telefono}
                      onChange={(e) => handleChange('telefono', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="02 1234567"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="info@studio.it"
                    />
                  </div>

                  {/* PEC */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PEC
                    </label>
                    <input
                      type="email"
                      value={formData.pec}
                      onChange={(e) => handleChange('pec', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="studio@pec.it"
                    />
                  </div>

                  {/* Email Amministrazione */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Amministrazione
                    </label>
                    <input
                      type="email"
                      value={formData.email_amministrazione}
                      onChange={(e) => handleChange('email_amministrazione', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="admin@studio.it"
                    />
                  </div>

                  {/* Sito Web */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sito Web
                    </label>
                    <input
                      type="url"
                      value={formData.sito_web}
                      onChange={(e) => handleChange('sito_web', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="https://www.studio.it"
                    />
                  </div>

                  {/* Note */}
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Note
                    </label>
                    <textarea
                      rows={2}
                      value={formData.note}
                      onChange={(e) => handleChange('note', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Informazioni aggiuntive..."
                    />
                  </div>
                </div>
                </div>
              </div>
            )}

            {/* STEP 2: Referenti */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentStepConfig.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${currentStepConfig.textColor}`}>
                      {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Aggiungi i referenti della tua azienda
                    </p>
                  </div>
                </div>

                {formData.referenti.map((ref, index) => (
                  <div key={index} className={`${currentStepConfig.bgLight} rounded-xl p-4 border ${currentStepConfig.borderColor}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${currentStepConfig.textColor}`}>
                        Referente {index + 1}
                        {ref.principale && <span className="ml-2 text-xs bg-amber-200 px-2 py-0.5 rounded-full">Principale</span>}
                      </h3>
                      {formData.referenti.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeReferente(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️ Rimuovi
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={ref.nome}
                          onChange={(e) => updateReferente(index, 'nome', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
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
                          value={ref.cognome}
                          onChange={(e) => updateReferente(index, 'cognome', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          placeholder="Rossi"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ruolo *
                        </label>
                        <input
                          type="text"
                          required
                          value={ref.ruolo}
                          onChange={(e) => updateReferente(index, 'ruolo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          placeholder="Titolare"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Telefono *
                        </label>
                        <input
                          type="tel"
                          required
                          value={ref.telefono}
                          onChange={(e) => updateReferente(index, 'telefono', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          placeholder="333 1234567"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={ref.email}
                          onChange={(e) => updateReferente(index, 'email', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                          placeholder="mario.rossi@studio.it"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ref.principale}
                            onChange={(e) => updateReferente(index, 'principale', e.target.checked)}
                            className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                          />
                          <span className="text-sm text-gray-700">Referente principale</span>
                        </label>
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addReferente}
                  className={`w-full py-2.5 border-2 border-dashed ${currentStepConfig.borderColor} ${currentStepConfig.lightColor} rounded-lg hover:${currentStepConfig.bgLight} font-medium transition-colors`}
                >
                  + Aggiungi Altro Referente
                </button>
              </div>
            )}

            {/* STEP 3: Macchinari */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentStepConfig.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${currentStepConfig.textColor}`}>
                      {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Registra le attrezzature presenti
                    </p>
                  </div>
                </div>

                {formData.macchinari.map((macc, index) => (
                  <div key={index} className={`${currentStepConfig.bgLight} rounded-xl p-4 border ${currentStepConfig.borderColor}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className={`font-semibold ${currentStepConfig.textColor}`}>
                        Macchinario {index + 1}
                      </h3>
                      {formData.macchinari.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMacchinario(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️ Rimuovi
                        </button>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo *
                        </label>
                        <select
                          required
                          value={macc.tipo}
                          onChange={(e) => updateMacchinario(index, 'tipo', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="">Seleziona...</option>
                          {TIPI_MACCHINARIO.map(tipo => (
                            <option key={tipo} value={tipo}>{tipo}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Marca *
                        </label>
                        <input
                          type="text"
                          required
                          value={macc.marca}
                          onChange={(e) => updateMacchinario(index, 'marca', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Es. Sirona"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Modello *
                        </label>
                        <input
                          type="text"
                          required
                          value={macc.modello}
                          onChange={(e) => updateMacchinario(index, 'modello', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Es. C4+"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Numero Seriale
                        </label>
                        <input
                          type="text"
                          value={macc.numero_seriale}
                          onChange={(e) => updateMacchinario(index, 'numero_seriale', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="SN123456"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Data Installazione
                        </label>
                        <input
                          type="date"
                          value={macc.data_installazione}
                          onChange={(e) => updateMacchinario(index, 'data_installazione', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Ubicazione
                        </label>
                        <input
                          type="text"
                          value={macc.ubicazione}
                          onChange={(e) => updateMacchinario(index, 'ubicazione', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Sala 1"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Numero Libro
                        </label>
                        <input
                          type="text"
                          value={macc.numero_libro}
                          onChange={(e) => updateMacchinario(index, 'numero_libro', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="L-001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Scadenza Garanzia
                        </label>
                        <input
                          type="date"
                          value={macc.garanzia_scadenza}
                          onChange={(e) => updateMacchinario(index, 'garanzia_scadenza', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={macc.contratto_manutenzione}
                            onChange={(e) => updateMacchinario(index, 'contratto_manutenzione', e.target.checked)}
                            className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                          />
                          <span className="text-sm text-gray-700">Contratto manutenzione attivo</span>
                        </label>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Note Tecniche
                        </label>
                        <textarea
                          rows={2}
                          value={macc.note_tecniche}
                          onChange={(e) => updateMacchinario(index, 'note_tecniche', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          placeholder="Informazioni aggiuntive..."
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addMacchinario}
                  className={`w-full py-2.5 border-2 border-dashed ${currentStepConfig.borderColor} ${currentStepConfig.lightColor} rounded-lg hover:${currentStepConfig.bgLight} font-medium transition-colors`}
                >
                  + Aggiungi Altro Macchinario
                </button>
              </div>
            )}

            {/* STEP 4: Documenti */}
            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentStepConfig.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${currentStepConfig.textColor}`}>
                      {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Carica documenti utili (opzionale)
                    </p>
                  </div>
                </div>

                {/* Upload Area */}
                <div className={`${currentStepConfig.bgLight} rounded-xl p-6 border-2 border-dashed ${currentStepConfig.borderColor}`}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  
                  <div className="text-center">
                    <div className={`mx-auto w-16 h-16 ${currentStepConfig.bgLight} rounded-full flex items-center justify-center mb-4`}>
                      <svg className={`w-8 h-8 ${currentStepConfig.lightColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Carica Documenti
                    </h3>
                    
                    <p className="text-sm text-gray-600 mb-4">
                      PDF, JPEG, PNG, WEBP • Max 10MB per file
                    </p>
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFiles}
                      className={`px-6 py-2.5 ${currentStepConfig.bgColor} text-white rounded-lg hover:opacity-90 font-medium transition-colors disabled:opacity-50`}
                    >
                      {uploadingFiles ? 'Caricamento...' : '📎 Seleziona File'}
                    </button>
                  </div>
                </div>

                {/* Documenti Suggeriti */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-medium text-gray-900 mb-3 text-sm">
                    📋 Documenti suggeriti (non obbligatori):
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <div key={cat.id} className="text-sm text-gray-700 flex items-center gap-2">
                        <span>{cat.icon}</span>
                        <span>{cat.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Lista Documenti Caricati */}
                {formData.documenti.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900 text-sm">
                      Documenti caricati ({formData.documenti.length}):
                    </h4>
                    {formData.documenti.map((doc, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200 flex items-center gap-3">
                        <span className="text-2xl">{getFileIcon(doc.tipo_file)}</span>
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 text-sm truncate">
                            {doc.nome_file}
                          </p>
                          <p className="text-gray-600 text-xs">
                            {formatFileSize(doc.dimensione)}
                          </p>
                        </div>

                        <select
                          value={doc.categoria}
                          onChange={(e) => updateDocumentCategory(index, e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                          {DOCUMENT_CATEGORIES.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.icon} {cat.label}
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STEP 5: Riepilogo */}
            {currentStep === 5 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6">
                  <div className={`${currentStepConfig.bgColor} w-10 h-10 rounded-lg flex items-center justify-center`}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className={`text-xl font-bold ${currentStepConfig.textColor}`}>
                      {currentStepConfig.label}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Verifica i dati prima di completare
                    </p>
                  </div>
                </div>

                {/* Riepilogo Dati Aziendali */}
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Dati Aziendali
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600">Ragione Sociale:</span>
                      <p className="font-medium text-gray-900">{formData.ragione_sociale || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">P.IVA:</span>
                      <p className="font-medium text-gray-900">{formData.partita_iva || '-'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Indirizzo:</span>
                      <p className="font-medium text-gray-900">
                        {formData.indirizzo || '-'}, {formData.cap} {formData.citta} ({formData.provincia})
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-600">Email:</span>
                      <p className="font-medium text-gray-900">{formData.email || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Riepilogo Referenti */}
                <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                  <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Referenti ({formData.referenti.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.referenti.map((ref, i) => (
                      <div key={i} className="text-xs bg-white rounded-lg p-2">
                        <p className="font-medium text-gray-900">
                          {ref.nome} {ref.cognome}
                          {ref.principale && <span className="ml-2 text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">Principale</span>}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {ref.ruolo} • {ref.telefono} • {ref.email}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riepilogo Macchinari */}
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                  <h3 className="font-semibold text-emerald-900 mb-3 flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Macchinari ({formData.macchinari.length})
                  </h3>
                  <div className="space-y-2">
                    {formData.macchinari.map((macc, i) => (
                      <div key={i} className="text-xs bg-white rounded-lg p-2">
                        <p className="font-medium text-gray-900">
                          {macc.tipo} - {macc.marca} {macc.modello}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">
                          {macc.numero_seriale && `SN: ${macc.numero_seriale} • `}
                          {macc.ubicazione && `${macc.ubicazione}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Riepilogo Documenti */}
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2 text-sm">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    Documenti Caricati ({formData.documenti.length})
                  </h3>
                  {formData.documenti.length > 0 ? (
                    <div className="space-y-2">
                      {formData.documenti.map((doc, i) => {
                        const categoria = DOCUMENT_CATEGORIES.find(c => c.id === doc.categoria)
                        return (
                          <div key={i} className="text-xs bg-white rounded-lg p-2 flex items-center gap-2">
                            <span className="text-xl">{getFileIcon(doc.tipo_file)}</span>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 truncate">{doc.nome_file}</p>
                              <p className="text-gray-600 text-xs">
                                {categoria?.icon} {categoria?.label} • {formatFileSize(doc.dimensione)}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">Nessun documento caricato</p>
                  )}
                </div>

                {/* Accettazione Termini */}
                <div className="bg-white rounded-xl p-4 border-2 border-gray-200">
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
                      <p className="text-gray-600 text-xs">
                        Confermo che i dati inseriti sono corretti e autorizzo il trattamento 
                        degli stessi secondo la normativa sulla privacy (GDPR).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="flex gap-2">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={prevStep}
                    className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors text-sm"
                  >
                    ← Indietro
                  </button>
                )}

                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={isSaving}
                  className="px-5 py-2 bg-white border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors disabled:opacity-50 text-sm"
                >
                  {isSaving ? 'Salvataggio...' : '💾 Salva'}
                </button>
              </div>

              <div>
                {currentStep < totalSteps ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className={`px-6 py-2 ${currentStepConfig.bgColor} text-white rounded-lg hover:opacity-90 font-medium transition-all text-sm`}
                  >
                    Avanti →
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSaving || !formData.accetta_termini}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-emerald-600 text-white rounded-lg hover:from-blue-700 hover:to-emerald-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isSaving ? 'Completamento...' : '✅ Completa'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Help Footer */}
        <div className="text-center mt-4 text-xs text-gray-600">
          <p>
            Hai bisogno di aiuto? <a href="mailto:support@odontoservice.it" className="text-blue-600 hover:underline">Contatta il supporto</a>
          </p>
        </div>
      </div>
    </div>
  )
}
