import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('excel') as File
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer' })

    const lessors = workbook.SheetNames.map((name, index) => {
      const sheet = workbook.Sheets[name]
      const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as string[][]

      // Extract fields from the structured sheet layout
      const getValue = (rowIndex: number, colIndex: number): string => {
        const row = rows[rowIndex]
        if (!row) return ''
        return String(row[colIndex] ?? '').trim()
      }

      return {
        index,
        sheetName: name,
        lessorName: getValue(1, 1),       // Row 2, Col B
        address: getValue(2, 1),           // Row 3, Col B
        phone: getValue(3, 1),             // Row 4, Col B
        qlsNumber: getValue(7, 1),         // Row 8, Col B
        county: getValue(7, 4),            // Row 8, Col D (right side)
        district: getValue(8, 4),          // Row 9, Col D
        grossAcres: getValue(8, 1),        // Row 9, Col B
        taxParcel: getValue(9, 4),         // Row 10, Col D
        relatedUnits: getValue(9, 1),      // Row 10, Col B
      }
    })

    return NextResponse.json({ lessors })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
