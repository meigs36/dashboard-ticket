// lib/generaConsensoPDF.js
// Genera PDF del consenso accesso remoto firmato
import { jsPDF } from 'jspdf'

const TESTO_ARTICOLI = [
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

/**
 * Genera il PDF del consenso firmato
 * @param {Object} params
 * @param {Object} params.cliente - Dati del cliente
 * @param {string} params.firmatoDaNome - Nome del firmatario
 * @param {string} params.firmatoDaRuolo - Ruolo del firmatario
 * @param {string} params.tecnicoNome - Nome del tecnico presente
 * @param {string} params.firmaDataUrl - Base64 della firma grafica
 * @param {string} params.hash - Hash SHA-256 del documento
 * @param {Object} params.consensi - Oggetto con i 4 consensi boolean
 * @param {string} params.note - Note aggiuntive
 * @param {string} params.ipAddress - IP del firmatario (se disponibile dal server)
 * @returns {jsPDF} - Istanza del PDF (da salvare o scaricare)
 */
export function generaConsensoPDF({
  cliente,
  firmatoDaNome,
  firmatoDaRuolo,
  tecnicoNome,
  firmaDataUrl,
  hash,
  consensi,
  note,
  ipAddress
}) {
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const marginLeft = 20
  const marginRight = 20
  const contentWidth = pageWidth - marginLeft - marginRight
  const dataFirma = new Date()
  let y = 20

  // Colori
  const blue = [37, 99, 235]
  const darkGray = [31, 41, 55]
  const medGray = [107, 114, 128]
  const lightBg = [249, 250, 251]

  // Helper: testo wrappato e ritorna nuova Y
  function addWrappedText(text, x, startY, maxWidth, fontSize = 10, color = darkGray, fontStyle = 'normal') {
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    doc.setFont('helvetica', fontStyle)
    const lines = doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.45

    for (let i = 0; i < lines.length; i++) {
      if (startY > 270) {
        doc.addPage()
        startY = 20
      }
      doc.text(lines[i], x, startY)
      startY += lineHeight
    }
    return startY
  }

  // Helper: controlla e aggiunge pagina se necessario
  function checkPage(currentY, needed = 20) {
    if (currentY + needed > 275) {
      doc.addPage()
      return 20
    }
    return currentY
  }

  // =====================================================
  // INTESTAZIONE
  // =====================================================
  doc.setFillColor(...blue)
  doc.rect(0, 0, pageWidth, 35, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  doc.text('ODONTO SERVICE S.r.l.', marginLeft, 15)

  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.text("AUTORIZZAZIONE ALL'ACCESSO REMOTO PER ASSISTENZA TECNICA", marginLeft, 24)

  doc.setFontSize(8)
  doc.text(`Documento generato il ${dataFirma.toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })} alle ${dataFirma.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`, marginLeft, 31)

  y = 45

  // =====================================================
  // DATI DELLO STUDIO
  // =====================================================
  doc.setFillColor(...lightBg)
  doc.roundedRect(marginLeft, y, contentWidth, 32, 3, 3, 'F')
  doc.setDrawColor(200, 200, 200)
  doc.roundedRect(marginLeft, y, contentWidth, 32, 3, 3, 'S')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...blue)
  doc.text('DATI DELLO STUDIO', marginLeft + 5, y + 7)

  doc.setFontSize(9)
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'normal')

  doc.setFont('helvetica', 'bold')
  doc.text('Ragione Sociale:', marginLeft + 5, y + 14)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente.ragione_sociale || '—', marginLeft + 42, y + 14)

  doc.setFont('helvetica', 'bold')
  doc.text('P. IVA:', marginLeft + 5, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente.partita_iva || '—', marginLeft + 22, y + 20)

  doc.setFont('helvetica', 'bold')
  doc.text('Codice Cliente:', marginLeft + 85, y + 20)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente.codice_cliente || '—', marginLeft + 115, y + 20)

  const indirizzo = [cliente.indirizzo, cliente.cap, cliente.comune, cliente.provincia ? `(${cliente.provincia})` : ''].filter(Boolean).join(' ')
  doc.setFont('helvetica', 'bold')
  doc.text('Indirizzo:', marginLeft + 5, y + 26)
  doc.setFont('helvetica', 'normal')
  doc.text(indirizzo || '—', marginLeft + 26, y + 26)

  y += 40

  // =====================================================
  // PREMESSE NORMATIVE
  // =====================================================
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...medGray)
  y = addWrappedText(
    'Il presente documento è redatto ai sensi del Regolamento (UE) 2016/679 (GDPR), in particolare degli articoli 28 e 32, del D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018, e del Provvedimento del Garante per la Protezione dei Dati Personali del 27 novembre 2008 relativo agli Amministratori di Sistema.',
    marginLeft, y, contentWidth, 8, medGray, 'italic'
  )
  y += 4

  // =====================================================
  // ARTICOLI
  // =====================================================
  TESTO_ARTICOLI.forEach(art => {
    y = checkPage(y, 25)

    // Titolo articolo
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...darkGray)
    doc.text(`Art. ${art.num} — ${art.titolo}`, marginLeft, y)
    y += 5

    // Linea blu decorativa a sinistra
    doc.setDrawColor(...blue)
    doc.setLineWidth(0.5)
    const textStartY = y

    // Testo articolo
    y = addWrappedText(art.testo, marginLeft + 4, y, contentWidth - 4, 9, medGray, 'normal')

    doc.line(marginLeft, textStartY - 1, marginLeft, y - 1)
    y += 4
  })

  // =====================================================
  // DICHIARAZIONI DI CONSENSO
  // =====================================================
  y = checkPage(y, 40)
  y += 4

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...blue)
  doc.text('DICHIARAZIONI DI CONSENSO', marginLeft, y)
  y += 7

  const checkboxItems = [
    { key: 'accesso_remoto', label: 'Autorizzo l\'accesso remoto per assistenza tecnica (Art. 1-2-3)' },
    { key: 'dati_sanitari', label: 'Prendo atto della possibile presenza di dati sanitari (Art. 4)' },
    { key: 'modalita_accesso', label: 'Accetto le modalità di accesso e registrazione sessioni (Art. 5)' },
    { key: 'autorizzazione_titolare', label: 'Confermo di essere autorizzato a firmare per lo studio' }
  ]

  checkboxItems.forEach(item => {
    y = checkPage(y, 8)
    const checked = consensi[item.key]

    // Checkbox
    if (checked) {
      doc.setFillColor(16, 185, 129) // green
      doc.roundedRect(marginLeft, y - 3.5, 4, 4, 0.5, 0.5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', marginLeft + 0.7, y - 0.3)
    } else {
      doc.setDrawColor(200, 200, 200)
      doc.roundedRect(marginLeft, y - 3.5, 4, 4, 0.5, 0.5, 'S')
    }

    doc.setFontSize(9)
    doc.setTextColor(...darkGray)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, marginLeft + 7, y)
    y += 7
  })

  // =====================================================
  // NOTE
  // =====================================================
  if (note) {
    y = checkPage(y, 15)
    y += 2
    doc.setFillColor(...lightBg)
    const noteText = `Note: ${note}`
    const noteLines = doc.splitTextToSize(noteText, contentWidth - 10)
    const noteHeight = noteLines.length * 4 + 6
    doc.roundedRect(marginLeft, y, contentWidth, noteHeight, 2, 2, 'F')
    doc.setFontSize(8)
    doc.setTextColor(...medGray)
    doc.text(noteLines, marginLeft + 5, y + 5)
    y += noteHeight + 4
  }

  // =====================================================
  // FIRMA GRAFICA
  // =====================================================
  y = checkPage(y, 55)
  y += 6

  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...blue)
  doc.text('FIRMA', marginLeft, y)
  y += 6

  // Box firmatario
  doc.setFontSize(9)
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'bold')
  doc.text('Firmato da:', marginLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${firmatoDaNome}${firmatoDaRuolo ? ` — ${firmatoDaRuolo}` : ''}`, marginLeft + 25, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Tecnico presente:', marginLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(tecnicoNome || 'N/D', marginLeft + 35, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Data e ora:', marginLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFirma.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }), marginLeft + 25, y)
  y += 8

  // Firma immagine
  if (firmaDataUrl) {
    y = checkPage(y, 35)
    doc.setDrawColor(200, 200, 200)
    doc.setLineWidth(0.3)
    doc.roundedRect(marginLeft, y, 80, 28, 2, 2, 'S')

    try {
      doc.addImage(firmaDataUrl, 'PNG', marginLeft + 2, y + 1, 76, 26)
    } catch (err) {
      doc.setFontSize(8)
      doc.setTextColor(200, 0, 0)
      doc.text('[Firma grafica non disponibile]', marginLeft + 5, y + 15)
    }

    // Linea firma
    doc.setDrawColor(150, 150, 150)
    doc.line(marginLeft, y + 30, marginLeft + 80, y + 30)
    doc.setFontSize(7)
    doc.setTextColor(...medGray)
    doc.text('Firma del Titolare / Responsabile dello Studio', marginLeft, y + 34)

    y += 40
  }

  // =====================================================
  // CERTIFICATO DI FIRMA
  // =====================================================
  y = checkPage(y, 35)

  doc.setFillColor(240, 249, 255) // light blue bg
  doc.roundedRect(marginLeft, y, contentWidth, 30, 2, 2, 'F')
  doc.setDrawColor(147, 197, 253)
  doc.roundedRect(marginLeft, y, contentWidth, 30, 2, 2, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...blue)
  doc.text('CERTIFICATO DI FIRMA ELETTRONICA SEMPLICE (FES)', marginLeft + 5, y + 5)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...darkGray)

  const certY = y + 10
  doc.text(`Tipo: Firma Elettronica Semplice (FES) — Art. 21 D.Lgs. 82/2005 (CAD)`, marginLeft + 5, certY)
  doc.text(`Data/Ora: ${dataFirma.toISOString()}`, marginLeft + 5, certY + 4)
  doc.text(`IP: ${ipAddress || 'acquisito dal server'}`, marginLeft + 5, certY + 8)

  doc.setFont('helvetica', 'bold')
  doc.text('Hash SHA-256:', marginLeft + 5, certY + 12)
  doc.setFont('courier', 'normal')
  doc.setFontSize(6.5)
  doc.text(hash || 'N/D', marginLeft + 28, certY + 12)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.text(`Browser: ${navigator.userAgent.substring(0, 90)}`, marginLeft + 5, certY + 16)

  y += 38

  // =====================================================
  // FOOTER
  // =====================================================
  y = checkPage(y, 15)

  doc.setDrawColor(200, 200, 200)
  doc.line(marginLeft, y, marginLeft + contentWidth, y)
  y += 5
  doc.setFontSize(7)
  doc.setTextColor(...medGray)
  doc.setFont('helvetica', 'italic')
  doc.text('Documento conforme a GDPR (Reg. UE 2016/679), D.Lgs. 196/2003, Provv. Garante 27/11/2008', marginLeft, y)
  y += 3.5
  doc.text('Odonto Service S.r.l. — Piattaforma Assistenza Tecnica', marginLeft, y)
  y += 3.5
  doc.text(`Generato automaticamente il ${dataFirma.toLocaleString('it-IT')} — Riproduzione conforme all'originale digitale`, marginLeft, y)

  return doc
}

/**
 * Genera e scarica il PDF
 */
export function scaricaConsensoPDF(params) {
  const doc = generaConsensoPDF(params)
  const filename = `Consenso_${params.cliente.codice_cliente}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return filename
}

/**
 * Genera e restituisce il blob del PDF (per upload su Supabase storage)
 */
export function generaConsensoPDFBlob(params) {
  const doc = generaConsensoPDF(params)
  return doc.output('blob')
}
