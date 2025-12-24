import React, { useEffect, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import './prayer-journal.css';

/**
 * PrayerJournalEditable.tsx
 *
 * Editable version of the Prayer Journal page that matches the supplied design.
 * Features:
 * - Editable DATE field
 * - Ten editable text lines (textarea) with neon-pink checkboxes
 * - Save / Persist to localStorage automatically
 * - Download as a high-quality A4 PDF using html2canvas + jsPDF
 *
 * Install required packages:
 *   npm install html2canvas jspdf
 *
 * Fonts:
 * Add to your index.html <head>:
 * <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Dancing+Script:wght@400;700&display=swap" rel="stylesheet">
 *
 * Usage:
 *   import PrayerJournalEditable from './PrayerJournalEditable';
 *   <PrayerJournalEditable />
 */

const LINES = 10;
const STORAGE_KEY = 'pj-2024-answered-prayers-v1';

type SavedData = {
  date: string;
  lines: string[];
  checked: boolean[];
};

export default function PrayerJournalEditable(): JSX.Element {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [date, setDate] = useState<string>('');
  const [lines, setLines] = useState<string[]>(() => Array.from({ length: LINES }, () => ''));
  const [checked, setChecked] = useState<boolean[]>(() => Array.from({ length: LINES }, () => false));
  const [isSaving, setIsSaving] = useState(false);

  // Load saved data from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: SavedData = JSON.parse(raw);
        setDate(parsed.date || '');
        setLines((prev) => parsed.lines?.slice(0, LINES).concat(Array.from({ length: Math.max(0, LINES - (parsed.lines?.length || 0)) }, () => '')) || prev);
        setChecked((prev) => parsed.checked?.slice(0, LINES).concat(Array.from({ length: Math.max(0, LINES - (parsed.checked?.length || 0)) }, () => false)) || prev);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Auto-save to localStorage whenever state changes
  useEffect(() => {
    const payload: SavedData = { date, lines, checked };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [date, lines, checked]);

  const onChangeLine = (index: number, value: string) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const onToggleChecked = (index: number) => {
    setChecked((prev) => {
      const copy = [...prev];
      copy[index] = !copy[index];
      return copy;
    });
  };

  const clearAll = () => {
    if (!confirm('Clear all content for this page? This cannot be undone.')) return;
    setDate('');
    setLines(Array.from({ length: LINES }, () => ''));
    setChecked(Array.from({ length: LINES }, () => false));
    localStorage.removeItem(STORAGE_KEY);
  };

  // Helper: convert the sheet DOM into a PDF and trigger download
  const downloadAsPdf = async () => {
    if (!sheetRef.current) return;
    setIsSaving(true);
    try {
      // Temporarily remove focus outlines to get a clean capture
      const active = document.activeElement as HTMLElement | null;
      active?.blur();

      // Use html2canvas to rasterize the sheet. scale = 2 for better quality
      const canvas = await html2canvas(sheetRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null
      });

      const imgData = canvas.toDataURL('image/png');

      // Create a jsPDF A4 document (units: mm)
      const pdf = new jsPDF('p', 'mm', 'a4');

      // Compute image dimensions in mm to fit A4 width (210mm)
      const pdfWidth = 210;
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgProps = { width: canvasWidth, height: canvasHeight };
      const pdfHeight = (canvasHeight * pdfWidth) / canvasWidth;

      // If resulting height exceeds page height, scale by page height instead
      const pageHeight = 297;
      let finalWidth = pdfWidth;
      let finalHeight = pdfHeight;
      if (pdfHeight > pageHeight) {
        finalHeight = pageHeight;
        finalWidth = (canvasWidth * finalHeight) / canvasHeight;
        const xOffset = (pdfWidth - finalWidth) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, 0, finalWidth, finalHeight);
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
      }

      pdf.save(`PrayerJournal-AnsweredPrayers-${date || 'unspecified'}.pdf`);
    } catch (err) {
      console.error('PDF export error', err);
      alert('An error occurred while creating the PDF. See console for details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pj-page-wrap">
      <div className="pj-sheet" ref={sheetRef} id="pj-sheet-root">
        {/* Top-left decorative blob */}
        <svg className="pj-blob pj-blob-top-left" viewBox="0 0 200 200" preserveAspectRatio="none">
          <path fill="#FFB7D0" d="M43.7,-43.1C57.1,-30.8,71.3,-18.6,73.3,-4.6C75.2,9.4,65,25.6,52.5,36.7C40,47.8,25.3,53.7,9.4,58.7C-6.5,63.7,-23.7,67.8,-36.4,62.2C-49.1,56.7,-57.3,41.6,-63.8,25.6C-70.2,9.7,-74.8,-7.2,-68.6,-21.7C-62.4,-36.2,-45.5,-48.2,-28.5,-57.1C-11.5,-66,5.6,-71.7,20.7,-67.7C35.7,-63.8,49.8,-50.5,43.7,-43.1Z" transform="translate(100 100)" />
        </svg>

        {/* Header */}
        <header className="pj-header">
          <div className="pj-title-left">
            <div className="pj-prayer">PRAYER</div>
            <div className="pj-journal">journal</div>
            <div className="pj-sparkles" aria-hidden>
              <span className="sparkle s1" />
              <span className="sparkle s2" />
              <span className="sparkle s3" />
            </div>
          </div>

          <div className="pj-date-wrap">
            <div className="pj-date-label">DATE:</div>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="MM / DD / YYYY"
              className="pj-date-input"
            />
            <div className="pj-date-line" />
          </div>
        </header>

        <h2 className="pj-section-title">ANSWERED PRAYERS</h2>

        <main className="pj-rows">
          {Array.from({ length: LINES }).map((_, i) => (
            <div className="pj-row" key={i}>
              <label className="pj-checkbox" aria-label={`checkbox-line-${i}`}>
                <input
                  type="checkbox"
                  checked={checked[i]}
                  onChange={() => onToggleChecked(i)}
                />
                <span className="pj-checkbox-box" style={{ background: checked[i] ? 'rgba(255,0,204,0.1)' : 'transparent' }}>
                  {/* small inner indicator when checked */}
                  {checked[i] && <span className="pj-checkbox-dot" />}
                </span>
              </label>

              <div className="pj-underline-and-input">
                <textarea
                  className="pj-line-input"
                  value={lines[i]}
                  onChange={(e) => onChangeLine(i, e.target.value)}
                  placeholder={`Answered prayer ${i + 1}`}
                  rows={1}
                />
                <div className="pj-underline" />
              </div>
            </div>
          ))}
        </main>

        <div className="pj-right-accent">
          <div className="pj-cross-vertical" />
          <div className="pj-cross-horizontal" />
          <div className="pj-accent-circle" />
        </div>

        <svg className="pj-blob pj-blob-bottom-right" viewBox="0 0 200 200" preserveAspectRatio="none">
          <path fill="#FFB7D0" d="M35.7,-46.2C47.1,-39.6,60.6,-33.6,66.9,-23.4C73.1,-13.1,72.2,1.3,65.4,13.9C58.6,26.6,45.8,37.6,32.5,44.4C19.2,51.1,5.4,53.7,-8.1,56C-21.6,58.2,-35.6,60.1,-44.4,53.8C-53.2,47.6,-56.8,33.2,-61.6,19.7C-66.3,6.2,-72.2,-6.9,-66.2,-16.6C-60.2,-26.3,-42.2,-32.6,-27.9,-38.3C-13.5,-44.1,-6.7,-49.3,4.3,-55.3C15.3,-61.3,30.2,-72.8,35.7,-46.2Z" transform="translate(100 100)" />
        </svg>

        <svg className="pj-blob pj-blob-bottom-left" viewBox="0 0 400 120" preserveAspectRatio="none">
          <path fill="#FFD9E9" d="M34,60 C34,30 90,10 150,10 C200,10 260,25 320,10 C360,0 390,20 390,50 C390,85 360,110 310,110 L40,110 C20,110 10,90 34,60 Z" />
        </svg>
      </div>

      {/* Controls */}
      <div className="pj-controls">
        <button onClick={downloadAsPdf} className="pj-btn pj-btn-primary" disabled={isSaving}>
          {isSaving ? 'Preparing PDF...' : 'Download PDF'}
        </button>
        <button onClick={() => { alert('Your page is saved automatically in your browser storage.'); }} className="pj-btn">Saved in browser</button>
        <button onClick={clearAll} className="pj-btn pj-btn-danger">Clear</button>
      </div>
    </div>
  );
}
