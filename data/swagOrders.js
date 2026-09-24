const imageBaseUrl = process.env.NEXT_PUBLIC_SWAG_CDN_BASE_URL || 'https://marketing-cdn.fleetio.com/images/swag';
export const defaultSourcingDate = '2026-08-14';

export const statuses = [
  { id: 'sourcing', label: 'Sourcing', color: 'teal' },
  { id: 'production', label: 'In production', color: 'blue' },
  { id: 'shipped', label: 'Shipped', color: 'purple' },
  { id: 'stock', label: 'In stock', color: 'green' },
];

export const tags = ['ABM', 'Fleet Locker', 'CKO', 'Event Marketing', 'Customer Gifts', 'Internal'];

const sharedFields = {
  vendor: 'Concepts',
  campaign: 'Fall swag drop',
  tags: ['Fleet Locker'],
  notes: '',
  startDate: defaultSourcingDate,
  estimatedShipDate: '',
  actualShippedDate: '',
  estimatedArrivalDate: '',
  actualArrivalDate: '',
};

const seededOrders = [
  {
    id: 'fall-001', itemName: 'Pilot Pen', image: '', category: 'Stationery', size: '', color: 'Green',
    quantity: 1000, stockOnHand: 56, unitCost: 2.02, setupCost: 65, status: 'stock', ...sharedFields,
  },
  {
    id: 'fall-002', itemName: 'Independent Trading Co. Midweight Quarter-Zip Pullover — S', image: '', category: 'Apparel', size: 'S', color: 'Alpine Green',
    quantity: 15, stockOnHand: 6, unitCost: 34, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-003', itemName: 'Independent Trading Co. Midweight Quarter-Zip Pullover — M', image: '', category: 'Apparel', size: 'M', color: 'Alpine Green',
    quantity: 20, stockOnHand: 0, unitCost: 34, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-004', itemName: 'Independent Trading Co. Midweight Quarter-Zip Pullover — L', image: '', category: 'Apparel', size: 'L', color: 'Alpine Green',
    quantity: 20, stockOnHand: 0, unitCost: 34, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-005', itemName: 'Independent Trading Co. Midweight Quarter-Zip Pullover — XL', image: '', category: 'Apparel', size: 'XL', color: 'Alpine Green',
    quantity: 20, stockOnHand: 0, unitCost: 34, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-006', itemName: 'Independent Trading Co. Midweight Quarter-Zip Pullover — 2XL', image: '', category: 'Apparel', size: '2XL', color: 'Alpine Green',
    quantity: 10, stockOnHand: 7, unitCost: 36, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-007', itemName: 'Independent Trading Co. Midweight Quarter-Zip Pullover — 3XL', image: '', category: 'Apparel', size: '3XL', color: 'Alpine Green',
    quantity: 12, stockOnHand: 3, unitCost: 37, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-008', itemName: "Women's 6 oz. Heavyweight Tee — XS", image: 'womens-shirt.png', category: 'Apparel', size: 'XS', color: 'Sage Green',
    quantity: 10, stockOnHand: null, unitCost: 11.3, setupCost: 65, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-009', itemName: "Women's 6 oz. Heavyweight Tee — S", image: 'womens-shirt.png', category: 'Apparel', size: 'S', color: 'Sage Green',
    quantity: 30, stockOnHand: null, unitCost: 11.3, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-010', itemName: "Women's 6 oz. Heavyweight Tee — M", image: 'womens-shirt.png', category: 'Apparel', size: 'M', color: 'Sage Green',
    quantity: 40, stockOnHand: null, unitCost: 11.3, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-011', itemName: "Women's 6 oz. Heavyweight Tee — L", image: 'womens-shirt.png', category: 'Apparel', size: 'L', color: 'Sage Green',
    quantity: 40, stockOnHand: null, unitCost: 11.3, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-012', itemName: "Women's 6 oz. Heavyweight Tee — XL", image: 'womens-shirt.png', category: 'Apparel', size: 'XL', color: 'Sage Green',
    quantity: 30, stockOnHand: null, unitCost: 11.3, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-013', itemName: "Women's 6 oz. Heavyweight Tee — 2XL", image: 'womens-shirt.png', category: 'Apparel', size: '2XL', color: 'Sage Green',
    quantity: 10, stockOnHand: null, unitCost: 13.3, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-014', itemName: "Women's 6 oz. Heavyweight Tee — 3XL", image: 'womens-shirt.png', category: 'Apparel', size: '3XL', color: 'Sage Green',
    quantity: 5, stockOnHand: null, unitCost: 14.3, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-015', itemName: 'Pack-N-Go Pullover — S', image: '', category: 'Apparel', size: 'S', color: 'Forest Green',
    quantity: 40, stockOnHand: null, unitCost: 43.5, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-016', itemName: 'Pack-N-Go Pullover — M', image: '', category: 'Apparel', size: 'M', color: 'Forest Green',
    quantity: 50, stockOnHand: null, unitCost: 43.5, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-017', itemName: 'Pack-N-Go Pullover — L', image: '', category: 'Apparel', size: 'L', color: 'Forest Green',
    quantity: 50, stockOnHand: null, unitCost: 43.5, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-018', itemName: 'Pack-N-Go Pullover — XL', image: '', category: 'Apparel', size: 'XL', color: 'Forest Green',
    quantity: 50, stockOnHand: null, unitCost: 43.5, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-019', itemName: 'Pack-N-Go Pullover — 3XL', image: '', category: 'Apparel', size: '3XL', color: 'Forest Green',
    quantity: 5, stockOnHand: null, unitCost: 43.5, setupCost: 0, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-020', itemName: 'Puff 17-inch Fleetio Backpack', image: 'fleetio-backpack.png', category: 'Travel', size: '', color: 'Black',
    quantity: 250, stockOnHand: null, unitCost: 58, setupCost: 150, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-021', itemName: 'Puff 17-inch AI Backpack', image: 'ai-backpack.png', category: 'Travel', size: '', color: 'Black',
    quantity: 50, stockOnHand: null, unitCost: 58, setupCost: 150, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-022', itemName: 'Titleist PackEdge 2-Ball Sleeve', image: 'golf-balls.png', category: 'Misc', size: '', color: 'White',
    quantity: 180, stockOnHand: null, unitCost: 15.38, setupCost: 65, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-023', itemName: 'Owala FreeSip 32oz Tumbler', image: 'owala.png', category: 'Drinkware', size: '', color: 'Shy Marshmallow White',
    quantity: 72, stockOnHand: null, unitCost: 43.99, setupCost: 65, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-024', itemName: '16 oz Sedona Speckle Mug — Fleetio', image: 'coffee-mug-fleetio.png', category: 'Drinkware', size: '', color: 'Natural',
    quantity: 100, stockOnHand: null, unitCost: 6.73, setupCost: 65, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-025', itemName: '16 oz Sedona Speckle Mug — AI', image: 'coffee-mug-ai.png', category: 'Drinkware', size: '', color: 'Cobalt Blue',
    quantity: 50, stockOnHand: null, unitCost: 6.73, setupCost: 65, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'fall-026', itemName: 'Tire Gauge', image: '', category: '', size: '', color: 'Green',
    quantity: 1000, stockOnHand: null, unitCost: 1.75, setupCost: 35, status: 'sourcing', ...sharedFields,
  },
  {
    id: 'existing-007', itemName: 'LS shirt', image: 'ls-shirt-front.png', category: 'Apparel', size: '', color: '',
    quantity: 180, stockOnHand: null, unitCost: 24, setupCost: 0, status: 'production', tags: ['Fleet Locker'],
    vendor: 'Concepts', campaign: 'Fall swag drop', notes: '', startDate: defaultSourcingDate, estimatedShipDate: '2026-09-17', estimatedArrivalDate: '2026-09-24', actualArrivalDate: '',
  },
  {
    id: 'existing-009', itemName: 'Rain jacket', image: 'rainjacket.png', category: 'Apparel', size: '', color: '',
    quantity: 75, stockOnHand: null, unitCost: 56, setupCost: 0, status: 'production', tags: ['Fleet Locker'],
    vendor: 'Concepts', campaign: 'Fall swag drop', notes: '', startDate: defaultSourcingDate, estimatedShipDate: '2026-10-23', estimatedArrivalDate: '2026-10-30', actualArrivalDate: '',
  },
];

function addDays(dateString, days) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function midpoint(start, end, ratio) {
  if (!start || !end) return '';
  const startTime = new Date(`${start}T12:00:00`).getTime();
  const endTime = new Date(`${end}T12:00:00`).getTime();
  return new Date(startTime + (endTime - startTime) * ratio).toISOString().slice(0, 10);
}

export function withStageDates(order) {
  const shipped = order.actualShippedDate || order.estimatedShipDate;
  const arrival = order.actualArrivalDate || order.estimatedArrivalDate;
  const productionStart = midpoint(order.startDate, shipped, 0.32);
  const productionEnd = midpoint(order.startDate, shipped, 0.86);
  return {
    ...order,
    stageDates: {
      sourcing: { start: order.startDate || '', end: productionStart },
      production: { start: productionStart, end: productionEnd },
      shipped: { start: shipped || '', end: arrival || '' },
      stock: { start: arrival || '', end: arrival ? addDays(arrival, 14) : '' },
    },
  };
}

const sizeSuffixPattern = /^(.*) — (XS|S|M|L|XL|2XL|3XL)$/;

export function collapseVariantOrders(orders) {
  const grouped = [];
  const groupMap = new Map();

  orders.forEach((order) => {
    const match = order.itemName.match(sizeSuffixPattern);
    if (!match) {
      grouped.push(order);
      return;
    }

    const groupKey = [match[1], order.vendor, order.campaign, order.image, order.category, order.color].join('|');
    let group = groupMap.get(groupKey);
    if (!group) {
      group = {
        ...order,
        itemName: match[1],
        size: '',
        quantity: 0,
        stockOnHand: null,
        unitCost: 0,
        setupCost: 0,
        variants: [],
      };
      groupMap.set(groupKey, group);
      grouped.push(group);
    }

    group.variants.push({
      id: `${group.id}-${match[2]}`,
      size: match[2],
      quantity: Number(order.quantity) || 0,
      stockOnHand: order.stockOnHand == null ? null : Number(order.stockOnHand),
      unitCost: Number(order.unitCost) || 0,
    });
    group.quantity += Number(order.quantity) || 0;
    group.setupCost += Number(order.setupCost) || 0;
    if (order.stockOnHand != null) group.stockOnHand = (group.stockOnHand || 0) + Number(order.stockOnHand);
  });

  return grouped.map((order) => {
    if (!order.variants?.length) return order;
    const variantValue = order.variants.reduce((sum, variant) => sum + variant.quantity * variant.unitCost, 0);
    return { ...order, unitCost: order.quantity ? variantValue / order.quantity : 0 };
  });
}

export const initialOrders = collapseVariantOrders(seededOrders).map(withStageDates);

export function getImageUrl(filename) {
  if (!filename) return '';
  if (/^https?:\/\//i.test(filename)) return filename;
  return `${imageBaseUrl.replace(/\/$/, '')}/${String(filename).replace(/^\/+/, '')}`;
}
