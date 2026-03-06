// lib/generaConsensoPDF.js
// Genera PDF del consenso accesso remoto firmato
// Grafica allineata al Libro Macchine (stessi colori, logo, stile)

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

// Carica il logo come base64
async function loadLogoBase64() {
  try {
    const response = await fetch('/logo_2.png')
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (e) {
    console.warn('Impossibile caricare il logo:', e)
    return null
  }
}

/**
 * Genera il PDF del consenso firmato
 */
export async function generaConsensoPDF({
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
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF('p', 'mm', 'a4')
  const pageWidth = 210
  const marginLeft = 15
  const marginRight = 15
  const contentWidth = pageWidth - marginLeft - marginRight
  const dataFirma = new Date()

  // Colori — identici al Libro Macchine
  const darkBlue = [30, 64, 175]
  const primaryColor = [37, 99, 235]
  const tealColor = [0, 160, 160]
  const grayColor = [107, 114, 128]
  const darkGray = [31, 41, 55]
  const greenColor = [34, 197, 94]
  const lightBg = [249, 250, 251]

  let y = 0

  // Carica logo
  const logoBase64 = await loadLogoBase64()

  // Helper: testo wrappato
  function addWrappedText(text, x, startY, maxWidth, fontSize = 9, color = darkGray, fontStyle = 'normal') {
    doc.setFontSize(fontSize)
    doc.setTextColor(...color)
    doc.setFont('helvetica', fontStyle)
    const lines = doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.42
    for (let i = 0; i < lines.length; i++) {
      if (startY > 272) {
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
  // FASCIA HEADER con logo dentro
  // =====================================================
  const fasciaHeight = 28
  doc.setFillColor(...darkBlue)
  doc.rect(0, 0, pageWidth, fasciaHeight, 'F')

  // Logo dentro la fascia blu (logo_2.png è quadrato 1024x1024, rapporto 1:1)
  if (logoBase64) {
    try {
      const logoSize = 20  // quadrato 20x20mm
      doc.addImage(logoBase64, 'PNG', marginLeft, (fasciaHeight - logoSize) / 2, logoSize, logoSize)
    } catch (e) {
      console.warn('Errore inserimento logo:', e)
    }
  }

  // Titolo a destra del logo
  const titleX = marginLeft + 24
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text("AUTORIZZAZIONE ALL'ACCESSO REMOTO", titleX, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(180, 200, 255)
  doc.text('Assistenza Tecnica — Odonto Service S.r.l.', titleX, 18)

  // Linea teal decorativa in basso nella fascia
  doc.setDrawColor(...tealColor)
  doc.setLineWidth(1)
  doc.line(0, fasciaHeight - 0.5, pageWidth, fasciaHeight - 0.5)

  // =====================================================
  // DATI AZIENDA (sotto la fascia)
  // =====================================================
  y = 33

  doc.setTextColor(...grayColor)
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.text('Viale Romagna, 248-250 - 48125 Lido di Savio (RA) | Tel. 0544 949554 | info@odontoservice.info | P.IVA IT00595400391', pageWidth / 2, y, { align: 'center' })

  y = 38

  // Linea separatore
  doc.setDrawColor(...primaryColor)
  doc.setLineWidth(0.3)
  doc.line(marginLeft, y, pageWidth - marginRight, y)

  y = 42

  // =====================================================
  // DATI DELLO STUDIO (box grigio chiaro)
  // =====================================================
  const studioBoxH = 28
  doc.setFillColor(...lightBg)
  doc.roundedRect(marginLeft, y, contentWidth, studioBoxH, 2, 2, 'F')
  doc.setDrawColor(220, 220, 220)
  doc.roundedRect(marginLeft, y, contentWidth, studioBoxH, 2, 2, 'S')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...primaryColor)
  doc.text('DATI DELLO STUDIO', marginLeft + 5, y + 6)

  doc.setFontSize(8.5)
  doc.setTextColor(...darkGray)

  // Riga 1: Ragione Sociale
  doc.setFont('helvetica', 'bold')
  doc.text('Ragione Sociale:', marginLeft + 5, y + 12)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente.ragione_sociale || '—', marginLeft + 38, y + 12)

  // Riga 2: P.IVA + Codice Cliente
  doc.setFont('helvetica', 'bold')
  doc.text('P. IVA:', marginLeft + 5, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.text(cliente.partita_iva || '—', marginLeft + 20, y + 18)

  doc.setFont('helvetica', 'bold')
  doc.text('Codice Cliente:', marginLeft + 80, y + 18)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...tealColor)
  doc.setFont('helvetica', 'bold')
  doc.text(cliente.codice_cliente || '—', marginLeft + 108, y + 18)

  // Riga 3: Indirizzo
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'bold')
  doc.text('Indirizzo:', marginLeft + 5, y + 24)
  doc.setFont('helvetica', 'normal')
  const indirizzo = [cliente.indirizzo, cliente.cap, cliente.comune, cliente.provincia ? `(${cliente.provincia})` : ''].filter(Boolean).join(' ')
  doc.text(indirizzo || '—', marginLeft + 24, y + 24)

  y += studioBoxH + 6

  // =====================================================
  // PREMESSE NORMATIVE
  // =====================================================
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(...grayColor)
  y = addWrappedText(
    'Il presente documento è redatto ai sensi del Regolamento (UE) 2016/679 (GDPR), in particolare degli articoli 28 e 32, del D.Lgs. 196/2003 (Codice Privacy) come modificato dal D.Lgs. 101/2018, e del Provvedimento del Garante per la Protezione dei Dati Personali del 27 novembre 2008 relativo agli Amministratori di Sistema.',
    marginLeft, y, contentWidth, 7.5, grayColor, 'italic'
  )
  y += 4

  // =====================================================
  // ARTICOLI
  // =====================================================
  TESTO_ARTICOLI.forEach(art => {
    y = checkPage(y, 22)

    // Titolo articolo con numero teal
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...tealColor)
    doc.text(`Art. ${art.num}`, marginLeft, y)
    doc.setTextColor(...darkGray)
    doc.text(` — ${art.titolo}`, marginLeft + doc.getTextWidth(`Art. ${art.num}`), y)
    y += 4.5

    // Linea teal decorativa a sinistra
    const textStartY = y
    y = addWrappedText(art.testo, marginLeft + 4, y, contentWidth - 4, 8.5, grayColor, 'normal')

    doc.setDrawColor(...tealColor)
    doc.setLineWidth(0.6)
    doc.line(marginLeft, textStartY - 1, marginLeft, y - 1)
    y += 3.5
  })

  // =====================================================
  // DICHIARAZIONI DI CONSENSO
  // =====================================================
  y = checkPage(y, 40)
  y += 3

  // Titolo sezione con fascia
  doc.setFillColor(...darkBlue)
  doc.roundedRect(marginLeft, y - 4, contentWidth, 8, 1.5, 1.5, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('DICHIARAZIONI DI CONSENSO', marginLeft + 5, y + 1)
  y += 10

  const checkboxItems = [
    { key: 'accesso_remoto', label: "Autorizzo l'accesso remoto per assistenza tecnica (Art. 1-2-3)" },
    { key: 'dati_sanitari', label: 'Prendo atto della possibile presenza di dati sanitari (Art. 4)' },
    { key: 'modalita_accesso', label: 'Accetto le modalità di accesso e registrazione sessioni (Art. 5)' },
    { key: 'autorizzazione_titolare', label: 'Confermo di essere autorizzato a firmare per lo studio' }
  ]

  checkboxItems.forEach(item => {
    y = checkPage(y, 8)
    const checked = consensi[item.key]

    if (checked) {
      doc.setFillColor(...greenColor)
      doc.roundedRect(marginLeft + 2, y - 3.2, 3.8, 3.8, 0.5, 0.5, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.text('✓', marginLeft + 2.7, y - 0.2)
    } else {
      doc.setDrawColor(200, 200, 200)
      doc.setLineWidth(0.3)
      doc.roundedRect(marginLeft + 2, y - 3.2, 3.8, 3.8, 0.5, 0.5, 'S')
    }

    doc.setFontSize(8.5)
    doc.setTextColor(...darkGray)
    doc.setFont('helvetica', 'normal')
    doc.text(item.label, marginLeft + 9, y)
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
    doc.setTextColor(...grayColor)
    doc.text(noteLines, marginLeft + 5, y + 5)
    y += noteHeight + 4
  }

  // =====================================================
  // FIRMA
  // =====================================================
  y = checkPage(y, 55)
  y += 4

  // Titolo sezione con fascia
  doc.setFillColor(...darkBlue)
  doc.roundedRect(marginLeft, y - 4, contentWidth, 8, 1.5, 1.5, 'F')
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text('FIRMA', marginLeft + 5, y + 1)
  y += 10

  // Info firmatario
  doc.setFontSize(8.5)
  doc.setTextColor(...darkGray)
  doc.setFont('helvetica', 'bold')
  doc.text('Firmato da:', marginLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(`${firmatoDaNome}${firmatoDaRuolo ? ` — ${firmatoDaRuolo}` : ''}`, marginLeft + 24, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Tecnico presente:', marginLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(tecnicoNome || 'N/D', marginLeft + 34, y)
  y += 5

  doc.setFont('helvetica', 'bold')
  doc.text('Data e ora:', marginLeft, y)
  doc.setFont('helvetica', 'normal')
  doc.text(dataFirma.toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }), marginLeft + 24, y)
  y += 8

  // Firma immagine
  if (firmaDataUrl) {
    y = checkPage(y, 38)
    doc.setDrawColor(...primaryColor)
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
    doc.setDrawColor(...grayColor)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, y + 30, marginLeft + 80, y + 30)
    doc.setFontSize(7)
    doc.setTextColor(...grayColor)
    doc.text('Firma del Titolare / Responsabile dello Studio', marginLeft, y + 34)

    y += 40
  }

  // =====================================================
  // CERTIFICATO DI FIRMA ELETTRONICA
  // =====================================================
  y = checkPage(y, 35)

  // Box certificato con bordo teal
  doc.setFillColor(240, 249, 255)
  doc.roundedRect(marginLeft, y, contentWidth, 30, 2, 2, 'F')
  doc.setDrawColor(...tealColor)
  doc.setLineWidth(0.5)
  doc.roundedRect(marginLeft, y, contentWidth, 30, 2, 2, 'S')

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...darkBlue)
  doc.text('CERTIFICATO DI FIRMA ELETTRONICA SEMPLICE (FES)', marginLeft + 5, y + 5)

  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...darkGray)

  const certY = y + 10
  doc.text('Tipo: Firma Elettronica Semplice (FES) — Art. 21 D.Lgs. 82/2005 (CAD)', marginLeft + 5, certY)
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
  const totalPages = doc.internal.getNumberOfPages()
  const now = dataFirma.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    const pH = doc.internal.pageSize.getHeight()

    // Linea separatore footer
    doc.setDrawColor(...primaryColor)
    doc.setLineWidth(0.3)
    doc.line(marginLeft, pH - 14, pageWidth - marginRight, pH - 14)

    doc.setFontSize(7)
    doc.setTextColor(...grayColor)
    doc.setFont('helvetica', 'italic')
    doc.text('GDPR (Reg. UE 2016/679) | D.Lgs. 196/2003 | Provv. Garante 27/11/2008', marginLeft, pH - 10)
    doc.text(`Documento generato il ${now} — Pagina ${i} di ${totalPages}`, pageWidth - marginRight, pH - 10, { align: 'right' })

    doc.setFont('helvetica', 'normal')
    doc.text('Odonto Service S.r.l. — Piattaforma Assistenza Tecnica', marginLeft, pH - 6)
  }

  return doc
}

/**
 * Genera e scarica il PDF
 */
export async function scaricaConsensoPDF(params) {
  const doc = await generaConsensoPDF(params)
  const filename = `Consenso_${params.cliente.codice_cliente}_${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(filename)
  return filename
}

/**
 * Genera e restituisce il blob del PDF (per upload su Supabase storage)
 */
export async function generaConsensoPDFBlob(params) {
  const doc = await generaConsensoPDF(params)
  return doc.output('blob')
}
