import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import PizZip from 'pizzip'
import JSZip from 'jszip'

function extractSheetData(sheet: XLSX.WorkSheet) {
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]

  const getValue = (rowIndex: number, colIndex: number): string => {
    const row = rows[rowIndex]
    if (!row) return ''
    return String(row[colIndex] ?? '').trim()
  }

  return {
    Lessor_Name: getValue(1, 1),
    Lessor_Address: getValue(2, 1),
    Phone: getValue(3, 1),
    QLS_Number: getValue(7, 1),
    County: getValue(7, 4),
    District: getValue(8, 4),
    Gross_Acres: getValue(8, 1),
    Tax_Parcel: getValue(9, 4),
    Related_Units: getValue(9, 1),
    Bonus_Amount: '',
    Bonus_Spelled_Out: '',
    Net_Acres: '',
    Deed_Reference: '',
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function generateDocx(templateBuffer: Buffer, mergeData: Record<string, string>): Buffer {
  const zip = new PizZip(templateBuffer)
  const xmlFiles = [
    'word/document.xml', 'word/header1.xml', 'word/footer1.xml',
    'word/header2.xml', 'word/footer2.xml', 'word/header3.xml', 'word/footer3.xml'
  ]
  for (const xmlFile of xmlFiles) {
    try {
      let xml = zip.file(xmlFile)?.asText()
      if (!xml) continue
      for (const [tag, value] of Object.entries(mergeData)) {
        const escapedValue = escapeXml(value)
        xml = xml.split(`\u00ab${tag}\u00bb`).join(escapedValue)
        xml = xml.split(`&#xAB;${tag}&#xBB;`).join(escapedValue)
        xml = xml.split(`&#171;${tag}&#187;`).join(escapedValue)
      }
      zip.file(xmlFile, xml)
    } catch {
      // skip missing files
    }
  }
  return zip.generate({ type: 'nodebuffer', compression: 'DEFLATE' }) as Buffer
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_\-. ]/g, '_').trim()
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const excelFile = formData.get('excel') as File
    const templateFiles = formData.getAll('templates') as File[]
    const selectedSheets = formData.get('selectedSheets') as string

    if (!excelFile || templateFiles.length === 0) {
      return NextResponse.json({ error: 'Missing excel or template files' }, { status: 400 })
    }

    const sheetIndices: number[] = selectedSheets === 'all'
      ? []
      : selectedSheets.split(',').map(Number)

    const excelBuffer = Buffer.from(await excelFile.arrayBuffer())
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' })

    const sheetsToProcess = selectedSheets === 'all'
      ? workbook.SheetNames
      : sheetIndices.map(i => workbook.SheetNames[i]).filter(Boolean)

    if (sheetsToProcess.length === 0) {
      return NextResponse.json({ error: 'No sheets selected' }, { status: 400 })
    }

    const outputZip = new JSZip()

    for (let i = 0; i < sheetsToProcess.length; i++) {
      const sheetName = sheetsToProcess[i]
      const sheet = workbook.Sheets[sheetName]
      const mergeData = extractSheetData(sheet)

      const lessorSafe = sanitizeFilename(mergeData['Lessor_Name'] || sheetName)
      const baseName = `${String(i + 1).padStart(3, '0')}_${lessorSafe}`

      for (const templateFile of templateFiles) {
        const templateBuffer = Buffer.from(await templateFile.arrayBuffer())
        const templateName = templateFile.name.replace('.docx', '')

        let docxBuffer: Buffer
        try {
          docxBuffer = generateDocx(templateBuffer, mergeData)
        } catch (err) {
          return NextResponse.json(
            { error: `Failed to merge ${sheetName}: ${String(err)}` },
            { status: 500 }
          )
        }

        const filename = templateFiles.length > 1
          ? `${baseName}_${sanitizeFilename(templateName)}.docx`
          : `${baseName}.docx`

        outputZip.file(filename, docxBuffer)
      }
    }

    const zipArrayBuffer: ArrayBuffer = await outputZip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE'
    })

    return new NextResponse(zipArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="cnx-leases.zip"`,
      },
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
