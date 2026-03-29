import { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  Plus, ChevronLeft, ChevronRight, X, Trash2, Info,
  Sun, Moon
} from 'lucide-react';
import useRoutineStore from '../store/routineStore';

const API = import.meta.env.VITE_SERVER_URL || 'http://localhost:3000';

/* ── Constants ── */
const HOUR_W = 80;
const TOTAL_W = 24 * HOUR_W;
const DAYS_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const PALETTE = [
  { bg:'#4f98a3', fg:'#fff', name:'Teal' },
  { bg:'#6daa45', fg:'#fff', name:'Green' },
  { bg:'#da7101', fg:'#fff', name:'Orange' },
  { bg:'#a12c7b', fg:'#fff', name:'Purple' },
  { bg:'#006494', fg:'#fff', name:'Blue' },
  { bg:'#d19900', fg:'#fff', name:'Gold' },
  { bg:'#a13544', fg:'#fff', name:'Red' },
  { bg:'#437a22', fg:'#fff', name:'Forest' },
];

/* ── Helpers ── */
function formatHour12(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h-12} PM`;
}
function decToTime(dec) {
  const h = Math.floor(dec), m = Math.round((dec-h)*60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}
function timeToDec(str) {
  const [h,m] = str.split(':').map(Number);
  return h + m/60;
}
function snapToHalf(val) { return Math.round(val * 2) / 2; }
function isToday(d) {
  const n = new Date();
  return d.getDate()===n.getDate() && d.getMonth()===n.getMonth() && d.getFullYear()===n.getFullYear();
}
function fmtDate(d) {
  return d.toLocaleDateString('en-IN', { day:'numeric', month:'short' });
}
function getWeekDates(off = 0) {
  const now = new Date();
  const diff = now.getDate() - now.getDay() + off * 7;
  return Array.from({length:7}, (_,i) => {
    const d = new Date(now); d.setDate(diff + i); d.setHours(0,0,0,0); return d;
  });
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════ */
export default function RoutinePlanner() {
  const { events, setEvents, addEvent, updateEvent, removeEvent } = useRoutineStore();
  const [weekOffset, setWeekOffset] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState(null);
  const [showTip, setShowTip] = useState(true);
  const [plannerTheme, setPlannerTheme] = useState('light');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDay, setFormDay] = useState(0);
  const [formStart, setFormStart] = useState('09:00');
  const [formEnd, setFormEnd] = useState('10:00');
  const [formNotes, setFormNotes] = useState('');
  const [selColor, setSelColor] = useState(PALETTE[0]);
  const [titleError, setTitleError] = useState(false);

  const scrollRef = useRef(null);

  /* ── Fetch events on mount ── */
  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get(`${API}/api/admin/routine`, { withCredentials: true });
        setEvents(res.data);
      } catch (err) {
        console.error('Failed to load routine events', err);
      }
    })();
  }, [setEvents]);

  /* ── Scroll to current time on mount ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!scrollRef.current) return;
      const now = new Date();
      scrollRef.current.scrollLeft = Math.max(0, (now.getHours() - 1.5) * HOUR_W);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  /* ── Current time line updater ── */
  const [nowPos, setNowPos] = useState(() => {
    const n = new Date(); return (n.getHours() + n.getMinutes()/60) * HOUR_W;
  });
  const [nowLabel, setNowLabel] = useState(() => {
    const n = new Date();
    return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
  });
  useEffect(() => {
    const id = setInterval(() => {
      const n = new Date();
      setNowPos((n.getHours() + n.getMinutes()/60) * HOUR_W);
      setNowLabel(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`);
    }, 60000);
    return () => clearInterval(id);
  }, []);

  /* ── Week label ── */
  const weekLabel = weekOffset === 0 ? 'This Week'
    : weekOffset === -1 ? 'Last Week'
    : weekOffset === 1 ? 'Next Week'
    : (() => { const ws = getWeekDates(weekOffset); return `${fmtDate(ws[0])} – ${fmtDate(ws[6])}`; })();

  /* ── Stats ── */
  const totalEvents = events.length;
  const totalHours = events.reduce((s, e) => s + (e.endH - e.startH), 0);
  const busiestDay = (() => {
    if (totalEvents === 0) return '—';
    const counts = Array(7).fill(0);
    events.forEach(e => counts[e.day]++);
    return DAYS_SHORT[counts.indexOf(Math.max(...counts))];
  })();

  /* ── Modal helpers ── */
  function openAdd(dayIdx, startH, endH) {
    setEditId(null);
    setFormTitle('');
    setFormDay(dayIdx);
    setFormStart(decToTime(startH));
    setFormEnd(decToTime(endH));
    setFormNotes('');
    setSelColor(PALETTE[events.length % PALETTE.length]);
    setTitleError(false);
    setShowModal(true);
  }

  function openEdit(ev) {
    setEditId(ev._id);
    setFormTitle(ev.title);
    setFormDay(ev.day);
    setFormStart(decToTime(ev.startH));
    setFormEnd(decToTime(ev.endH));
    setFormNotes(ev.notes || '');
    setSelColor(PALETTE.find(c => c.bg === ev.bg) || PALETTE[0]);
    setTitleError(false);
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditId(null);
    setTitleError(false);
  }

  async function handleSave() {
    const title = formTitle.trim();
    if (!title) { setTitleError(true); return; }
    setTitleError(false);

    let startH = timeToDec(formStart);
    let endH = timeToDec(formEnd);
    if (endH <= startH) endH = Math.min(startH + 1, 24);

    const payload = {
      title, day: formDay, startH, endH,
      notes: formNotes.trim(),
      bg: selColor.bg, fg: selColor.fg
    };

    try {
      if (editId) {
        const res = await axios.put(`${API}/api/admin/routine/${editId}`, payload, { withCredentials: true });
        updateEvent(editId, res.data);
        toast.success('Event updated');
      } else {
        const res = await axios.post(`${API}/api/admin/routine`, payload, { withCredentials: true });
        addEvent(res.data);
        toast.success('Event created');
      }
      closeModal();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save event');
    }
  }

  async function handleDelete() {
    if (!editId) return;
    try {
      await axios.delete(`${API}/api/admin/routine/${editId}`, { withCredentials: true });
      removeEvent(editId);
      toast.success('Event deleted');
      closeModal();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  }

  /* ──────────────────────────────────────────
     RENDER
  ────────────────────────────────────────── */
  const today = new Date();
  const weekDates = getWeekDates(weekOffset);

  return (
    <div className="h-full flex flex-col -m-6 md:-m-8" data-theme={plannerTheme}>
      <style>{plannerStyles}</style>

      {/* ── HEADER ── */}
      <header className="rp-header">
        <div className="rp-header-left">
          <div className="rp-day-name">{DAYS_FULL[today.getDay()]}</div>
          <div className="rp-full-date">
            {today.toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}
          </div>
        </div>
        <div className="rp-header-right">
          <button className="rp-btn rp-btn-primary" onClick={() => {
            openAdd(today.getDay(), today.getHours(), Math.min(today.getHours()+1, 24));
          }}>
            <Plus size={14} /> Add Event
          </button>
          <button className="rp-icon-btn" title="Toggle planner theme" onClick={() =>
            setPlannerTheme(t => t === 'dark' ? 'light' : 'dark')
          }>
            {plannerTheme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* ── STATS BAR ── */}
      <div className="rp-stats-bar">
        <div className="rp-stat">
          <div className="rp-stat-val">{totalEvents}</div>
          <div className="rp-stat-lbl">Events This Week</div>
        </div>
        <div className="rp-stat-sep" />
        <div className="rp-stat">
          <div className="rp-stat-val">{totalHours.toFixed(1)}h</div>
          <div className="rp-stat-lbl">Hours Planned</div>
        </div>
        <div className="rp-stat-sep" />
        <div className="rp-stat">
          <div className="rp-stat-val">{busiestDay}</div>
          <div className="rp-stat-lbl">Busiest Day</div>
        </div>
        <div className="rp-week-nav">
          <button className="rp-icon-btn" onClick={() => setWeekOffset(w => w-1)}><ChevronLeft size={14} /></button>
          <span className="rp-week-lbl">{weekLabel}</span>
          <button className="rp-icon-btn" onClick={() => setWeekOffset(w => w+1)}><ChevronRight size={14} /></button>
          <button className="rp-btn rp-btn-ghost rp-btn-sm" onClick={() => {
            setWeekOffset(0);
            setTimeout(() => {
              if (!scrollRef.current) return;
              const now = new Date();
              scrollRef.current.scrollLeft = Math.max(0, (now.getHours()-1.5)*HOUR_W);
            }, 80);
          }}>Today</button>
        </div>
      </div>

      {/* ── TIP BAR ── */}
      {showTip && (
        <div className="rp-tips-bar">
          <Info size={13} />
          <span>Click on the timeline to add an event · Drag edges to resize · Click an event to edit</span>
          <button className="rp-close-tip" onClick={() => setShowTip(false)}><X size={13} /></button>
        </div>
      )}

      {/* ── PLANNER GRID ── */}
      <div className="rp-planner-wrap">
        <div className="rp-planner-card">
          <div className="rp-planner-scroll" ref={scrollRef}>
            <div className="rp-planner-inner">
              {/* Time header */}
              <div className="rp-row rp-header-row">
                <div className="rp-day-col rp-corner">Day / Time</div>
                <div className="rp-timeline-col rp-header-timeline" style={{width:TOTAL_W}}>
                  {Array.from({length:24}, (_,h) => (
                    <div className="rp-hour-cell-header" key={h}>{formatHour12(h)}</div>
                  ))}
                </div>
              </div>

              {/* Day rows */}
              {weekDates.map((date, di) => (
                <DayRow
                  key={di}
                  dayIdx={di}
                  date={date}
                  isCurrentDay={isToday(date) && weekOffset === 0}
                  events={events.filter(e => e.day === di)}
                  nowPos={nowPos}
                  nowLabel={nowLabel}
                  weekOffset={weekOffset}
                  onClickGrid={(dayIdx, startH, endH) => openAdd(dayIdx, startH, endH)}
                  onClickEvent={(ev) => openEdit(ev)}
                  onUpdateEvent={async (id, data) => {
                    try {
                      const res = await axios.put(`${API}/api/admin/routine/${id}`, data, { withCredentials: true });
                      updateEvent(id, res.data);
                    } catch { /* silent – will get refreshed */ }
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="rp-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="rp-modal" onClick={e => e.stopPropagation()}>
            <div className="rp-modal-head">
              <h2 className="rp-modal-title">{editId ? 'Edit Event' : 'Add Event'}</h2>
              <button className="rp-icon-btn" onClick={closeModal}><X size={16} /></button>
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">Event Title <span style={{color:'var(--rp-error)'}}>*</span></label>
              <input
                className={`rp-form-input ${titleError ? 'rp-input-error' : ''}`}
                maxLength={60} placeholder="e.g. Morning Workout, Study Session…"
                value={formTitle} onChange={e => { setFormTitle(e.target.value); setTitleError(false); }}
                autoFocus
              />
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">Day</label>
              <select className="rp-form-input" value={formDay} onChange={e => setFormDay(Number(e.target.value))}>
                {DAYS_FULL.map((d,i) => <option key={i} value={i}>{d}</option>)}
              </select>
            </div>

            <div className="rp-form-grid">
              <div className="rp-form-group">
                <label className="rp-form-label">Start Time</label>
                <input type="time" className="rp-form-input" value={formStart} onChange={e => setFormStart(e.target.value)} />
              </div>
              <div className="rp-form-group">
                <label className="rp-form-label">End Time</label>
                <input type="time" className="rp-form-input" value={formEnd} onChange={e => setFormEnd(e.target.value)} />
              </div>
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">Notes <span className="rp-form-sublabel">(optional)</span></label>
              <input className="rp-form-input" maxLength={80} placeholder="Short description…"
                value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            </div>

            <div className="rp-form-group">
              <label className="rp-form-label">Color</label>
              <div className="rp-color-swatches">
                {PALETTE.map(c => (
                  <div
                    key={c.bg}
                    className={`rp-color-swatch ${selColor.bg === c.bg ? 'active' : ''}`}
                    style={{background:c.bg}} title={c.name}
                    onClick={() => setSelColor(c)}
                  />
                ))}
              </div>
            </div>

            <div className="rp-modal-footer">
              {editId && <button className="rp-btn rp-btn-danger" onClick={handleDelete}><Trash2 size={13} /> Delete</button>}
              <button className="rp-btn rp-btn-ghost" onClick={closeModal}>Cancel</button>
              <button className="rp-btn rp-btn-primary" onClick={handleSave}>
                {editId ? 'Update Event' : 'Save Event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   DAY ROW COMPONENT
═══════════════════════════════════════════ */
function DayRow({ dayIdx, date, isCurrentDay, events, nowPos, nowLabel, weekOffset,
                  onClickGrid, onClickEvent, onUpdateEvent }) {
  const gridRef = useRef(null);
  const [dragPreview, setDragPreview] = useState(null);
  const dragRef = useRef({ active: false, startX: 0 });

  const scrollContainer = useCallback(() => {
    return gridRef.current?.closest('.rp-planner-scroll');
  }, []);

  function getX(e) {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    const sc = scrollContainer();
    const scroll = sc ? sc.scrollLeft : 0;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return Math.max(0, Math.min(clientX - rect.left + scroll, TOTAL_W));
  }

  function handleGridDown(e) {
    if (e.target.closest('.rp-event-block')) return;
    const x = getX(e);
    dragRef.current = { active: true, startX: x };
    setDragPreview({ left: x, width: 2 });

    const onMove = (ev) => {
      if (!dragRef.current.active) return;
      const cx = getX(ev);
      const l = Math.min(dragRef.current.startX, cx);
      const w = Math.abs(cx - dragRef.current.startX);
      setDragPreview({ left: l, width: Math.max(w, 2) });
    };

    const onUp = (ev) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      setDragPreview(null);
      const endX = getX(ev);
      const rawStart = Math.min(dragRef.current.startX, endX) / HOUR_W;
      const rawEnd   = Math.max(dragRef.current.startX, endX) / HOUR_W;
      let startH = snapToHalf(rawStart);
      let endH   = snapToHalf(rawEnd);
      if (endH - startH < 0.5) endH = Math.min(startH + 1, 24);
      endH = Math.min(endH, 24);
      startH = Math.max(startH, 0);
      onClickGrid(dayIdx, startH, endH);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  }

  return (
    <div className={`rp-row ${isCurrentDay ? 'rp-is-today' : ''}`}>
      <div className="rp-day-col">
        <div className={`rp-day-name-text ${isCurrentDay ? 'today' : ''}`}>{DAYS_SHORT[dayIdx]}</div>
        <div className="rp-day-date-text">{fmtDate(date)}</div>
        {isCurrentDay && <div className="rp-today-dot" />}
      </div>
      <div className="rp-timeline-col">
        <div className="rp-day-grid" ref={gridRef} onMouseDown={handleGridDown}>
          {/* Grid lines */}
          <div className="rp-grid-lines">
            {Array.from({length:24}, (_,h) => <div className="rp-grid-hour" key={h} />)}
          </div>
          {/* Current time line */}
          {isCurrentDay && (
            <div className="rp-time-now-line" style={{left:nowPos}}>
              <div className="rp-time-now-dot" />
              <div className="rp-time-now-label">{nowLabel}</div>
            </div>
          )}
          {/* Drag preview */}
          {dragPreview && (
            <div className="rp-drag-preview" style={{left:dragPreview.left, width:dragPreview.width}} />
          )}
          {/* Events */}
          {events.map(ev => (
            <EventBlock key={ev._id} ev={ev} onClick={() => onClickEvent(ev)} onUpdate={onUpdateEvent}
                        getX={getX} scrollContainer={scrollContainer} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   EVENT BLOCK COMPONENT
═══════════════════════════════════════════ */
function EventBlock({ ev, onClick, onUpdate, getX, scrollContainer }) {
  const elRef = useRef(null);

  function handleMove(e) {
    if (e.target.dataset.resize) return;
    e.stopPropagation();
    const startMX = e.clientX;
    const origStart = ev.startH, origEnd = ev.endH;

    const el = elRef.current;
    if (el) { el.style.opacity = '0.75'; el.style.zIndex = '40'; }

    const onMouseMove = (ev2) => {
      const dH = (ev2.clientX - startMX) / HOUR_W;
      let ns = snapToHalf(origStart + dH);
      let ne = origEnd + (ns - origStart);
      ns = Math.max(0, Math.min(ns, 23.5));
      ne = Math.max(0.5, Math.min(ne, 24));
      if (ne - ns < 0.5) return;
      if (el) {
        el.style.left = (ns * HOUR_W) + 'px';
        const lbl = el.querySelector('.rp-event-time-lbl');
        if (lbl) lbl.textContent = `${decToTime(ns)} – ${decToTime(ne)}`;
      }
      ev._dragNS = ns; ev._dragNE = ne;
    };

    const onMouseUp = () => {
      if (el) { el.style.opacity = ''; el.style.zIndex = ''; }
      if (ev._dragNS != null) {
        onUpdate(ev._id, { startH: ev._dragNS, endH: ev._dragNE });
        delete ev._dragNS; delete ev._dragNE;
      }
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  function handleResize(e, side) {
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX;
    const origS = ev.startH, origE = ev.endH;
    const el = elRef.current;

    const onMove = (ev2) => {
      const dH = (ev2.clientX - startX) / HOUR_W;
      if (side === 'l') {
        let ns = snapToHalf(origS + dH);
        ns = Math.max(0, Math.min(ns, origE - 0.5));
        if (el) {
          el.style.left = (ns * HOUR_W) + 'px';
          el.style.width = Math.max((origE - ns) * HOUR_W - 2, 24) + 'px';
        }
        ev._resizeNS = ns;
      } else {
        let ne = snapToHalf(origE + dH);
        ne = Math.max(origS + 0.5, Math.min(ne, 24));
        if (el) el.style.width = Math.max((ne - origS) * HOUR_W - 2, 24) + 'px';
        ev._resizeNE = ne;
      }
      const lbl = el?.querySelector('.rp-event-time-lbl');
      if (lbl) {
        const s = ev._resizeNS ?? origS, en = ev._resizeNE ?? origE;
        lbl.textContent = `${decToTime(s)} – ${decToTime(en)}`;
      }
    };

    const onUp = () => {
      const data = {};
      if (ev._resizeNS != null) { data.startH = ev._resizeNS; delete ev._resizeNS; }
      if (ev._resizeNE != null) { data.endH = ev._resizeNE; delete ev._resizeNE; }
      if (Object.keys(data).length) onUpdate(ev._id, { ...data, startH: data.startH ?? origS, endH: data.endH ?? origE });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  const width = Math.max((ev.endH - ev.startH) * HOUR_W - 2, 24);

  return (
    <div
      ref={elRef}
      className="rp-event-block"
      style={{
        left: (ev.startH * HOUR_W) + 'px',
        width: width + 'px',
        background: ev.bg,
        color: ev.fg,
      }}
      onMouseDown={handleMove}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      <div className="rp-resize-handle rp-resize-handle-l" data-resize="l"
        onMouseDown={(e) => handleResize(e, 'l')} />
      <div className="rp-event-title">{ev.title}</div>
      <div className="rp-event-time-lbl">{decToTime(ev.startH)} – {decToTime(ev.endH)}</div>
      {ev.notes && <div className="rp-event-notes-lbl">{ev.notes}</div>}
      <div className="rp-resize-handle rp-resize-handle-r" data-resize="r"
        onMouseDown={(e) => handleResize(e, 'r')} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   SCOPED STYLES (injected via <style>)
═══════════════════════════════════════════ */
const plannerStyles = `
  /* Theme variables – scoped to the planner wrapper */
  [data-theme="light"] {
    --rp-bg: #f7f6f2; --rp-surface: #f9f8f5; --rp-surface-2: #fbfbf9;
    --rp-surface-offset: #f3f0ec; --rp-divider: #dcd9d5; --rp-border: #d4d1ca;
    --rp-text: #28251d; --rp-text-muted: #7a7974; --rp-text-faint: #bab9b4;
    --rp-primary: #01696f; --rp-primary-hover: #0c4e54;
    --rp-primary-hl: #cedcd8; --rp-error: #a12c7b;
    --rp-shadow-sm: 0 1px 2px rgba(40,37,29,0.06);
    --rp-shadow-md: 0 4px 12px rgba(40,37,29,0.08);
    --rp-shadow-lg: 0 12px 32px rgba(40,37,29,0.12);
  }
  [data-theme="dark"] {
    --rp-bg: #171614; --rp-surface: #1c1b19; --rp-surface-2: #201f1d;
    --rp-surface-offset: #1d1c1a; --rp-divider: #262523; --rp-border: #393836;
    --rp-text: #cdccca; --rp-text-muted: #797876; --rp-text-faint: #5a5957;
    --rp-primary: #4f98a3; --rp-primary-hover: #227f8b;
    --rp-primary-hl: #313b3b; --rp-error: #d163a7;
    --rp-shadow-sm: 0 1px 2px rgba(0,0,0,0.2);
    --rp-shadow-md: 0 4px 12px rgba(0,0,0,0.3);
    --rp-shadow-lg: 0 12px 32px rgba(0,0,0,0.4);
  }

  /* ── HEADER ── */
  .rp-header {
    position: sticky; top: 0; z-index: 200;
    background: var(--rp-surface); border-bottom: 1px solid var(--rp-border);
    padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
    box-shadow: var(--rp-shadow-sm);
  }
  .rp-header-left { display: flex; flex-direction: column; gap: 1px; }
  .rp-day-name { font-size: clamp(1.5rem,1.2rem+1.25vw,2.25rem); font-weight: 700; color: var(--rp-text); line-height: 1.1; letter-spacing: -0.02em; font-family: 'Satoshi','Inter',sans-serif; }
  .rp-full-date { font-size: clamp(0.75rem,0.7rem+0.25vw,0.875rem); color: var(--rp-text-muted); }
  .rp-header-right { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

  /* ── BUTTONS ── */
  .rp-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 500;
    cursor: pointer; border: none; transition: all 180ms cubic-bezier(.16,1,.3,1);
    font-family: 'Satoshi','Inter',sans-serif; white-space: nowrap;
  }
  .rp-btn-primary { background: var(--rp-primary); color: #fff; }
  .rp-btn-primary:hover { background: var(--rp-primary-hover); }
  .rp-btn-ghost { background: transparent; color: var(--rp-text-muted); border: 1px solid var(--rp-border); }
  .rp-btn-ghost:hover { background: var(--rp-surface-offset); color: var(--rp-text); }
  .rp-btn-danger { background: transparent; color: var(--rp-error); border: 1px solid var(--rp-error); }
  .rp-btn-danger:hover { background: var(--rp-error); color: #fff; }
  .rp-btn-sm { padding: 4px 12px; font-size: 12px; }

  .rp-icon-btn {
    width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--rp-border); color: var(--rp-text-muted); cursor: pointer; background: transparent;
    transition: all 180ms cubic-bezier(.16,1,.3,1);
  }
  .rp-icon-btn:hover { background: var(--rp-surface-offset); color: var(--rp-text); }

  /* ── STATS ── */
  .rp-stats-bar {
    display: flex; gap: 24px; padding: 12px 24px;
    background: var(--rp-surface-2); border-bottom: 1px solid var(--rp-border);
    align-items: center; flex-wrap: wrap;
  }
  .rp-stat { display: flex; flex-direction: column; gap: 1px; }
  .rp-stat-val { font-size: 16px; font-weight: 700; color: var(--rp-text); font-variant-numeric: tabular-nums; }
  .rp-stat-lbl { font-size: 12px; color: var(--rp-text-muted); }
  .rp-stat-sep { width: 1px; height: 28px; background: var(--rp-border); }
  .rp-week-nav { display: flex; align-items: center; gap: 8px; margin-left: auto; }
  .rp-week-lbl { font-size: 14px; font-weight: 500; color: var(--rp-text-muted); min-width: 90px; text-align: center; }

  /* ── TIP ── */
  .rp-tips-bar {
    display: flex; align-items: center; gap: 8px; padding: 8px 24px;
    background: color-mix(in srgb, var(--rp-primary) 8%, var(--rp-surface));
    border-bottom: 1px solid color-mix(in srgb, var(--rp-primary) 25%, var(--rp-bg));
    font-size: 12px; color: var(--rp-primary);
  }
  .rp-close-tip { margin-left: auto; opacity: .7; cursor: pointer; background: none; border: none; color: inherit; }
  .rp-close-tip:hover { opacity: 1; }

  /* ── PLANNER ── */
  .rp-planner-wrap { padding: 16px 24px 32px; flex: 1; min-height: 0; background: var(--rp-bg); }
  .rp-planner-card {
    background: var(--rp-surface); border: 1px solid var(--rp-border);
    border-radius: 16px; overflow: hidden; box-shadow: var(--rp-shadow-md);
  }
  .rp-planner-scroll {
    overflow-x: auto; overflow-y: visible; scrollbar-width: thin;
    scrollbar-color: var(--rp-border) transparent;
  }
  .rp-planner-scroll::-webkit-scrollbar { height: 6px; }
  .rp-planner-scroll::-webkit-scrollbar-thumb { background: var(--rp-border); border-radius: 3px; }

  /* ── ROWS ── */
  .rp-row { display: flex; align-items: stretch; border-bottom: 1px solid var(--rp-divider); }
  .rp-row:last-child { border-bottom: none; }
  .rp-header-row {
    position: sticky; top: 0; z-index: 100;
    background: var(--rp-surface-2); border-bottom: 2px solid var(--rp-border);
  }

  .rp-day-col {
    width: 110px; min-width: 110px; position: sticky; left: 0; z-index: 50;
    background: var(--rp-surface); border-right: 1px solid var(--rp-border);
    padding: 12px; display: flex; flex-direction: column; justify-content: center; gap: 3px;
  }
  .rp-corner {
    background: var(--rp-surface-2); font-size: 12px; font-weight: 600;
    color: var(--rp-text-muted); text-transform: uppercase; letter-spacing: 0.06em;
    z-index: 150;
  }

  .rp-day-name-text { font-size: 14px; font-weight: 700; color: var(--rp-text-muted); }
  .rp-day-name-text.today { color: var(--rp-primary); }
  .rp-day-date-text { font-size: 12px; color: var(--rp-text-faint); }
  .rp-today-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--rp-primary); margin-top: 2px; }
  .rp-is-today .rp-day-col { background: color-mix(in srgb, var(--rp-primary) 5%, var(--rp-surface)); }
  .rp-is-today { background: color-mix(in srgb, var(--rp-primary) 3%, var(--rp-surface)); }

  .rp-timeline-col { flex: 1; position: relative; min-height: 72px; }
  .rp-header-timeline { display: flex; height: 36px; min-height: 36px; align-items: stretch; }
  .rp-hour-cell-header {
    width: 80px; min-width: 80px; display: flex; align-items: center; justify-content: center;
    font-size: 11px; font-weight: 500; color: var(--rp-text-faint);
    border-right: 1px solid var(--rp-divider); user-select: none;
  }
  .rp-hour-cell-header:last-child { border-right: none; }

  .rp-day-grid { position: relative; width: ${TOTAL_W}px; height: 100%; min-height: 72px; cursor: crosshair; }
  .rp-grid-lines { position: absolute; inset: 0; pointer-events: none; display: flex; }
  .rp-grid-hour { width: 80px; min-width: 80px; height: 100%; border-right: 1px solid var(--rp-divider); position: relative; }
  .rp-grid-hour::after {
    content: ''; position: absolute; top: 0; bottom: 0; left: 40px; width: 1px;
    background: color-mix(in srgb, var(--rp-divider) 45%, transparent);
  }
  .rp-grid-hour:last-child { border-right: none; }

  /* Now line */
  .rp-time-now-line { position: absolute; top: 0; bottom: 0; width: 2px; background: #e53935; z-index: 30; pointer-events: none; transform: translateX(-1px); }
  .rp-time-now-dot { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); width: 8px; height: 8px; border-radius: 50%; background: #e53935; }
  .rp-time-now-label { position: absolute; top: 4px; left: 4px; background: #e53935; color: #fff; font-size: 9px; font-weight: 700; padding: 1px 4px; border-radius: 3px; white-space: nowrap; }

  /* Drag preview */
  .rp-drag-preview {
    position: absolute; top: 4px; bottom: 4px;
    background: color-mix(in srgb, var(--rp-primary) 20%, transparent);
    border: 2px dashed var(--rp-primary); border-radius: 6px;
    pointer-events: none; z-index: 25;
  }

  /* ── EVENT BLOCK ── */
  .rp-event-block {
    position: absolute; top: 5px; bottom: 5px; border-radius: 6px;
    padding: 3px 8px 3px 10px; font-size: 12px; font-weight: 500;
    overflow: hidden; cursor: grab; z-index: 10;
    display: flex; flex-direction: column; justify-content: center; gap: 1px;
    transition: box-shadow 180ms cubic-bezier(.16,1,.3,1), opacity 180ms;
    border: 1px solid rgba(255,255,255,0.15); user-select: none; min-width: 20px;
  }
  .rp-event-block:hover { box-shadow: var(--rp-shadow-md); }
  .rp-event-block:active { cursor: grabbing; }
  .rp-event-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; font-size: 12px; }
  .rp-event-time-lbl { font-size: 10px; opacity: .85; white-space: nowrap; }
  .rp-event-notes-lbl { font-size: 10px; opacity: .7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  .rp-resize-handle {
    position: absolute; top: 0; bottom: 0; width: 7px; cursor: ew-resize; z-index: 15;
  }
  .rp-resize-handle-l { left: 0; }
  .rp-resize-handle-r { right: 0; }
  .rp-resize-handle::after {
    content: ''; position: absolute; top: 50%; transform: translateY(-50%);
    width: 2px; height: 14px; border-radius: 2px; background: rgba(255,255,255,0.4);
  }
  .rp-resize-handle-l::after { left: 2px; }
  .rp-resize-handle-r::after { right: 2px; }

  /* ── MODAL ── */
  .rp-modal-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: rgba(0,0,0,0.45); backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center; padding: 16px;
  }
  .rp-modal {
    background: var(--rp-surface); border-radius: 16px; padding: 24px;
    width: min(500px, 100%); box-shadow: var(--rp-shadow-lg); border: 1px solid var(--rp-border);
    animation: rp-modal-in 200ms cubic-bezier(.16,1,.3,1);
  }
  @keyframes rp-modal-in { from { transform: scale(0.96) translateY(10px); opacity: 0; } }
  .rp-modal-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
  .rp-modal-title { font-size: 20px; font-weight: 700; color: var(--rp-text); }

  .rp-form-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
  .rp-form-label { font-size: 14px; font-weight: 500; color: var(--rp-text); }
  .rp-form-sublabel { font-size: 12px; color: var(--rp-text-muted); }
  .rp-form-input {
    padding: 12px 16px; border: 1px solid var(--rp-border); border-radius: 8px;
    background: var(--rp-surface-2); color: var(--rp-text); font-size: 14px;
    font-family: 'Satoshi','Inter',sans-serif; outline: none;
    transition: border-color 180ms, box-shadow 180ms;
  }
  .rp-form-input:focus { border-color: var(--rp-primary); box-shadow: 0 0 0 3px var(--rp-primary-hl); }
  .rp-input-error { border-color: var(--rp-error) !important; }
  .rp-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

  .rp-color-swatches { display: flex; gap: 8px; flex-wrap: wrap; }
  .rp-color-swatch {
    width: 30px; height: 30px; border-radius: 8px; cursor: pointer;
    border: 3px solid transparent; transition: all 180ms; flex-shrink: 0;
  }
  .rp-color-swatch.active { border-color: var(--rp-text); transform: scale(1.15); }

  .rp-modal-footer {
    display: flex; gap: 8px; justify-content: flex-end; align-items: center;
    padding-top: 16px; margin-top: 20px; border-top: 1px solid var(--rp-divider);
  }
  .rp-modal-footer .rp-btn-danger { margin-right: auto; }

  @media (max-width: 640px) {
    .rp-header { padding: 12px 16px; }
    .rp-stats-bar { padding: 8px 16px; gap: 16px; flex-direction: column; align-items: flex-start; }
    .rp-stat-sep { display: none; }
    .rp-planner-wrap { padding: 12px 12px 24px; }
    .rp-week-nav { margin-left: 0; }
  }
`;
