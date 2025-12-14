// components/LibroMacchinePDF.js
'use client'

import { useState } from 'react'
import { FileText, Loader2 } from 'lucide-react'

export default function LibroMacchinePDF({ 
  clienteId, 
  clienteNome,
  sedeNome,
  variant = 'button',
  className = ''
}) {
  const [loading, setLoading] = useState(false)

  // Funzione per caricare immagine come base64
  const loadImageAsBase64 = async (url) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.warn('Impossibile caricare il logo:', error)
      return null
    }
  }

  const generatePDF = async () => {
    if (!clienteId) {
      alert('ID cliente mancante')
      return
    }
    
    setLoading(true)
    
    try {
      // 1. Recupera dati dal server
      const response = await fetch(`/api/libro-macchine?clienteId=${clienteId}`)
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Errore recupero dati')
      }

      if (result.totaleMacchinari === 0) {
        alert('Nessun macchinario trovato per questo cliente')
        return
      }

      const { data } = result

      // 2. Carica logo
      const logoBase64 = await loadImageAsBase64('/Logo.webp')

      // 3. Carica jsPDF e autoTable
      const jsPDFModule = await import('jspdf')
      const jsPDF = jsPDFModule.default || jsPDFModule.jsPDF
      const autoTableModule = await import('jspdf-autotable')
      const autoTable = autoTableModule.default || autoTableModule
      
      // 4. Crea documento PDF in landscape
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const marginX = 10
      
      // Colori
      const primaryColor = [37, 99, 235]
      const darkBlue = [30, 64, 175]
      const grayColor = [107, 114, 128]
      const tealColor = [0, 160, 160]
      const greenColor = [34, 197, 94]
      const redColor = [239, 68, 68]

      // Info cliente per header
      const clienteRagioneSociale = data.cliente.ragione_sociale || 'N/D'
      const clienteIndirizzo = [
        data.cliente.indirizzo,
        data.cliente.cap,
        data.cliente.citta,
        data.cliente.provincia ? `(${data.cliente.provincia})` : ''
      ].filter(Boolean).join(' ') || 'N/D'
      
      // SEDE: usa la prop sedeNome, oppure estrai la città dal cliente
      const sedeLabel = sedeNome || data.cliente.citta || ''

      // Funzione per disegnare l'header
      const drawHeader = () => {
        const fasciaHeight = 22
        doc.setFillColor(...darkBlue)
        doc.rect(0, 0, pageWidth, fasciaHeight, 'F')
        
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        const textWidth = doc.getTextWidth('LIBRO MACCHINE')
        const lineStart = (pageWidth - textWidth) / 2 - 20
        const lineEnd = (pageWidth + textWidth) / 2 + 20
        
        doc.setDrawColor(...tealColor)
        doc.setLineWidth(0.8)
        doc.line(lineStart, 6, lineEnd, 6)
        
        doc.setTextColor(255, 255, 255)
        doc.text('LIBRO MACCHINE', pageWidth / 2, 14, { align: 'center' })
        
        doc.line(lineStart, 18, lineEnd, 18)
        
        let y = 26
        
        if (logoBase64) {
          try {
            // Mantieni proporzioni logo (aspect ratio ~2.5:1)
            const logoWidth = 38
            const logoHeight = 15
            doc.addImage(logoBase64, 'WEBP', marginX, y - 2, logoWidth, logoHeight)
          } catch (e) {
            console.warn('Errore inserimento logo:', e)
          }
        }
        
        doc.setTextColor(...primaryColor)
        doc.setFontSize(12)
        doc.setFont('helvetica', 'bold')
        doc.text('ODONTO SERVICE S.R.L.', pageWidth / 2, y + 5, { align: 'center' })
        
        doc.setTextColor(...grayColor)
        doc.setFontSize(7)
        doc.setFont('helvetica', 'normal')
        doc.text('Viale Romagna, 248-250 - 48125 Lido di Savio (RA) | Tel. 0544 949554 | info@odontoservice.info | P.IVA IT00595400391', pageWidth / 2, y + 10, { align: 'center' })
        
        y = 42
        
        doc.setDrawColor(...primaryColor)
        doc.setLineWidth(0.4)
        doc.line(marginX, y, pageWidth - marginX, y)
        
        y = 47
        
        doc.setTextColor(0, 0, 0)
        doc.setFontSize(9)
        doc.setFont('helvetica', 'bold')
        doc.text('Studio Dentistico:', marginX, y)
        
        // Nome cliente in BLU - gestisce nomi lunghi
        doc.setTextColor(...primaryColor)
        doc.setFont('helvetica', 'bold')
        const maxWidth = pageWidth - marginX - 50
        const clienteWidth = doc.getTextWidth(clienteRagioneSociale)
        
        if (clienteWidth > maxWidth) {
          // Nome lungo: riduci font e vai a capo se necessario
          doc.setFontSize(8)
          const lines = doc.splitTextToSize(clienteRagioneSociale, maxWidth)
          doc.text(lines[0], marginX + 32, y)
          if (lines[1]) {
            y += 5
            doc.text(lines[1], marginX + 32, y)
          }
          doc.setFontSize(9)
          y += 7  // Più spazio dopo nome lungo su 2 righe
        } else {
          doc.text(clienteRagioneSociale, marginX + 32, y)
          y += 5
        }
        doc.setTextColor(0, 0, 0)
        doc.setFont('helvetica', 'bold')
        doc.text('Indirizzo:', marginX, y)
        doc.setFont('helvetica', 'normal')
        doc.text(clienteIndirizzo, marginX + 18, y)
        
        if (sedeLabel && sedeLabel !== clienteRagioneSociale) {
          y += 5
          doc.setFont('helvetica', 'bold')
          doc.text('Sede:', marginX, y)
          doc.setTextColor(...tealColor)
          doc.setFont('helvetica', 'bold')
          doc.text(sedeLabel, marginX + 12, y)
        }
      }

      drawHeader()

      // ===== TABELLA MACCHINARI =====
      // ✅ Funzione per normalizzare il testo (rimuove newline, spazi multipli, trim)
      const normalizeText = (text) => {
        if (!text) return ''
        return text
          .toString()
          .replace(/[\r\n]+/g, ' ')      // Sostituisce newline con spazio
          .replace(/\s+/g, ' ')            // Spazi multipli -> singolo spazio
          .trim()                           // Rimuove spazi iniziali/finali
      }
      
      const tableData = data.macchinari.map(m => {
        let dataInst = normalizeText(m.data_installazione)
        if (dataInst && dataInst.length >= 10) {
          try {
            const d = new Date(dataInst)
            dataInst = d.toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: '2-digit', 
              year: '2-digit' 
            })
          } catch (e) {}
        }
        
        return [
          normalizeText(m.num_libro_macchina),
          normalizeText(m.tipo_apparecchiatura),
          normalizeText(m.marca),
          normalizeText(m.modello),
          normalizeText(m.matricola),
          dataInst,
          normalizeText(m.manutenzione) || 'Si',
          normalizeText(m.tecn) || 'Si',
          normalizeText(m.ce) || 'Si'
        ]
      })

      const hasSede = sedeLabel && sedeLabel !== clienteRagioneSociale
      const clienteTextWidth = doc.getTextWidth(clienteRagioneSociale)
      const maxClienteWidth = pageWidth - marginX - 50
      const hasLongName = clienteTextWidth > maxClienteWidth
      
      // Calcola startY dinamico in base al contenuto header
      let startY = 58
      if (hasLongName) startY += 8
      if (hasSede) startY += 5

      autoTable(doc, {
        startY: startY,
        head: [[
          'N°', 
          'Tipo Apparecchiatura', 
          'Marca', 
          'Modello', 
          'N° Matricola', 
          'Data Inst.',
          'Manut.',
          'Tecn.',
          'CE'
        ]],
        body: tableData,
        theme: 'grid',
        styles: {
          fontSize: 8,
          cellPadding: 2,
          valign: 'middle',
          overflow: 'linebreak',
          lineWidth: 0.1,
          halign: 'left'
        },
        headStyles: {
          fillColor: darkBlue,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 8,
          halign: 'center',
          valign: 'middle',
          cellPadding: 3
        },
        bodyStyles: {
          halign: 'left',
          textColor: [31, 41, 55],
          minCellHeight: 7
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { halign: 'left', cellWidth: 42 },
          2: { halign: 'left', cellWidth: 38 },
          3: { halign: 'left', cellWidth: 65 },
          4: { halign: 'left', cellWidth: 38 },
          5: { halign: 'center', cellWidth: 22 },
          6: { halign: 'center', cellWidth: 18 },
          7: { halign: 'center', cellWidth: 18 },
          8: { halign: 'center', cellWidth: 18 }
        },
        alternateRowStyles: {
          fillColor: [249, 250, 251]
        },
        margin: { left: marginX, right: marginX, top: startY },
        
        didParseCell: function(hookData) {
          // Forza allineamento a sinistra per colonne testuali (1,2,3,4)
          if (hookData.section === 'body' && [1, 2, 3, 4].includes(hookData.column.index)) {
            hookData.cell.styles.halign = 'left'
          }
          // Colora Si/No in verde/rosso
          if (hookData.section === 'body' && [6, 7, 8].includes(hookData.column.index)) {
            const value = hookData.cell.raw?.toString().toLowerCase().trim()
            if (value === 'si' || value === 'sì') {
              hookData.cell.styles.textColor = greenColor
              hookData.cell.styles.fontStyle = 'bold'
            } else if (value === 'no') {
              hookData.cell.styles.textColor = redColor
              hookData.cell.styles.fontStyle = 'bold'
            }
          }
        },
        
        didDrawPage: function(hookData) {
          if (hookData.pageNumber > 1) {
            drawHeader()
          }
        }
      })

      // FOOTER
      const totalPages = doc.internal.getNumberOfPages()
      const now = new Date().toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(...grayColor)
        doc.text(
          `Documento generato il ${now} - Pagina ${i} di ${totalPages}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        )
      }

      // ✅ NOME FILE con sede
      const sanitizedName = (clienteNome || 'Cliente')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 40)
      
      const sanitizedSede = (sedeLabel || '')
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 20)
      
      const sedePartFilename = sanitizedSede ? `_sede_${sanitizedSede}` : ''
      const fileName = `Libro_Macchine_${sanitizedName}${sedePartFilename}_${new Date().toISOString().split('T')[0]}.pdf`
      
      doc.save(fileName)

    } catch (error) {
      console.error('Errore generazione PDF:', error)
      alert('Errore nella generazione del PDF: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // Varianti di rendering
  if (variant === 'icon') {
    return (
      <button
        onClick={generatePDF}
        disabled={loading}
        title="Stampa Libro Macchine"
        className={`p-2 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <FileText className="w-5 h-5" />
        )}
      </button>
    )
  }

  if (variant === 'full') {
    return (
      <button
        onClick={generatePDF}
        disabled={loading}
        className={`flex items-center justify-center gap-3 w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl ${className}`}
      >
        {loading ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-lg font-medium">Generazione in corso...</span>
          </>
        ) : (
          <>
            <FileText className="w-6 h-6" />
            <span className="text-lg font-medium">Stampa Libro Macchine</span>
          </>
        )}
      </button>
    )
  }

  return (
    <button
      onClick={generatePDF}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-sm font-medium ${className}`}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generazione...
        </>
      ) : (
        <>
          <FileText className="w-4 h-4" />
          Libro Macchine
        </>
      )}
    </button>
  )
}
