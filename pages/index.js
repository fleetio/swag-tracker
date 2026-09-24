/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { collapseVariantOrders, defaultSourcingDate, getImageUrl, initialOrders, statuses, tags, withStageDates } from '../data/swagOrders';
import { signIn, useSession } from 'next-auth/react';

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
const legacyStorageKeys = ['fleetio-swag-tracker-state-fall-drop-v1', 'fleetio-swag-tracker-state'];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${value}T12:00:00`));
}

function formatLongDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  );
}

function localToday() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function totalCost(order) {
  if (Array.isArray(order.variants) && order.variants.length) {
    return order.variants.reduce((sum, variant) => sum + (Number(variant.quantity) || 0) * (Number(variant.unitCost) || 0), 0);
  }
  return (Number(order.quantity) || 0) * (Number(order.unitCost) || 0);
}

function orderCommitment(order) {
  return totalCost(order) + (Number(order.setupCost) || 0);
}

function displayUnitCost(order) {
  const costs = Array.isArray(order.variants) && order.variants.length
    ? order.variants.map((variant) => Number(variant.unitCost)).filter((cost) => Number.isFinite(cost))
    : [Number(order.unitCost) || 0];
  if (!costs.length) return 0;
  const sortedCosts = [...costs].sort((a, b) => a - b);
  const middle = Math.floor(sortedCosts.length / 2);
  return sortedCosts.length % 2 ? sortedCosts[middle] : (sortedCosts[middle - 1] + sortedCosts[middle]) / 2;
}

function stockValue(order) {
  if (Array.isArray(order.variants) && order.variants.length) {
    return order.variants.reduce((sum, variant) => sum + (Number(variant.stockOnHand) || 0) * (Number(variant.unitCost) || 0), 0);
  }
  return (Number(order.stockOnHand) || 0) * (Number(order.unitCost) || 0);
}

function arrivalDate(order) {
  return order.actualArrivalDate || order.estimatedArrivalDate;
}

function shipDate(order) {
  return order.actualShippedDate || order.estimatedShipDate;
}

function normalizeOrder(order) {
  const variants = Array.isArray(order.variants) ? order.variants.map((variant, index) => ({
    id: variant.id || `${order.id || 'swag'}-variant-${index}`,
    size: variant.size || 'One size',
    quantity: Number(variant.quantity) || 0,
    stockOnHand: variant.stockOnHand == null || variant.stockOnHand === '' ? null : Number(variant.stockOnHand),
    unitCost: Number(variant.unitCost) || 0,
  })) : [];
  const quantity = variants.length ? variants.reduce((sum, variant) => sum + variant.quantity, 0) : Number(order.quantity) || 0;
  const weightedCost = variants.reduce((sum, variant) => sum + variant.quantity * variant.unitCost, 0);
  return withStageDates({
    ...order,
    image: order.image || '',
    itemName: order.itemName || '',
    vendor: order.vendor || '',
    campaign: order.campaign || '',
    notes: order.notes || '',
    status: order.status || 'sourcing',
    category: order.category || '',
    size: order.size || '',
    color: order.color || '',
    tags: Array.isArray(order.tags) ? order.tags : [],
    quantity,
    unitCost: variants.length && quantity ? weightedCost / quantity : Number(order.unitCost) || 0,
    setupCost: Number(order.setupCost) || 0,
    variants,
    startDate: order.startDate || '',
    estimatedShipDate: order.estimatedShipDate || '',
    actualShippedDate: order.actualShippedDate || '',
    estimatedArrivalDate: order.estimatedArrivalDate || '',
    actualArrivalDate: order.actualArrivalDate || '',
  });
}

function costForTag(order, tag) {
  if (!order.tags.includes(tag)) return 0;
  if (order.tagAllocations?.[tag] != null) return orderCommitment(order) * order.tagAllocations[tag];
  return orderCommitment(order) / order.tags.length;
}

function statusInfo(status) {
  return statuses.find((item) => item.id === status) || statuses[0];
}

function ImageThumb({ order, size = 'regular', decorative = false }) {
  const [failed, setFailed] = useState(false);
  const imageUrl = getImageUrl(order.image);
  const sizeClass = size === 'small' ? 'image-thumb image-thumb-small' : size === 'drawer' ? 'image-thumb image-thumb-drawer' : 'image-thumb';
  return (
    <div className={sizeClass}>
      {!failed && imageUrl ? (
        <img
          src={imageUrl}
          alt={decorative ? '' : `${order.itemName} product`}
          referrerPolicy="no-referrer"
          loading={size === 'small' ? 'lazy' : 'eager'}
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        <span aria-hidden="true">{order.itemName.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

function StatusPill({ status }) {
  const info = statusInfo(status);
  return <span className={`status-pill status-${info.color}`}>{info.label}</span>;
}

function Tag({ children }) {
  return <span className="tag-pill">{children}</span>;
}

function Metric({ eyebrow, value, detail, tone = '' }) {
  return (
    <div className={`metric-card ${tone}`}>
      <p className="eyebrow-sm">{eyebrow}</p>
      <strong className="stat metric-value">{value}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Calendar({ orders, viewDate, onChangeMonth, onSelect }) {
  const calendarStart = new Date('2026-09-01T12:00:00');
  calendarStart.setFullYear(viewDate.getFullYear(), viewDate.getMonth(), 1);
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setDate(calendarStart.getDate() + index);
    return date;
  });
  return (
    <section className="panel calendar-panel" aria-labelledby="calendar-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow-sm">Estimated ship dates</p>
          <h2 id="calendar-heading">{new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(viewDate)}</h2>
        </div>
        <div className="calendar-controls"><button className="quiet-button" type="button" onClick={() => onChangeMonth(-1)} aria-label="Previous month">←</button><button className="quiet-button" type="button" onClick={() => onChangeMonth(0)}>Today</button><button className="quiet-button" type="button" onClick={() => onChangeMonth(1)} aria-label="Next month">→</button></div>
      </div>
      {!orders.length && <p className="empty-state">No matching ship dates in this view.</p>}
      <div className="calendar-grid calendar-weekdays" aria-hidden="true">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <span key={day}>{day}</span>)}
      </div>
      <div className="calendar-grid calendar-days">
        {calendarDays.map((day) => {
          const isOutsideMonth = day.getFullYear() !== viewDate.getFullYear() || day.getMonth() !== viewDate.getMonth();
          const dateKey = day.toISOString().slice(0, 10);
          const dayOrders = isOutsideMonth ? [] : orders.filter((order) => shipDate(order) === dateKey);
          return (
            <div className={`calendar-day ${isOutsideMonth ? 'calendar-day-muted' : ''}`} key={dateKey}>
              <span className="day-number">{day.getDate()}</span>
              <div className="calendar-events">
                {dayOrders.map((order) => (
                  <button className="calendar-event" key={order.id} type="button" onClick={() => onSelect(order)} aria-label={`Open ${order.itemName} ship date ${formatLongDate(dateKey)}`}>
                    <span className={`event-dot dot-${statusInfo(order.status).color}`} />
                    <span>{order.itemName} · {currency.format(displayUnitCost(order))} each</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function StatusBoard({ orders, onSelect, onStatusChange }) {
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverStatus, setDragOverStatus] = useState(null);
  const [announcement, setAnnouncement] = useState('');

  function startDragging(event, order) {
    event.dataTransfer.setData('text/plain', order.id);
    event.dataTransfer.effectAllowed = 'move';
    setDraggingId(order.id);
  }

  function finishDragging() {
    setDraggingId(null);
    setDragOverStatus(null);
  }

  function dropOrder(event, statusId) {
    event.preventDefault();
    const orderId = event.dataTransfer.getData('text/plain');
    const order = orders.find((item) => item.id === orderId);
    if (order) {
      onStatusChange(orderId, statusId);
      setAnnouncement(`${order.itemName} moved to ${statusInfo(statusId).label}.`);
    }
    finishDragging();
  }

  function moveWithKeyboard(event, order) {
    const currentIndex = statuses.findIndex((status) => status.id === order.status);
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    const nextStatus = direction ? statuses[currentIndex + direction] : null;
    if (!nextStatus) return;
    event.preventDefault();
    onStatusChange(order.id, nextStatus.id);
    setAnnouncement(`${order.itemName} moved to ${nextStatus.label}.`);
  }

  return (
    <section className="panel board-panel" aria-labelledby="board-heading">
      <div className="section-heading">
        <div><p className="eyebrow-sm">Workflow view</p><h2 id="board-heading">Status board</h2></div>
        <span className="muted-text" id="board-instructions">Drag cards between columns. Use left/right arrows on a focused card or the details drawer on touch devices.</span>
      </div>
      <div className="status-board">
        {statuses.map((status) => {
          const statusOrders = orders.filter((order) => order.status === status.id);
          return (
            <div className={`status-column ${dragOverStatus === status.id ? 'status-column-drop-target' : ''}`} key={status.id} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDragOverStatus(status.id); }} onDragLeave={() => setDragOverStatus(null)} onDrop={(event) => dropOrder(event, status.id)} role="region" aria-label={`${status.label} drop zone`}>
              <div className="status-column-heading"><span><i className={`legend-dot dot-${status.color}`} />{status.label}</span><strong>{statusOrders.length}</strong></div>
              <div className="status-column-items">
                {statusOrders.map((order) => (
                  <button className={`board-card ${draggingId === order.id ? 'board-card-dragging' : ''}`} key={order.id} type="button" draggable="true" onDragStart={(event) => startDragging(event, order)} onDragEnd={finishDragging} onKeyDown={(event) => moveWithKeyboard(event, order)} onClick={() => onSelect(order)} aria-describedby="board-instructions" aria-keyshortcuts="ArrowLeft ArrowRight" aria-label={`${order.itemName}, ${status.label}. Drag to move status or click to open details.`}>
                    <ImageThumb key={`${order.id}-${order.image}`} order={order} size="small" decorative />
                    <span className="board-card-copy"><strong>{order.itemName}</strong><small>{order.quantity} units · {currency.format(displayUnitCost(order))} each · {formatDate(shipDate(order))}</small><span className="tag-list">{order.tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}</span></span>
                  </button>
                ))}
                {!statusOrders.length && <p className="empty-column">Nothing here yet.</p>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </section>
  );
}

function Timeline({ orders, viewDate, onSelect }) {
  const timelineStartDate = new Date(viewDate);
  timelineStartDate.setDate(1);
  const timelineEndDate = new Date(viewDate);
  timelineEndDate.setMonth(timelineEndDate.getMonth() + 2, 0);
  const timelineStart = timelineStartDate.getTime();
  const timelineEnd = timelineEndDate.getTime();
  const totalDays = (timelineEnd - timelineStart) / 86400000;
  const getPosition = (date) => `${Math.max(0, Math.min(100, ((new Date(`${date}T12:00:00`).getTime() - timelineStart) / 86400000 / totalDays) * 100))}%`;
  const today = new Date();
  const todayPosition = getPosition(today.toISOString().slice(0, 10));
  const nextMonth = new Date(viewDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const monthLabel = (date) => new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date);

  return (
    <section className="panel timeline-panel" aria-labelledby="timeline-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow-sm">Production flow</p>
          <h2 id="timeline-heading">In-flight timeline</h2>
        </div>
        <div className="timeline-legend">
          {statuses.map((status) => <span key={status.id}><i className={`legend-dot dot-${status.color}`} />{status.label}</span>)}
        </div>
      </div>
      {orders.length ? <div className="timeline-scroll">
        <div className="timeline-head">
          <span>Item</span>
          <div className="timeline-months"><span>{monthLabel(viewDate)}</span><span>{monthLabel(nextMonth)}</span></div>
        </div>
        <div className="timeline-body">
          {orders.map((order) => {
            const segments = Object.entries(order.stageDates).filter(([, dates]) => dates.start && dates.end).map(([stage, dates]) => ({ stage, left: getPosition(dates.start), width: `max(1.5rem, calc(${getPosition(dates.end)} - ${getPosition(dates.start)}))` }));
            return (
              <div className="timeline-row" key={order.id}>
                <button className="timeline-name" type="button" onClick={() => onSelect(order)} aria-label={`Open ${order.itemName} details`}><ImageThumb key={`${order.id}-${order.image}`} order={order} size="small" decorative /><span className="timeline-name-copy"><strong>{order.itemName}</strong><small>{currency.format(displayUnitCost(order))} each</small></span></button>
                <button className="timeline-track" type="button" onClick={() => onSelect(order)} aria-label={`Open ${order.itemName} timeline`}>
                  {segments.map((segment) => <span className={`timeline-segment segment-${segment.stage}`} key={segment.stage} style={{ left: segment.left, width: segment.width }} title={`${segment.stage}: ${formatDate(order.stageDates[segment.stage].start)} to ${formatDate(order.stageDates[segment.stage].end)}`} />)}
                  {!segments.length && <span className="timeline-tbd">Dates needed</span>}
                  {segments.length > 0 && todayPosition !== '0%' && todayPosition !== '100%' && <span className="today-line" style={{ left: todayPosition }}><span>Today</span></span>}
                </button>
              </div>
            );
          })}
        </div>
      </div> : <p className="empty-state">No matching timeline items in this view.</p>}
    </section>
  );
}

function OrderTable({ orders, onSelect }) {
  return (
    <section className="panel table-panel" aria-labelledby="orders-heading">
      <div className="section-heading">
        <div><p className="eyebrow-sm">Order register</p><h2 id="orders-heading">All swag orders</h2></div>
        <span className="muted-text">{orders.length} items</span>
      </div>
      {orders.length ? <div className="table-wrap">
        <table>
          <thead><tr><th scope="col">Item</th><th scope="col">Status</th><th scope="col">Tags</th><th scope="col">Ship date</th><th scope="col">Qty</th><th scope="col">Unit cost</th><th scope="col" className="align-right">Value</th></tr></thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td><button className="table-item-button" type="button" onClick={() => onSelect(order)}><span className="table-item"><ImageThumb key={`${order.id}-${order.image}`} order={order} size="small" decorative /><span><strong>{order.itemName}</strong><small>{order.vendor}</small></span></span></button></td>
                <td><StatusPill status={order.status} /></td>
                <td><div className="tag-list">{order.tags.slice(0, 2).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></td>
                <td>{formatDate(shipDate(order))}</td>
                <td>{order.quantity}</td>
                <td>{currency.format(displayUnitCost(order))} each</td>
                <td className="align-right"><strong>{currency.format(orderCommitment(order))}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> : <p className="empty-state">No matching swag orders in this view.</p>}
    </section>
  );
}

function editableVariants(order) {
  if (Array.isArray(order.variants) && order.variants.length) {
    return order.variants.map((variant, index) => ({ ...variant, id: variant.id || `${order.id}-variant-${index}` }));
  }
  return [{ id: `${order.id}-variant-0`, size: order.size || 'One size', quantity: order.quantity || 0, stockOnHand: order.stockOnHand ?? null, unitCost: order.unitCost || 0 }];
}

function createDrawerDraft(order) {
  return order ? { ...order, tags: [...order.tags], variants: editableVariants(order) } : null;
}

function OrderDrawer({ order, onClose, onStatusChange, onSave, onDelete, availableTags = [], onAddTag }) {
  const drawerRef = useRef(null);
  const closeButtonRef = useRef(null);
  const editButtonRef = useRef(null);
  const editFormRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const confirmDeleteButtonRef = useRef(null);
  const [isDeleteConfirming, setIsDeleteConfirming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [draft, setDraft] = useState(() => createDrawerDraft(order));

  function cancelDeleteConfirmation() {
    setIsDeleteConfirming(false);
    requestAnimationFrame(() => deleteButtonRef.current?.focus());
  }

  function cancelEditing() {
    setIsEditing(false);
    setDraft(createDrawerDraft(order));
    setNewTag('');
    requestAnimationFrame(() => editButtonRef.current?.focus());
  }

  useEffect(() => {
    if (isDeleteConfirming) confirmDeleteButtonRef.current?.focus();
  }, [isDeleteConfirming]);

  useEffect(() => {
    if (isEditing) editFormRef.current?.querySelector('input, select, textarea')?.focus();
  }, [isEditing]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!order) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (isDeleteConfirming) {
          cancelDeleteConfirmation();
          return;
        }
        if (isEditing) {
          setIsEditing(false);
          setDraft(createDrawerDraft(order));
          setNewTag('');
          requestAnimationFrame(() => editButtonRef.current?.focus());
          return;
        }
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = drawerRef.current.querySelectorAll('button, select, input, a[href]');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDeleteConfirming, isEditing, onClose, order]);

  if (!order) return null;
  const draftTags = Array.isArray(draft.tags) ? draft.tags : [];
  const tagOptions = [...new Set([...availableTags, ...draftTags])];
  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const updateVariant = (index, field, value) => setDraft((current) => ({ ...current, variants: current.variants.map((variant, variantIndex) => variantIndex === index ? { ...variant, [field]: value } : variant) }));
  const changeStatus = (event) => {
    const nextStatus = event.target.value;
    const today = localToday();
    const actualShippedDate = nextStatus === 'shipped' && !order.actualShippedDate ? today : order.actualShippedDate;
    const actualArrivalDate = nextStatus === 'stock' && !order.actualArrivalDate ? today : order.actualArrivalDate;
    onStatusChange(order.id, nextStatus);
    setDraft((current) => ({ ...current, status: nextStatus, actualShippedDate, actualArrivalDate }));
  };
  const addVariant = () => setDraft((current) => ({ ...current, variants: [...current.variants, { id: `${current.id}-variant-${Date.now()}`, size: '', quantity: 0, stockOnHand: null, unitCost: current.unitCost || 0 }] }));
  const removeVariant = (index) => setDraft((current) => ({ ...current, variants: current.variants.length > 1 ? current.variants.filter((_, variantIndex) => variantIndex !== index) : current.variants }));
  const toggleTag = (tag) => setDraft((current) => ({ ...current, tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag] }));
  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    const canonicalTag = availableTags.find((item) => item.toLowerCase() === tag.toLowerCase()) || tag;
    onAddTag(canonicalTag);
    setDraft((current) => ({ ...current, tags: current.tags.includes(canonicalTag) ? current.tags : [...current.tags, canonicalTag] }));
    setNewTag('');
  };
  const submitEdit = (event) => {
    event.preventDefault();
    onSave({ ...draft, variants: draft.variants.map((variant) => ({ ...variant, quantity: Number(variant.quantity) || 0, stockOnHand: variant.stockOnHand === '' || variant.stockOnHand == null ? null : Number(variant.stockOnHand), unitCost: Number(variant.unitCost) || 0 })) });
    setIsEditing(false);
  };
  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="drawer" ref={drawerRef} aria-labelledby="drawer-heading" role="dialog" aria-modal="true">
        <div className="drawer-header"><span className="eyebrow-sm">Order details</span><button className="close-button" ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close order details">×</button></div>
        <ImageThumb key={`${order.id}-${order.image}`} order={order} size="drawer" />
        <h2 id="drawer-heading">{isEditing ? 'Edit item details' : order.itemName}</h2>
        {isEditing ? <form className="drawer-edit-form" ref={editFormRef} onSubmit={submitEdit}>
          <div className="drawer-edit-grid"><div><label className="eyebrow-sm form-label" htmlFor="drawer-item-name">Item name</label><input id="drawer-item-name" className="form-input" value={draft.itemName} onChange={(event) => updateDraft('itemName', event.target.value)} required /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-status">Status</label><select id="drawer-status" className="form-input" value={draft.status} onChange={(event) => updateDraft('status', event.target.value)}>{statuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-image">Image filename or path</label><input id="drawer-image" className="form-input" value={draft.image} onChange={(event) => updateDraft('image', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-category">Category</label><input id="drawer-category" className="form-input" value={draft.category} onChange={(event) => updateDraft('category', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-color">Color</label><input id="drawer-color" className="form-input" value={draft.color} onChange={(event) => updateDraft('color', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-vendor">Vendor / company</label><input id="drawer-vendor" className="form-input" value={draft.vendor} onChange={(event) => updateDraft('vendor', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-campaign">Campaign</label><input id="drawer-campaign" className="form-input" value={draft.campaign} onChange={(event) => updateDraft('campaign', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-setup-cost">Setup cost</label><input id="drawer-setup-cost" className="form-input" type="number" min="0" step="0.01" value={draft.setupCost || 0} onChange={(event) => updateDraft('setupCost', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-start-date">Production started</label><input id="drawer-start-date" className="form-input" type="date" value={draft.startDate} onChange={(event) => updateDraft('startDate', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-ship-date">Estimated ship</label><input id="drawer-ship-date" className="form-input" type="date" min={draft.startDate || undefined} value={draft.estimatedShipDate} onChange={(event) => updateDraft('estimatedShipDate', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-actual-shipped-date">Actual shipped</label><input id="drawer-actual-shipped-date" className="form-input" type="date" min={draft.startDate || undefined} value={draft.actualShippedDate} onChange={(event) => updateDraft('actualShippedDate', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-arrival-date">Estimated arrival</label><input id="drawer-arrival-date" className="form-input" type="date" min={draft.actualShippedDate || draft.estimatedShipDate || undefined} value={draft.estimatedArrivalDate} onChange={(event) => updateDraft('estimatedArrivalDate', event.target.value)} /></div><div><label className="eyebrow-sm form-label" htmlFor="drawer-actual-arrival">Actual arrival</label><input id="drawer-actual-arrival" className="form-input" type="date" min={draft.actualShippedDate || draft.estimatedShipDate || undefined} value={draft.actualArrivalDate} onChange={(event) => updateDraft('actualArrivalDate', event.target.value)} /></div></div>
          <fieldset className="drawer-variant-fieldset"><legend className="eyebrow-sm form-label">Sizes and costs</legend><div className="drawer-variant-list">{draft.variants.map((variant, index) => <div className="drawer-variant-row" key={variant.id || `variant-${index}`}><input className="form-input" aria-label={`Size ${index + 1}`} value={variant.size} onChange={(event) => updateVariant(index, 'size', event.target.value)} placeholder="Size" /><input className="form-input" aria-label={`Quantity for size ${index + 1}`} type="number" min="0" step="1" value={variant.quantity} onChange={(event) => updateVariant(index, 'quantity', event.target.value)} placeholder="Qty" /><input className="form-input" aria-label={`Unit cost for size ${index + 1}`} type="number" min="0" step="0.01" value={variant.unitCost} onChange={(event) => updateVariant(index, 'unitCost', event.target.value)} placeholder="Unit cost" /><input className="form-input" aria-label={`Stock for size ${index + 1}`} type="number" min="0" step="1" value={variant.stockOnHand ?? ''} onChange={(event) => updateVariant(index, 'stockOnHand', event.target.value)} placeholder="Stock" /><button className="close-button" type="button" onClick={() => removeVariant(index)} aria-label={`Remove size ${variant.size || index + 1}`}>×</button></div>)}</div><button className="secondary-button" type="button" onClick={addVariant}>Add size</button></fieldset>
          <fieldset className="tag-fieldset"><legend className="eyebrow-sm form-label">Tags</legend><div className="tag-checkboxes">{tagOptions.map((tag) => <label className="checkbox-option" key={tag}><input type="checkbox" checked={draftTags.includes(tag)} onChange={() => toggleTag(tag)} />{tag}</label>)}</div><div className="new-tag-row"><label className="sr-only" htmlFor="drawer-new-tag">New tag name</label><input id="drawer-new-tag" className="form-input" value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Create a new tag" /><button className="secondary-button" type="button" onClick={addTag}>Add tag</button></div></fieldset>
          <div><label className="eyebrow-sm form-label" htmlFor="drawer-notes">Notes</label><textarea id="drawer-notes" className="form-input form-textarea" value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} rows="3" /></div><div className="modal-actions"><button className="secondary-button" type="button" onClick={cancelEditing}>Cancel</button><button className="primary-button" type="submit">Save changes</button></div>
        </form> : <>
          <p className="muted-text">{order.campaign} · {order.vendor}</p>
          <div className="drawer-field"><label htmlFor="order-status">Current status</label><select id="order-status" value={order.status} onChange={changeStatus}>{statuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select><button className="secondary-button full-width-button" ref={editButtonRef} type="button" onClick={() => setIsEditing(true)}>Edit item details</button></div>
          <div className="detail-grid"><div><span className="eyebrow-sm">Quantity</span><strong>{order.quantity}</strong></div><div><span className="eyebrow-sm">Unit cost{order.variants?.length > 1 ? ' (median)' : ''}</span><strong>{currency.format(displayUnitCost(order))}</strong></div><div><span className="eyebrow-sm">Product value</span><strong>{currency.format(totalCost(order))}</strong></div><div><span className="eyebrow-sm">Setup cost</span><strong>{currency.format(order.setupCost || 0)}</strong></div><div><span className="eyebrow-sm">Order value</span><strong>{currency.format(orderCommitment(order))}</strong></div></div>
          {order.variants?.length > 1 && <div className="detail-block"><span className="eyebrow-sm">Sizes</span><div className="variant-summary">{order.variants.map((variant) => <div key={variant.size}><strong>{variant.size}</strong><span>{variant.quantity} units · {currency.format(variant.unitCost)} each{variant.stockOnHand == null ? '' : ` · ${variant.stockOnHand} in stock`}</span></div>)}</div></div>}
          <div className="detail-block"><span className="eyebrow-sm">Tags</span><div className="tag-list">{order.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></div>
          <dl className="date-list"><div><dt>Production started</dt><dd>{formatLongDate(order.startDate)}</dd></div><div><dt>{order.actualShippedDate ? 'Shipped' : 'Estimated ship'}</dt><dd>{formatLongDate(order.actualShippedDate || order.estimatedShipDate)}</dd></div><div><dt>{order.actualArrivalDate ? 'Arrived' : 'Estimated arrival'}</dt><dd>{formatLongDate(arrivalDate(order))}</dd></div></dl>
          <div className="notes-block"><span className="eyebrow-sm">Notes</span><p>{order.notes}</p></div>
        </>}
        {!isDeleteConfirming ? <button className="danger-button full-width-button" ref={deleteButtonRef} type="button" onClick={() => setIsDeleteConfirming(true)}>Delete item</button> : <div className="delete-confirm" role="alert"><p>Remove <strong>{order.itemName}</strong> from the tracker? This cannot be undone.</p><div className="delete-confirm-actions"><button className="secondary-button" type="button" onClick={cancelDeleteConfirmation}>Cancel</button><button className="danger-button" ref={confirmDeleteButtonRef} type="button" onClick={() => onDelete(order.id)}>Delete permanently</button></div></div>}
      </aside>
    </div>
  );
}

const blankOrder = {
  id: '',
  itemName: '',
  image: '',
  category: '',
  size: '',
  color: '',
  quantity: 1,
  unitCost: 0,
  setupCost: 0,
  stockOnHand: null,
  status: 'sourcing',
  tags: [],
  vendor: '',
  campaign: '',
  startDate: defaultSourcingDate,
  estimatedShipDate: '',
  actualShippedDate: '',
  estimatedArrivalDate: '',
  actualArrivalDate: '',
  notes: '',
};

function ItemModal({ order, availableTags = [], isOpen, onClose, onSave, onAddTag }) {
  const [draft, setDraft] = useState(() => ({ ...blankOrder, ...(order || {}), image: order?.image || '', tags: Array.isArray(order?.tags) ? order.tags : [], startDate: order?.startDate || defaultSourcingDate, estimatedShipDate: order?.estimatedShipDate || '', actualShippedDate: order?.actualShippedDate || '', estimatedArrivalDate: order?.estimatedArrivalDate || '', actualArrivalDate: order?.actualArrivalDate || '' }));
  const [newTag, setNewTag] = useState('');
  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;
      const focusable = modalRef.current.querySelectorAll('button, input, select, textarea');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, order]);

  if (!isOpen) return null;

  const draftTags = Array.isArray(draft.tags) ? draft.tags : [];
  const tagOptions = [...new Set([...availableTags, ...draftTags])];
  const updateField = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const toggleTag = (tag) => setDraft((current) => ({ ...current, tags: (current.tags || []).includes(tag) ? (current.tags || []).filter((item) => item !== tag) : [...(current.tags || []), tag] }));
  const addTag = () => {
    const tag = newTag.trim();
    if (!tag) return;
    const existingTag = availableTags.find((item) => item.toLowerCase() === tag.toLowerCase());
    const canonicalTag = existingTag || tag;
    onAddTag(canonicalTag);
    setDraft((current) => ({ ...current, tags: (current.tags || []).includes(canonicalTag) ? current.tags : [...(current.tags || []), canonicalTag] }));
    setNewTag('');
  };
  const submit = (event) => {
    event.preventDefault();
    onSave({ ...draft, quantity: Number(draft.quantity), unitCost: Number(draft.unitCost), setupCost: Number(draft.setupCost || 0), stockOnHand: draft.stockOnHand === '' || draft.stockOnHand == null ? null : Number(draft.stockOnHand) });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="item-modal" ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="item-modal-heading">
        <div className="modal-header"><div><p className="eyebrow-sm">Swag inventory</p><h2 id="item-modal-heading">{order ? 'Edit item' : 'Add new item'}</h2></div><button className="close-button" ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close item form">×</button></div>
        <form onSubmit={submit}>
          <div className="modal-image-row"><ImageThumb key={draft.image} order={{ itemName: draft.itemName || 'Swag item', image: draft.image }} decorative /><div><label className="form-label" htmlFor="item-image">CDN image filename or path</label><input id="item-image" className="form-input" type="text" value={draft.image || ''} onChange={(event) => updateField('image', event.target.value)} placeholder="fleetio-backpack.png" /><p className="form-helper">Use a filename/path relative to the Fleetio swag CDN, or paste a full image URL.</p></div></div>
          <div className="modal-form-grid"><div><label className="form-label" htmlFor="item-name">Item name</label><input id="item-name" className="form-input" type="text" value={draft.itemName} onChange={(event) => updateField('itemName', event.target.value)} placeholder="Fleetio backpack" required /></div><div><label className="form-label" htmlFor="item-status">Status</label><select id="item-status" className="form-input" value={draft.status} onChange={(event) => updateField('status', event.target.value)}>{statuses.map((status) => <option value={status.id} key={status.id}>{status.label}</option>)}</select></div><div><label className="form-label" htmlFor="item-quantity">Quantity to order</label><input id="item-quantity" className="form-input" type="number" min="0" step="1" value={draft.quantity} onChange={(event) => updateField('quantity', event.target.value)} required /></div><div><label className="form-label" htmlFor="item-unit-cost">Cost per item</label><input id="item-unit-cost" className="form-input" type="number" min="0" step="0.01" value={draft.unitCost} onChange={(event) => updateField('unitCost', event.target.value)} required /></div><div><label className="form-label" htmlFor="item-setup-cost">Setup cost</label><input id="item-setup-cost" className="form-input" type="number" min="0" step="0.01" value={draft.setupCost || 0} onChange={(event) => updateField('setupCost', event.target.value)} /></div><div><label className="form-label" htmlFor="item-stock">Stock on hand</label><input id="item-stock" className="form-input" type="number" min="0" step="1" value={draft.stockOnHand ?? ''} onChange={(event) => updateField('stockOnHand', event.target.value)} placeholder="Unknown" /></div><div><label className="form-label" htmlFor="item-vendor">Vendor</label><input id="item-vendor" className="form-input" type="text" value={draft.vendor} onChange={(event) => updateField('vendor', event.target.value)} placeholder="Vendor name" /></div><div><label className="form-label" htmlFor="item-campaign">Campaign</label><input id="item-campaign" className="form-input" type="text" value={draft.campaign} onChange={(event) => updateField('campaign', event.target.value)} placeholder="Campaign or initiative" /></div><div><label className="form-label" htmlFor="item-start-date">Production started</label><input id="item-start-date" className="form-input" type="date" value={draft.startDate} onChange={(event) => updateField('startDate', event.target.value)} /></div><div><label className="form-label" htmlFor="item-ship-date">Estimated ship date</label><input id="item-ship-date" className="form-input" type="date" min={draft.startDate || undefined} value={draft.estimatedShipDate} onChange={(event) => updateField('estimatedShipDate', event.target.value)} /></div><div><label className="form-label" htmlFor="item-actual-shipped-date">Actual shipped date</label><input id="item-actual-shipped-date" className="form-input" type="date" min={draft.startDate || undefined} value={draft.actualShippedDate || ''} onChange={(event) => updateField('actualShippedDate', event.target.value)} /></div><div><label className="form-label" htmlFor="item-arrival-date">Estimated arrival</label><input id="item-arrival-date" className="form-input" type="date" min={draft.actualShippedDate || draft.estimatedShipDate || undefined} value={draft.estimatedArrivalDate} onChange={(event) => updateField('estimatedArrivalDate', event.target.value)} /></div><div><label className="form-label" htmlFor="item-actual-arrival">Actual arrival</label><input id="item-actual-arrival" className="form-input" type="date" min={draft.actualShippedDate || draft.estimatedShipDate || undefined} value={draft.actualArrivalDate || ''} onChange={(event) => updateField('actualArrivalDate', event.target.value)} /></div></div>
          <fieldset className="tag-fieldset"><legend className="form-label">Tags</legend><div className="tag-checkboxes">{tagOptions.map((tag) => <label className="checkbox-option" key={tag}><input type="checkbox" checked={draftTags.includes(tag)} onChange={() => toggleTag(tag)} />{tag}</label>)}</div><div className="new-tag-row"><label className="sr-only" htmlFor="new-tag">New tag name</label><input id="new-tag" className="form-input" type="text" value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="Create a new tag" /><button className="secondary-button" type="button" onClick={addTag}>Add tag</button></div></fieldset>
          <div><label className="form-label" htmlFor="item-notes">Notes</label><textarea id="item-notes" className="form-input form-textarea" value={draft.notes} onChange={(event) => updateField('notes', event.target.value)} placeholder="Add production notes…" rows="3" /></div>
          <div className="modal-actions"><button className="secondary-button" type="button" onClick={onClose}>Cancel</button><button className="primary-button" type="submit">{order ? 'Save changes' : 'Add item'}</button></div>
        </form>
      </section>
    </div>
  );
}

function exportCsv(orders) {
  const headers = ['Item', 'Category', 'Size', 'Color', 'Status', 'Tags', 'Vendor', 'Campaign', 'Quantity to order', 'Stock on hand', 'Unit cost', 'Product value', 'Setup cost', 'Order value', 'Production started', 'Estimated ship', 'Shipped date', 'Arrival date', 'Image URL'];
  const rows = orders.map((order) => [order.itemName, order.category || '', order.variants?.length ? order.variants.map((variant) => `${variant.size}: ${variant.quantity}`).join('; ') : order.size || '', order.color || '', statusInfo(order.status).label, (order.tags || []).join('; '), order.vendor || '', order.campaign || '', order.quantity, order.stockOnHand ?? '', order.variants?.length ? 'Varies by size' : order.unitCost, totalCost(order), order.setupCost || 0, orderCommitment(order), order.startDate || '', order.estimatedShipDate || '', order.actualShippedDate || '', arrivalDate(order) || '', getImageUrl(order.image)]);
  const csvValue = (value) => {
    const text = String(value ?? '');
    return /^[=+\-@]/.test(text) ? `'${text}` : text;
  };
  const csv = [headers, ...rows].map((row) => row.map((value) => `"${csvValue(value).replaceAll('"', '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'fleetio-swag-orders.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [availableTags, setAvailableTags] = useState(tags);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [viewDate, setViewDate] = useState(new Date('2026-09-01T12:00:00'));
  const lastTriggerRef = useRef(null);
  const modalTriggerRef = useRef(null);
  const hasHydratedRef = useRef(false);
  const revisionRef = useRef(null);
  const saveQueueRef = useRef(Promise.resolve());
  const skipNextSaveRef = useRef(false);
  const saveBlockedRef = useRef(false);
  const [syncError, setSyncError] = useState('');
  const authEnabled = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SWAG_AUTH_ENABLED === 'true';
  const { data: session, status: sessionStatus } = useSession();
  const [statusFilter, setStatusFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (authEnabled && (sessionStatus === 'loading' || !session)) return undefined;
    let cancelled = false;
    async function loadSharedState() {
      try {
        const response = await fetch('/api/orders', { cache: 'no-store' });
        let state = await response.json();
        if (!response.ok) throw new Error(state.error || 'The tracker data could not be loaded.');
        if (process.env.NODE_ENV !== 'production' && state.revision === 0) {
          const legacyStored = legacyStorageKeys.map((key) => window.localStorage.getItem(key)).find(Boolean);
          if (legacyStored) {
            try {
              const legacy = JSON.parse(legacyStored);
              const importedPayload = {
                orders: collapseVariantOrders((legacy.orders || []).map(normalizeOrder)),
                availableTags: [...new Set([...tags, ...(Array.isArray(legacy.availableTags) ? legacy.availableTags : [])])],
              };
              const importResponse = await fetch('/api/orders', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ baseRevision: 0, ...importedPayload }),
              });
              if (importResponse.ok) state = await importResponse.json();
            } catch {
              // Keep the server-backed seed data if an old browser draft cannot be imported.
            }
          }
        }
        if (cancelled) return;
        revisionRef.current = state.revision;
        skipNextSaveRef.current = true;
        setOrders(state.payload.orders.map(normalizeOrder));
        setAvailableTags(state.payload.availableTags);
        setSyncError('');
        hasHydratedRef.current = true;
      } catch (error) {
        if (!cancelled) setSyncError(error.message);
      }
    }
    loadSharedState();
    return () => { cancelled = true; };
  }, [authEnabled, session, sessionStatus]);

  useEffect(() => {
    if (!hasHydratedRef.current || revisionRef.current == null || saveBlockedRef.current) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const payload = { orders, availableTags };
    saveQueueRef.current = saveQueueRef.current.then(async () => {
      const response = await fetch('/api/orders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseRevision: revisionRef.current, ...payload }),
      });
      const state = await response.json();
      if (response.status === 409) {
        saveBlockedRef.current = true;
        setSyncError('Another update was detected. Refresh to load the latest tracker data before saving again.');
        return;
      }
      if (!response.ok) throw new Error(state.error || 'The tracker change could not be saved.');
      revisionRef.current = state.revision;
      setSyncError('');
    }).catch((error) => {
      saveBlockedRef.current = true;
      setSyncError(error.message);
    });
  }, [availableTags, orders]);

  const filteredOrders = useMemo(() => orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesTag = tagFilter === 'all' || order.tags.includes(tagFilter);
    const search = query.trim().toLowerCase();
    const matchesQuery = !search || [order.itemName, order.vendor, order.campaign, ...order.tags].join(' ').toLowerCase().includes(search);
    return matchesStatus && matchesTag && matchesQuery;
  }), [orders, query, statusFilter, tagFilter]);

  const hasActiveFilters = Boolean(query.trim()) || statusFilter !== 'all' || tagFilter !== 'all';
  const visibleProductionOrders = filteredOrders.filter((order) => order.status === 'production');
  const visibleShippedOrders = filteredOrders.filter((order) => order.status === 'shipped');
  const visibleStockOrders = filteredOrders.filter((order) => order.status === 'stock');
  const visibleTotalValue = filteredOrders.reduce((sum, order) => sum + orderCommitment(order), 0);
  const tagCosts = availableTags.map((tag) => ({ tag, value: filteredOrders.reduce((sum, order) => sum + costForTag(order, tag), 0) })).filter((item) => item.value > 0).sort((a, b) => b.value - a.value);

  function updateStatus(id, status) {
    const today = localToday();
    setOrders((current) => current.map((order) => {
      if (order.id !== id) return order;
      const actualShippedDate = status === 'shipped' && !order.actualShippedDate ? today : order.actualShippedDate;
      const actualArrivalDate = status === 'stock' && !order.actualArrivalDate ? today : order.actualArrivalDate;
      return withStageDates({ ...order, status, actualShippedDate, actualArrivalDate });
    }));
    setSelectedOrder((current) => {
      if (!current || current.id !== id) return current;
      const actualShippedDate = status === 'shipped' && !current.actualShippedDate ? today : current.actualShippedDate;
      const actualArrivalDate = status === 'stock' && !current.actualArrivalDate ? today : current.actualArrivalDate;
      return withStageDates({ ...current, status, actualShippedDate, actualArrivalDate });
    });
  }

  function changeMonth(offset) {
    if (offset === 0) {
      const today = new Date();
      setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
      return;
    }
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openOrder(order) {
    lastTriggerRef.current = document.activeElement;
    setSelectedOrder(order);
  }

  function closeDrawer() {
    setSelectedOrder(null);
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }

  function openNewItem() {
    modalTriggerRef.current = document.activeElement;
    setEditingOrder(null);
    setSelectedOrder(null);
    setIsItemModalOpen(true);
  }

  function closeItemModal() {
    setIsItemModalOpen(false);
    requestAnimationFrame(() => modalTriggerRef.current?.focus());
  }

  function prepareSavedOrder(draft) {
    const startDate = draft.startDate || '';
    const shipDate = draft.estimatedShipDate && startDate && draft.estimatedShipDate < startDate ? startDate : draft.estimatedShipDate || '';
    const arrivalDateValue = draft.estimatedArrivalDate && shipDate && draft.estimatedArrivalDate < shipDate ? shipDate : draft.estimatedArrivalDate || '';
    const actualArrival = draft.actualArrivalDate && shipDate && draft.actualArrivalDate < shipDate ? shipDate : draft.actualArrivalDate || '';
    const variants = Array.isArray(draft.variants) ? draft.variants.map((variant) => ({ ...variant, size: variant.size || 'One size', quantity: Number(variant.quantity) || 0, stockOnHand: variant.stockOnHand === '' || variant.stockOnHand == null ? null : Number(variant.stockOnHand), unitCost: Number(variant.unitCost) || 0 })) : [];
    const quantity = variants.length ? variants.reduce((sum, variant) => sum + variant.quantity, 0) : Number(draft.quantity) || 0;
    const variantValue = variants.reduce((sum, variant) => sum + variant.quantity * variant.unitCost, 0);
    const stockOnHand = variants.length && variants.some((variant) => variant.stockOnHand != null) ? variants.reduce((sum, variant) => sum + (variant.stockOnHand || 0), 0) : draft.stockOnHand == null || draft.stockOnHand === '' ? null : Number(draft.stockOnHand);
    return withStageDates({ ...draft, id: draft.id || `swag-${Date.now()}`, quantity, unitCost: variants.length && quantity ? variantValue / quantity : Number(draft.unitCost) || 0, setupCost: Number(draft.setupCost || 0), stockOnHand, variants, startDate, estimatedShipDate: shipDate, actualShippedDate: draft.actualShippedDate || '', estimatedArrivalDate: arrivalDateValue, actualArrivalDate: actualArrival });
  }

  function saveItem(draft) {
    const savedOrder = prepareSavedOrder(draft);
    setOrders((current) => draft.id ? current.map((order) => order.id === draft.id ? savedOrder : order) : [savedOrder, ...current]);
    setIsItemModalOpen(false);
    setSelectedOrder(savedOrder);
  }

  function saveEditedItem(draft) {
    const savedOrder = prepareSavedOrder(draft);
    setOrders((current) => current.map((order) => order.id === draft.id ? savedOrder : order));
    setSelectedOrder(savedOrder);
  }

  function deleteOrder(id) {
    const nextOrders = orders.filter((order) => order.id !== id);
    setOrders(nextOrders);
    setSelectedOrder(null);
    requestAnimationFrame(() => lastTriggerRef.current?.focus());
  }

  function addTag(tag) {
    setAvailableTags((current) => current.includes(tag) ? current : [...current, tag]);
  }

  function clearFilters() {
    setQuery('');
    setStatusFilter('all');
    setTagFilter('all');
  }

  if (authEnabled && sessionStatus === 'loading') {
    return <main className="app-shell auth-screen"><p className="eyebrow eyebrow-green">Marketing operations</p><h1>Loading Swag Tracker…</h1></main>;
  }

  if (authEnabled && !session) {
    return <main className="app-shell auth-screen"><p className="eyebrow eyebrow-green">Fleetio marketing operations</p><h1>Swag Tracker</h1><p className="hero-copy">Sign in with your Fleetio GitHub account to view and update shared swag data.</p><button className="primary-button" type="button" onClick={() => signIn('github')}>Sign in with Fleetio GitHub</button></main>;
  }

  return (
    <main className="app-shell">
      <header className="topbar"><Link className="brand" href="/" aria-label="Fleetio Swag Tracker home"><img className="brand-logo" src="/swag-tracker-logo.svg" alt="Swag tracker" /></Link><div className="topbar-actions"><span className={`live-dot ${syncError ? 'live-dot-error' : ''}`} />{syncError ? 'Sync paused' : 'Shared workspace'}<span className="avatar" aria-hidden="true">LD</span></div></header>
      <div className="page-content">
        <section className="hero"><div><p className="eyebrow eyebrow-green">Marketing operations</p><h1>Swag, in motion.</h1><p className="hero-copy">Keep every item, ship date, and dollar visible from first sample to in-stock.</p></div><div className="hero-actions"><button className="secondary-button" type="button" onClick={openNewItem}>Add new item <span aria-hidden="true">+</span></button><button className="primary-button" type="button" onClick={() => exportCsv(filteredOrders)}>Export current view <span aria-hidden="true">↗</span></button></div></section>
        <section className="metrics-grid" aria-label={hasActiveFilters ? 'Filtered swag overview' : 'Swag overview'}><Metric eyebrow="Total committed" value={currency.format(visibleTotalValue)} detail={hasActiveFilters ? `${filteredOrders.length} of ${orders.length} tracked items` : `${orders.length} tracked items`} tone="metric-green" /><Metric eyebrow="In production" value={currency.format(visibleProductionOrders.reduce((sum, order) => sum + orderCommitment(order), 0))} detail={`${visibleProductionOrders.length} orders`} tone="metric-blue" /><Metric eyebrow="Shipping next" value={currency.format(visibleShippedOrders.reduce((sum, order) => sum + orderCommitment(order), 0))} detail="Estimated arrival this month" tone="metric-purple" /><Metric eyebrow="In stock" value={currency.format(visibleStockOrders.reduce((sum, order) => sum + stockValue(order), 0))} detail="Available to request" tone="metric-yellow" /></section>
        <section className="workspace-toolbar" aria-label="Order filters"><div className="search-wrap"><label htmlFor="search-orders">Search all swag</label><input id="search-orders" type="search" placeholder="Search item, tag, campaign, or vendor…" value={query} onChange={(event) => setQuery(event.target.value)} /></div><div className="select-wrap"><label htmlFor="status-filter">Status</label><select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option>{statuses.map((status) => <option key={status.id} value={status.id}>{status.label}</option>)}</select></div><div className="select-wrap"><label htmlFor="tag-filter">Tag</label><select id="tag-filter" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}><option value="all">All tags</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></div><div className="filter-result-wrap"><span className="filter-result">Showing {filteredOrders.length} of {orders.length}</span>{hasActiveFilters && <button className="clear-filters" type="button" onClick={clearFilters}>Clear view</button>}</div></section>
        <div className="primary-grid"><Calendar orders={filteredOrders} viewDate={viewDate} onChangeMonth={changeMonth} onSelect={openOrder} /><aside className="panel cost-panel" aria-labelledby="cost-heading"><div className="section-heading"><div><p className="eyebrow-sm">Budget view</p><h2 id="cost-heading">Cost by tag</h2></div></div>{tagCosts.length ? <div className="cost-list">{tagCosts.map((item) => <button className="cost-row" key={item.tag} type="button" onClick={() => setTagFilter(item.tag)}><span><Tag>{item.tag}</Tag></span><strong>{currency.format(item.value)}</strong><span className="cost-bar"><i style={{ width: `${(item.value / (tagCosts[0]?.value || 1)) * 100}%` }} /></span></button>)}</div> : <p className="helper-text">No matching spend in this view yet.</p>}<p className="helper-text">Multi-tag orders split evenly across their tags until specific allocations are entered.</p></aside></div>
        <Timeline orders={filteredOrders} viewDate={viewDate} onSelect={openOrder} />
        <StatusBoard orders={filteredOrders} onSelect={openOrder} onStatusChange={updateStatus} />
        <OrderTable orders={filteredOrders} onSelect={openOrder} />
      </div>
      <OrderDrawer key={`drawer-${selectedOrder?.id || 'closed'}`} order={selectedOrder} onClose={closeDrawer} onStatusChange={updateStatus} onSave={saveEditedItem} onDelete={deleteOrder} availableTags={availableTags} onAddTag={addTag} />
      <ItemModal key={`modal-${isItemModalOpen ? (editingOrder?.id || 'new') : 'closed'}`} order={editingOrder} availableTags={availableTags} isOpen={isItemModalOpen} onClose={closeItemModal} onSave={saveItem} onAddTag={addTag} />
    </main>
  );
}
