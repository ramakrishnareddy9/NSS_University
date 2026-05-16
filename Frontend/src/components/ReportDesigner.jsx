import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

const MAX_IMAGES = 12;

/**
 * ReportDesigner
 * - Collects event data and images
 * - Renders a hidden HTML report preview (used to make an accurate PDF via html2canvas)
 * - Generates downloadable PDF via jsPDF and can pass the generated file upstream
 */
export default function ReportDesigner({ initialData = {}, onPdfGenerated }) {
  const [form, setForm] = useState({
    title: '',
    date: '',
    venue: '',
    coordinators: '',
    highlights: '',
    author: '',
    ...initialData
  });

  const [files, setFiles] = useState([]); // array of { name, dataUrl }
  const [generating, setGenerating] = useState(false);

  // reference to the printable preview element
  const previewRef = useRef(null);

  useEffect(() => {
    setForm((prev) => ({ ...prev, ...initialData }));
  }, [initialData]);

  // handle text inputs
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  // handle image upload
  function handleFilesChange(e) {
    const f = Array.from(e.target.files).slice(0, MAX_IMAGES);
    Promise.all(
      f.map((file) => {
        return new Promise((res, rej) => {
          const reader = new FileReader();
          reader.onload = (ev) => res({ name: file.name, dataUrl: ev.target.result });
          reader.onerror = (err) => rej(err);
          reader.readAsDataURL(file);
        });
      })
    )
      .then((arr) => setFiles(arr))
      .catch((err) => {
        console.error('file read error', err);
        alert('Error reading images');
      });
  }

  // helper: create PDF from preview using html2canvas -> jsPDF
  async function generatePdf() {
    try {
      setGenerating(true);

      const element = previewRef.current;
      if (!element) {
        throw new Error('Preview element not found');
      }

      // Use html2canvas to rasterize the HTML preview.
      // For better quality increase scale (e.g., 2 or 3). Beware memory limits.
      const scale = 2; // increase for higher quality
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      // Page sizing: A4 in points (jsPDF uses pt or mm - we use mm below)
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Canvas image in px
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Calculate rendered image width and height (in mm)
      const pxToMm = (px) => (px * 25.4) / (96 * scale); // 96 dpi assumed, compensate scale
      const imgWidthMm = pxToMm(canvas.width);
      const imgHeightMm = pxToMm(canvas.height);

      // If content height fits in single page -> add and save
      if (imgHeightMm <= pageHeight) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, (imgHeightMm / imgWidthMm) * pageWidth);
      } else {
        // Split into multiple pages: draw canvas into page-sized chunks
        // We'll slice the canvas vertically into pages
        const canvasPageHeightPx = Math.floor((pageHeight / pxToMm(1)) * scale * 96 / 25.4);
        let remainingHeightPx = canvas.height;
        let positionY = 0;

        while (remainingHeightPx > 0) {
          // create a temporary canvas for the slice
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          const sliceHeight = Math.min(canvasPageHeightPx, remainingHeightPx);
          sliceCanvas.height = sliceHeight;

          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(
            canvas,
            0,
            positionY,
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );

          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.95);

          // calculate height in mm for this slice
          const sliceHeightMm = pxToMm(sliceHeight);

          // add image to pdf
          pdf.addImage(sliceData, 'JPEG', 0, 0, pageWidth, (sliceHeightMm / pxToMm(canvas.width)) * pageWidth);

          remainingHeightPx -= sliceHeight;
          positionY += sliceHeight;

          if (remainingHeightPx > 0) {
            pdf.addPage();
          }
        }
      }

      // Download file
      const safeTitle = (form.title || 'nss_report').replace(/[^a-z0-9_-]/gi, '_');
      const fileName = `${safeTitle}.pdf`;
      pdf.save(fileName);

      if (onPdfGenerated) {
        try {
          const blob = pdf.output('blob');
          const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
          onPdfGenerated(pdfFile);
        } catch (blobErr) {
          console.warn('Unable to create PDF blob for upload:', blobErr);
        }
      }
    } catch (err) {
      console.error('PDF generation failed', err);
      alert('Failed to generate PDF. See console for details.');
    } finally {
      setGenerating(false);
    }
  }

  // small preview component render helper
  function renderPreviewHtml() {
    // This returns JSX used inside a hidden div for html2canvas capture
    // Keep styles inline or in a CSS class to ensure consistent rendering.
    return (
      <div
        ref={previewRef}
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '18mm',
          boxSizing: 'border-box',
          background: '#fff',
          color: '#222',
          fontFamily: 'Arial, Helvetica, sans-serif',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* left: first image treated as logo if present */}
          <div style={{ width: 90, height: 90 }}>
            {files[0] ? (
              <img
                src={files[0].dataUrl}
                alt="logo"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ width: '100%', height: '100%', background: '#f0f0f0' }} />
            )}
          </div>

          {/* title */}
          <div>
            <h1 style={{ margin: 0, fontSize: 22 }}>{form.title || 'NSS Event Report'}</h1>
            <div style={{ color: '#555', marginTop: 6 }}>
              <strong>Date:</strong> {form.date || '—'} &nbsp; | &nbsp;
              <strong>Venue:</strong> {form.venue || '—'}
            </div>
            <div style={{ color: '#555', marginTop: 6 }}>
              <strong>Coordinators:</strong> {form.coordinators || '—'}
            </div>
          </div>
        </div>

        {/* Executive summary */}
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Executive Summary</h2>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            {form.highlights || 'Summary of the event goes here. Provide a concise executive summary highlighting objectives, activities and outcomes.'}
          </p>
        </section>

        {/* Images grid (skip first if used as logo) */}
        <section style={{ marginTop: 18 }}>
          <h2 style={{ fontSize: 16, marginBottom: 6 }}>Event Photos</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {files.slice(1).length === 0 && files.length > 0 ? (
              // if only one image uploaded -> show it as photo
              <img
                src={files[0].dataUrl}
                alt="Event"
                style={{ width: '100%', maxHeight: 300, objectFit: 'cover' }}
              />
            ) : (
              files.slice(1).map((f, i) => (
                <div
                  key={i}
                  style={{
                    width: '48%',
                    border: '1px solid #eee',
                    padding: 6,
                    boxSizing: 'border-box'
                  }}
                >
                  <img
                    src={f.dataUrl}
                    alt={f.name}
                    style={{ width: '100%', height: 160, objectFit: 'cover' }}
                  />
                  <div style={{ fontSize: 12, color: '#444', marginTop: 6 }}>{f.name}</div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Footer / signatures */}
        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <strong>Outcomes & Recommendations</strong>
              <p style={{ marginTop: 6, lineHeight: 1.4 }}>
                List outcomes/recommendations here...
              </p>
            </div>
            <div style={{ textAlign: 'center', minWidth: 140 }}>
              <div style={{ height: 60 }} />
              <div style={{ borderTop: '1px solid #333', marginTop: 6, paddingTop: 6 }}>
                {form.author || 'Coordinator'}
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>Signature</div>
            </div>
          </div>
        </section>

        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 18,
            right: 18,
            fontSize: 10,
            color: '#666'
          }}
        >
          Generated by NSS Report Generator
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 960, margin: '18px auto', fontFamily: 'Segoe UI, Arial' }}>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>NSS PDF Report — jsPDF (client-side)</h2>

      <div style={{ display: 'grid', gap: 8 }}>
        <label style={{ display: 'grid', gap: 4 }}>
          <span>Event Title</span>
          <input name="title" value={form.title} onChange={handleChange} style={{ width: '100%', padding: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Date</span>
          <input type="date" name="date" value={form.date} onChange={handleChange} style={{ padding: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Venue</span>
          <input name="venue" value={form.venue} onChange={handleChange} style={{ width: '100%', padding: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Coordinators</span>
          <input name="coordinators" value={form.coordinators} onChange={handleChange} style={{ width: '100%', padding: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Highlights / Executive summary</span>
          <textarea
            name="highlights"
            value={form.highlights}
            onChange={handleChange}
            rows={4}
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Author (for signature block)</span>
          <input name="author" value={form.author} onChange={handleChange} style={{ width: '100%', padding: 8 }} />
        </label>

        <label style={{ display: 'grid', gap: 4 }}>
          <span>Upload images / logos (first image used as logo). Max 12 images.</span>
          <input type="file" accept="image/*" multiple onChange={handleFilesChange} />
        </label>

        <div>
          <button
            type="button"
            onClick={generatePdf}
            disabled={generating}
            style={{
              padding: '10px 16px',
              background: generating ? '#94a3b8' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: generating ? 'not-allowed' : 'pointer'
            }}
          >
            {generating ? 'Generating PDF...' : 'Generate & Download PDF'}
          </button>
          <span style={{ marginLeft: 12, color: '#666' }}>
            Note: the first image is used as logo in the header.
          </span>
        </div>

        {/* Optional: show thumbnails */}
        {files.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <strong>Uploaded images</strong>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
              {files.map((f, i) => (
                <div
                  key={i}
                  style={{ width: 90, height: 90, border: '1px solid #ddd', overflow: 'hidden' }}
                >
                  <img
                    src={f.dataUrl}
                    alt={f.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden preview used to rasterize PDF */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, visibility: 'hidden' }}>
        {renderPreviewHtml()}
      </div>
    </div>
  );
}


