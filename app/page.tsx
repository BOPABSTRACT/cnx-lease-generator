'use client'

import { useState, useRef } from 'react'

const LOGO = "https://i.imgur.com/szjzoxt.png"

interface Lessor {
  index: number
  sheetName: string
  lessorName: string
  address: string
  county: string
  district: string
  grossAcres: string
  qlsNumber: string
  taxParcel: string
  relatedUnits: string
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [templateFiles, setTemplateFiles] = useState<File[]>([])
  const [lessors, setLessors] = useState<Lessor[]>([])
  const [selectedLessors, setSelectedLessors] = useState<Set<number>>(new Set())
  const [selectAll, setSelectAll] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [loadingLessors, setLoadingLessors] = useState(false)
  const excelRef = useRef<HTMLInputElement>(null)
  const templateRef = useRef<HTMLInputElement>(null)

  const handlePasswordSubmit = () => {
    if (passwordInput === 'BOP2026') {
      setAuthenticated(true)
      setPasswordError(false)
    } else {
      setPasswordError(true)
    }
  }

  const handleExcelChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setExcelFile(file)
    setLessors([])
    setSelectedLessors(new Set())
    setSelectAll(false)
    setLoadingLessors(true)

    const formData = new FormData()
    formData.append('excel', file)
    try {
      const res = await fetch('/api/lessors', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.lessors) {
        setLessors(data.lessors)
      }
    } catch {
      setMessage('Failed to read Excel file.')
      setStatus('error')
    } finally {
      setLoadingLessors(false)
    }
  }

  const handleTemplateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setTemplateFiles(files)
  }

  const toggleLessor = (index: number) => {
    const next = new Set(selectedLessors)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelectedLessors(next)
    setSelectAll(next.size === lessors.length)
  }

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedLessors(new Set())
      setSelectAll(false)
    } else {
      setSelectedLessors(new Set(lessors.map(l => l.index)))
      setSelectAll(true)
    }
  }

  const handleGenerate = async () => {
    if (!excelFile || templateFiles.length === 0) {
      setMessage('Please upload an Excel file and at least one template.')
      setStatus('error')
      return
    }
    if (selectedLessors.size === 0) {
      setMessage('Please select at least one lessor.')
      setStatus('error')
      return
    }

    setStatus('loading')
    const isAll = selectedLessors.size === lessors.length
    setMessage(`Generating ${selectedLessors.size} document${selectedLessors.size !== 1 ? 's' : ''}...`)

    const formData = new FormData()
    formData.append('excel', excelFile)
    templateFiles.forEach(f => formData.append('templates', f))
    formData.append('selectedSheets', isAll ? 'all' : Array.from(selectedLessors).join(','))

    try {
      const res = await fetch('/api/generate', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Generation failed')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `cnx-leases-${Date.now()}.zip`
      a.click()
      URL.revokeObjectURL(url)
      setStatus('done')
      setMessage(`✅ ${selectedLessors.size} document${selectedLessors.size !== 1 ? 's' : ''} generated and downloaded!`)
    } catch (err: unknown) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  if (!authenticated) {
    return (
      <main style={{
        minHeight: '100vh', background: '#0f1117',
        fontFamily: "'Georgia', serif", color: '#e8e0d0',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          background: '#0d0f14', border: '1px solid #2a2a3a',
          borderRadius: 12, padding: '48px 40px',
          width: '100%', maxWidth: 400, textAlign: 'center',
        }}>
          <img src={LOGO} alt="BOP Acquisition Logo"
            style={{ width: 120, height: 120, objectFit: 'contain', margin: '0 auto 24px', display: 'block' }} />
          <div style={{ fontSize: 20, fontWeight: 600, color: '#c8a96e', marginBottom: 4 }}>CNX LEASE GENERATOR</div>
          <div style={{ fontSize: 12, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 32 }}>
            BOP Acquisition
          </div>
          <input
            type="password" placeholder="Enter password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
            onKeyDown={e => e.key === 'Enter' && handlePasswordSubmit()}
            style={{
              width: '100%', padding: '12px 16px', background: '#0f1117',
              border: `1px solid ${passwordError ? '#8b2020' : '#2a2a3a'}`,
              borderRadius: 6, color: '#e8e0d0', fontSize: 15,
              fontFamily: "'Georgia', serif", boxSizing: 'border-box',
              marginBottom: 12, outline: 'none',
            }}
          />
          {passwordError && (
            <div style={{ color: '#e07070', fontSize: 13, marginBottom: 12 }}>
              Incorrect password. Please try again.
            </div>
          )}
          <button onClick={handlePasswordSubmit} style={{
            width: '100%', padding: '12px 32px',
            background: 'linear-gradient(135deg, #c8a96e, #8b6914)',
            color: '#fff', border: 'none', borderRadius: 6, fontSize: 15,
            fontFamily: "'Georgia', serif", cursor: 'pointer', letterSpacing: '0.04em',
          }}>Enter</button>
        </div>
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0f1117', fontFamily: "'Georgia', serif", color: '#e8e0d0' }}>
      <header style={{
        borderBottom: '1px solid #2a2a3a', padding: '16px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0d0f14',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <img src={LOGO} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain' }} />
          <div>
            <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: '0.04em', color: '#c8a96e' }}>CNX LEASE GENERATOR</div>
            <div style={{ fontSize: 11, color: '#666', letterSpacing: '0.12em', textTransform: 'uppercase' }}>BOP Acquisition</div>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 400, color: '#e8e0d0', margin: '0 0 10px 0' }}>Generate CNX Leases</h1>
          <p style={{ color: '#888', fontSize: 15, margin: 0, lineHeight: 1.6 }}>
            Upload your CNX Efforts Tracker spreadsheet and lease template(s). Select one lessor or all at once.
          </p>
        </div>

        {/* Step 1 — Excel */}
        <Section number="1" title="Upload CNX Efforts Tracker">
          <UploadBox
            label="Drop your .xlsx tracker file here or click to browse"
            accept=".xlsx,.xls" file={excelFile}
            onChange={handleExcelChange} inputRef={excelRef}
          />
          {loadingLessors && (
            <div style={{ marginTop: 12, color: '#888', fontSize: 13 }}>⏳ Reading lessor sheets...</div>
          )}
        </Section>

        {/* Step 2 — Select Lessors */}
        {lessors.length > 0 && (
          <Section number="2" title={`Select Lessor(s) — ${lessors.length} found`}>
            {/* Select All bar */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 16px', background: '#0d0f14',
              borderRadius: 6, marginBottom: 8, border: '1px solid #2a2a3a',
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, color: '#c8a96e' }}>
                <input type="checkbox" checked={selectAll} onChange={toggleSelectAll}
                  style={{ width: 16, height: 16, cursor: 'pointer' }} />
                Select All ({lessors.length} lessors)
              </label>
              <span style={{ fontSize: 12, color: '#666' }}>
                {selectedLessors.size} selected
              </span>
            </div>

            {/* Lessor list */}
            <div style={{
              maxHeight: 360, overflowY: 'auto',
              border: '1px solid #1e1e2e', borderRadius: 6,
            }}>
              {lessors.map((lessor, i) => (
                <div
                  key={lessor.index}
                  onClick={() => toggleLessor(lessor.index)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '12px 16px', cursor: 'pointer',
                    borderBottom: i < lessors.length - 1 ? '1px solid #1a1a2a' : 'none',
                    background: selectedLessors.has(lessor.index) ? 'rgba(200,169,110,0.06)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                >
                  <input type="checkbox" checked={selectedLessors.has(lessor.index)}
                    onChange={() => toggleLessor(lessor.index)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, color: '#e8e0d0', fontWeight: 500, marginBottom: 2 }}>
                      {lessor.lessorName || lessor.sheetName}
                    </div>
                    <div style={{ fontSize: 12, color: '#666', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {lessor.address && <span>{lessor.address}</span>}
                      {lessor.county && <span>{lessor.district} District, {lessor.county} Co.</span>}
                      {lessor.grossAcres && <span>{lessor.grossAcres} acres</span>}
                      {lessor.qlsNumber && <span>QLS: {lessor.qlsNumber}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Step 3 — Templates */}
        <Section number={lessors.length > 0 ? "3" : "2"} title="Upload Lease Template(s)">
          <UploadBox
            label="Drop your .docx template(s) here or click to browse"
            accept=".docx" file={templateFiles.length > 0 ? templateFiles[0] : null}
            extraFiles={templateFiles.slice(1)}
            onChange={handleTemplateChange} inputRef={templateRef} multiple
          />
        </Section>

        {/* Step 4 — Generate */}
        <Section number={lessors.length > 0 ? "4" : "3"} title="Generate Documents">
          <button
            onClick={handleGenerate}
            disabled={status === 'loading'}
            style={{
              width: '100%', padding: '16px 32px',
              background: status === 'loading' ? '#2a2a3a' : 'linear-gradient(135deg, #c8a96e, #8b6914)',
              color: status === 'loading' ? '#666' : '#fff',
              border: 'none', borderRadius: 6, fontSize: 16,
              fontFamily: "'Georgia', serif", letterSpacing: '0.04em',
              cursor: status === 'loading' ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            }}
          >
            {status === 'loading' ? '⏳ Generating...' : `⬇ Generate ${selectedLessors.size > 0 ? selectedLessors.size : ''} Document${selectedLessors.size !== 1 ? 's' : ''} & Download ZIP`}
          </button>

          {message && (
            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 6,
              background: status === 'error' ? 'rgba(200,60,60,0.1)' : 'rgba(60,180,100,0.1)',
              border: `1px solid ${status === 'error' ? '#8b2020' : '#2a6640'}`,
              color: status === 'error' ? '#e07070' : '#70c090', fontSize: 14,
            }}>
              {message}
            </div>
          )}
        </Section>

        {/* Merge fields reference */}
        <div style={{ marginTop: 32, padding: 24, background: '#0d0f14', borderRadius: 8, border: '1px solid #1e1e2e' }}>
          <div style={{ fontSize: 11, color: '#c8a96e', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
            Supported Merge Fields
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 24px' }}>
            {['«Lessor_Name»','«Lessor_Address»','«District»','«County»','«Gross_Acres»',
              '«Tax_Parcel»','«QLS_Number»','«Related_Units»','«Net_Acres»',
              '«Bonus_Amount»','«Bonus_Spelled_Out»','«Deed_Reference»','«Phone»'
            ].map(tag => (
              <span key={tag} style={{ fontSize: 12, color: '#666', fontFamily: 'monospace' }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(200,169,110,0.15)', border: '1px solid #c8a96e',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#c8a96e', fontWeight: 600, flexShrink: 0,
        }}>{number}</div>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 500, color: '#e8e0d0' }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function UploadBox({ label, accept, file, extraFiles = [], onChange, inputRef, multiple = false }: {
  label: string; accept: string; file: File | null; extraFiles?: File[];
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  inputRef: React.RefObject<HTMLInputElement>; multiple?: boolean;
}) {
  const allFiles = file ? [file, ...extraFiles] : []
  return (
    <div onClick={() => inputRef.current?.click()} style={{
      border: `2px dashed ${file ? '#c8a96e' : '#2a2a3a'}`,
      borderRadius: 8, padding: '28px 24px', textAlign: 'center',
      cursor: 'pointer', background: file ? 'rgba(200,169,110,0.04)' : '#0d0f14',
      transition: 'all 0.2s',
    }}>
      <input ref={inputRef} type="file" accept={accept} multiple={multiple}
        onChange={onChange} style={{ display: 'none' }} />
      {allFiles.length === 0 ? (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
          <div style={{ color: '#888', fontSize: 14 }}>{label}</div>
          <div style={{ color: '#555', fontSize: 12, marginTop: 4 }}>
            {accept.toUpperCase().replace(/\./g, '').replace(/,/g, ' / ')}
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'left' }}>
          {allFiles.map(f => (
            <div key={f.name} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 16 }}>✅</span>
              <span style={{ color: '#c8a96e', fontSize: 14 }}>{f.name}</span>
              <span style={{ color: '#555', fontSize: 12 }}>({(f.size / 1024).toFixed(1)} KB)</span>
            </div>
          ))}
          <div style={{ color: '#555', fontSize: 12, marginTop: 8 }}>Click to change</div>
        </div>
      )}
    </div>
  )
}
