import { PrismaClient, WorkOrderStatus, WorkOrderType, BillingModel, InvoiceStatus, PaymentMethod, SquawkStatus, PartCondition, PartRequestStatus, POStatus, ComplianceType, LineItemStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Organization ───────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: 'skyline-aviation' },
    update: {},
    create: {
      name: 'Skyline Aviation Services',
      slug: 'skyline-aviation',
    },
  });

  // ─── Labor Rates ────────────────────────────────────────────────────────────
  const standardRate = await prisma.laborRate.upsert({
    where: { id: 'lr-standard' },
    update: {},
    create: {
      id: 'lr-standard',
      orgId: org.id,
      name: 'Standard A&P',
      rate: 115.00,
      multiplier: 1.0,
      isDefault: true,
    },
  });

  const aogRate = await prisma.laborRate.upsert({
    where: { id: 'lr-aog' },
    update: {},
    create: {
      id: 'lr-aog',
      orgId: org.id,
      name: 'AOG / Emergency',
      rate: 172.50,  // 115 × 1.5
      multiplier: 1.5,
    },
  });

  const avionicsRate = await prisma.laborRate.upsert({
    where: { id: 'lr-avionics' },
    update: {},
    create: {
      id: 'lr-avionics',
      orgId: org.id,
      name: 'Avionics',
      rate: 130.00,
      multiplier: 1.0,
    },
  });

  // ─── Technicians ────────────────────────────────────────────────────────────
  const tech1 = await prisma.technician.upsert({
    where: { id: 'tech-1' },
    update: {},
    create: {
      id: 'tech-1',
      orgId: org.id,
      name: 'Marcus Williams',
      certifications: ['A&P', 'IA'],
      costRate: 42.00,
      billRate: 115.00,
      active: true,
    },
  });

  const tech2 = await prisma.technician.upsert({
    where: { id: 'tech-2' },
    update: {},
    create: {
      id: 'tech-2',
      orgId: org.id,
      name: 'Sarah Chen',
      certifications: ['A&P'],
      costRate: 36.00,
      billRate: 115.00,
      active: true,
    },
  });

  const tech3 = await prisma.technician.upsert({
    where: { id: 'tech-3' },
    update: {},
    create: {
      id: 'tech-3',
      orgId: org.id,
      name: 'Diego Ramirez',
      certifications: ['A&P', 'IA'],
      costRate: 44.00,
      billRate: 115.00,
      active: true,
    },
  });

  const tech4 = await prisma.technician.upsert({
    where: { id: 'tech-4' },
    update: {},
    create: {
      id: 'tech-4',
      orgId: org.id,
      name: 'James Park',
      certifications: ['A&P'],
      costRate: 32.00,
      billRate: 115.00,
      active: true,
    },
  });

  // ─── Customers ──────────────────────────────────────────────────────────────
  const customer1 = await prisma.customer.upsert({
    where: { id: 'cust-1' },
    update: {},
    create: {
      id: 'cust-1',
      orgId: org.id,
      name: 'Robert Harrington',
      email: 'rharrington@example.com',
      phone: '(512) 555-0142',
      address: '4821 Mesa Verde Dr, Austin, TX 78759',
      billingTerms: 'NET_30',
      accountNumber: 'ACC-0001',
    },
  });

  const customer2 = await prisma.customer.upsert({
    where: { id: 'cust-2' },
    update: {},
    create: {
      id: 'cust-2',
      orgId: org.id,
      name: 'Apex Air Charter LLC',
      email: 'ops@apexaircharter.com',
      phone: '(737) 555-0218',
      address: '1200 Executive Blvd, Austin, TX 78748',
      billingTerms: 'NET_30',
      accountNumber: 'ACC-0002',
      creditLimit: 50000,
    },
  });

  const customer3 = await prisma.customer.upsert({
    where: { id: 'cust-3' },
    update: {},
    create: {
      id: 'cust-3',
      orgId: org.id,
      name: 'Patricia Okonkwo',
      email: 'pokonkwo@example.com',
      phone: '(512) 555-0387',
      billingTerms: 'COD',
      accountNumber: 'ACC-0003',
    },
  });

  const customer4 = await prisma.customer.upsert({
    where: { id: 'cust-4' },
    update: {},
    create: {
      id: 'cust-4',
      orgId: org.id,
      name: 'Hill Country Flying Club',
      email: 'treasurer@hcfc.aero',
      phone: '(830) 555-0091',
      address: '300 Airport Rd, Fredericksburg, TX 78624',
      billingTerms: 'NET_30',
      accountNumber: 'ACC-0004',
      creditLimit: 25000,
    },
  });

  // ─── Aircraft ────────────────────────────────────────────────────────────────
  const ac1 = await prisma.aircraft.upsert({
    where: { nNumber: 'N5572K' },
    update: {},
    create: {
      nNumber: 'N5572K',
      make: 'Cessna',
      model: '172S Skyhawk',
      serial: '172S12345',
      year: 2008,
      ttsn: 3142.5,
      engineTtsn: 847.2,
      customerId: customer1.id,
    },
  });

  const ac2 = await prisma.aircraft.upsert({
    where: { nNumber: 'N841QA' },
    update: {},
    create: {
      nNumber: 'N841QA',
      make: 'Beechcraft',
      model: 'A36 Bonanza',
      serial: 'E-3891',
      year: 1998,
      ttsn: 5284.1,
      engineTtsn: 1287.4,
      customerId: customer2.id,
    },
  });

  const ac3 = await prisma.aircraft.upsert({
    where: { nNumber: 'N2207X' },
    update: {},
    create: {
      nNumber: 'N2207X',
      make: 'Piper',
      model: 'PA-28-181 Archer',
      serial: '28-8190052',
      year: 1981,
      ttsn: 7891.3,
      engineTtsn: 312.0,
      customerId: customer3.id,
    },
  });

  const ac4 = await prisma.aircraft.upsert({
    where: { nNumber: 'N8854T' },
    update: {},
    create: {
      nNumber: 'N8854T',
      make: 'Cessna',
      model: '182T Skylane',
      serial: '18281042',
      year: 2004,
      ttsn: 2198.7,
      engineTtsn: 2198.7,
      customerId: customer4.id,
    },
  });

  // ─── Work Orders ────────────────────────────────────────────────────────────

  // WO-001: Annual inspection in progress
  const wo1 = await prisma.workOrder.upsert({
    where: { number: 'WO-2025-0041' },
    update: {},
    create: {
      number: 'WO-2025-0041',
      orgId: org.id,
      type: WorkOrderType.INSPECTION,
      status: WorkOrderStatus.IN_PROGRESS,
      customerId: customer1.id,
      aircraftId: ac1.id,
      dateOpened: new Date('2025-01-13'),
      estimatedClose: new Date('2025-01-20'),
      billingModel: BillingModel.HYBRID,
      laborRateId: standardRate.id,
      shopSuppliesPct: 0.035,
      estimatedTotal: 2850.00,
      notes: 'Annual inspection + 100hr. Customer requested avionics check.',
    },
  });

  // WO-001 line items
  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-001-1' },
    update: {},
    create: {
      id: 'li-001-1',
      workOrderId: wo1.id,
      taskNumber: 'TASK-001',
      description: 'Annual Inspection — Airframe per FAR 43 Appendix D',
      estHours: 12.0,
      actualHours: 9.5,
      laborRate: 115.00,
      status: LineItemStatus.COMPLETE,
      technicianId: tech1.id,
      sortOrder: 1,
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-001-2' },
    update: {},
    create: {
      id: 'li-001-2',
      workOrderId: wo1.id,
      taskNumber: 'TASK-002',
      description: 'Engine Inspection — Continental IO-360',
      estHours: 3.0,
      actualHours: 3.5,
      laborRate: 115.00,
      status: LineItemStatus.COMPLETE,
      technicianId: tech1.id,
      sortOrder: 2,
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-001-3' },
    update: {},
    create: {
      id: 'li-001-3',
      workOrderId: wo1.id,
      taskNumber: 'TASK-003',
      description: 'Avionics Inspection — Garmin G1000 suite functional check',
      estHours: 2.0,
      actualHours: 0,
      laborRate: 130.00,
      status: LineItemStatus.PENDING,
      sortOrder: 3,
    },
  });

  // WO-001 squawks
  await prisma.squawk.upsert({
    where: { id: 'sq-001-1' },
    update: {},
    create: {
      id: 'sq-001-1',
      workOrderId: wo1.id,
      description: 'Left brake assembly shows 40% wear — pads worn near minimum thickness. Recommend replacement before next flight.',
      estLaborHours: 1.5,
      estPartsTotal: 285.00,
      estTotal: 457.50,
      status: SquawkStatus.APPROVED,
      isAirworthiness: false,
      approvedAt: new Date('2025-01-14'),
      approvedBy: 'Robert Harrington',
    },
  });

  await prisma.squawk.upsert({
    where: { id: 'sq-001-2' },
    update: {},
    create: {
      id: 'sq-001-2',
      workOrderId: wo1.id,
      description: 'Nose gear shimmy dampener worn — excessive play observed during taxi inspection. Replacement required for airworthiness.',
      estLaborHours: 2.0,
      estPartsTotal: 445.00,
      estTotal: 675.00,
      status: SquawkStatus.PENDING_APPROVAL,
      isAirworthiness: true,
    },
  });

  // WO-001 labor entries
  await prisma.laborEntry.createMany({
    skipDuplicates: true,
    data: [
      { id: 'le-001-1', workOrderId: wo1.id, lineItemId: 'li-001-1', technicianId: tech1.id, date: new Date('2025-01-13'), hours: 4.5, rateUsed: 115.00, billable: true, description: 'Airframe inspection — completed all exterior and control surface checks' },
      { id: 'le-001-2', workOrderId: wo1.id, lineItemId: 'li-001-1', technicianId: tech1.id, date: new Date('2025-01-14'), hours: 5.0, rateUsed: 115.00, billable: true, description: 'Airframe inspection continued — interior, electrical, avionics' },
      { id: 'le-001-3', workOrderId: wo1.id, lineItemId: 'li-001-2', technicianId: tech1.id, date: new Date('2025-01-14'), hours: 3.5, rateUsed: 115.00, billable: true, description: 'Engine inspection — compression test, mag check, baffling inspection' },
    ],
  });

  // WO-002: AOG - engine won't start
  const wo2 = await prisma.workOrder.upsert({
    where: { number: 'WO-2025-0042' },
    update: {},
    create: {
      number: 'WO-2025-0042',
      orgId: org.id,
      type: WorkOrderType.AOG,
      status: WorkOrderStatus.IN_PROGRESS,
      customerId: customer2.id,
      aircraftId: ac2.id,
      dateOpened: new Date('2025-01-15'),
      billingModel: BillingModel.TIME_AND_MATERIALS,
      laborRateId: aogRate.id,
      shopSuppliesPct: 0.035,
      estimatedTotal: 3200.00,
      notes: 'AOG at Austin Executive Airport. Engine turns over but will not start. Customer charter flight delayed. Priority response.',
      internalNotes: 'Tech dispatched at 06:15. Possible magneto failure or fuel system issue.',
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-002-1' },
    update: {},
    create: {
      id: 'li-002-1',
      workOrderId: wo2.id,
      taskNumber: 'TASK-001',
      description: 'AOG Diagnosis — Engine no-start troubleshooting, Continental IO-550',
      estHours: 2.0,
      actualHours: 2.5,
      laborRate: 172.50,
      status: LineItemStatus.COMPLETE,
      technicianId: tech3.id,
      sortOrder: 1,
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-002-2' },
    update: {},
    create: {
      id: 'li-002-2',
      workOrderId: wo2.id,
      taskNumber: 'TASK-002',
      description: 'Replace Left Magneto — Slick 4371 (confirmed failed during mag check)',
      estHours: 3.0,
      actualHours: 0,
      laborRate: 172.50,
      status: LineItemStatus.PENDING,
      sortOrder: 2,
    },
  });

  await prisma.laborEntry.createMany({
    skipDuplicates: true,
    data: [
      { id: 'le-002-1', workOrderId: wo2.id, lineItemId: 'li-002-1', technicianId: tech3.id, date: new Date('2025-01-15'), hours: 2.5, rateUsed: 172.50, billable: true, description: 'AOG response — 2hr min callout + diagnosis. Confirmed left mag failure via mag check isolation.' },
    ],
  });

  // WO-003: Complete, awaiting invoice
  const wo3 = await prisma.workOrder.upsert({
    where: { number: 'WO-2025-0039' },
    update: {},
    create: {
      number: 'WO-2025-0039',
      orgId: org.id,
      type: WorkOrderType.SCHEDULED,
      status: WorkOrderStatus.COMPLETE,
      customerId: customer3.id,
      aircraftId: ac3.id,
      dateOpened: new Date('2025-01-05'),
      estimatedClose: new Date('2025-01-10'),
      closedAt: new Date('2025-01-09'),
      billingModel: BillingModel.TIME_AND_MATERIALS,
      laborRateId: standardRate.id,
      shopSuppliesPct: 0.035,
      estimatedTotal: 1850.00,
      actualTotal: 2165.00,
      notes: 'Engine oil change, spark plug rotation, compression test, squawk: rough idle at low power.',
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-003-1' },
    update: {},
    create: {
      id: 'li-003-1',
      workOrderId: wo3.id,
      taskNumber: 'TASK-001',
      description: 'Oil Change — Lycoming O-360, filter & screen inspection',
      estHours: 1.5,
      actualHours: 1.5,
      laborRate: 115.00,
      status: LineItemStatus.SIGNED_OFF,
      technicianId: tech2.id,
      completedAt: new Date('2025-01-08'),
      sortOrder: 1,
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-003-2' },
    update: {},
    create: {
      id: 'li-003-2',
      workOrderId: wo3.id,
      taskNumber: 'TASK-002',
      description: 'Spark Plug Rotation — 8 plugs cleaned, gapped, rotated per Lycoming SI-1042F',
      estHours: 2.0,
      actualHours: 2.25,
      laborRate: 115.00,
      status: LineItemStatus.SIGNED_OFF,
      technicianId: tech2.id,
      completedAt: new Date('2025-01-08'),
      sortOrder: 2,
    },
  });

  await prisma.workOrderLineItem.upsert({
    where: { id: 'li-003-3' },
    update: {},
    create: {
      id: 'li-003-3',
      workOrderId: wo3.id,
      taskNumber: 'TASK-003',
      description: 'Rough idle diagnosis — ECI fuel injector nozzle #3 partially clogged, cleaned and flow tested',
      estHours: 3.0,
      actualHours: 4.5,
      laborRate: 115.00,
      status: LineItemStatus.SIGNED_OFF,
      technicianId: tech1.id,
      completedAt: new Date('2025-01-09'),
      sortOrder: 3,
    },
  });

  // WO-004: Complete, invoiced, paid
  const wo4 = await prisma.workOrder.upsert({
    where: { number: 'WO-2025-0035' },
    update: {},
    create: {
      number: 'WO-2025-0035',
      orgId: org.id,
      type: WorkOrderType.SCHEDULED,
      status: WorkOrderStatus.CLOSED,
      customerId: customer4.id,
      aircraftId: ac4.id,
      dateOpened: new Date('2024-12-15'),
      estimatedClose: new Date('2024-12-22'),
      closedAt: new Date('2024-12-20'),
      billingModel: BillingModel.FLAT_RATE,
      laborRateId: standardRate.id,
      shopSuppliesPct: 0.035,
      estimatedTotal: 1875.00,
      actualTotal: 1875.00,
      notes: 'Annual inspection flat rate + squawk repairs.',
    },
  });

  // WO-005: Open, awaiting parts
  const wo5 = await prisma.workOrder.upsert({
    where: { number: 'WO-2025-0043' },
    update: {},
    create: {
      number: 'WO-2025-0043',
      orgId: org.id,
      type: WorkOrderType.SCHEDULED,
      status: WorkOrderStatus.AWAITING_PARTS,
      customerId: customer2.id,
      aircraftId: ac2.id,
      dateOpened: new Date('2025-01-12'),
      estimatedClose: new Date('2025-01-25'),
      billingModel: BillingModel.TIME_AND_MATERIALS,
      laborRateId: standardRate.id,
      shopSuppliesPct: 0.035,
      estimatedTotal: 4200.00,
      notes: 'Alternator replacement — Plane Power AL12-C24. Ordered from Aircraft Spruce.',
    },
  });

  // ─── Purchase Orders ─────────────────────────────────────────────────────────

  const po1 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-2025-0018' },
    update: {},
    create: {
      poNumber: 'PO-2025-0018',
      orgId: org.id,
      vendor: 'Aircraft Spruce & Specialty',
      workOrderId: wo5.id,
      status: POStatus.ON_ORDER,
      expedited: false,
      expectedDate: new Date('2025-01-20'),
      shippingCost: 28.50,
      notes: 'Standard ground shipping. ETA 3-5 days.',
    },
  });

  await prisma.pOLineItem.createMany({
    skipDuplicates: true,
    data: [
      { id: 'poli-1', purchaseOrderId: po1.id, partNumber: 'AL12-C24', description: 'Plane Power Alternator 14V 60A', qty: 1, unitCost: 695.00, condition: PartCondition.NEW, requires8130: true },
      { id: 'poli-2', purchaseOrderId: po1.id, partNumber: '13-04500', description: 'Alternator Belt Continental IO-550', qty: 1, unitCost: 24.95, condition: PartCondition.NEW, requires8130: false },
    ],
  });

  const po2 = await prisma.purchaseOrder.upsert({
    where: { poNumber: 'PO-2025-0019' },
    update: {},
    create: {
      poNumber: 'PO-2025-0019',
      orgId: org.id,
      vendor: 'Aviall (Boeing Distribution)',
      workOrderId: wo2.id,
      status: POStatus.SUBMITTED,
      expedited: true,
      priority: 'AOG',
      expectedDate: new Date('2025-01-16'),
      shippingCost: 145.00,
      notes: 'AOG next-flight shipping. Needed by 0900 tomorrow.',
    },
  });

  await prisma.pOLineItem.createMany({
    skipDuplicates: true,
    data: [
      { id: 'poli-3', purchaseOrderId: po2.id, partNumber: 'M4371', description: 'Slick Magneto 4371 — Left', qty: 1, unitCost: 485.00, condition: PartCondition.NEW, requires8130: true },
    ],
  });

  // ─── Invoices ────────────────────────────────────────────────────────────────

  const now = new Date('2025-01-15');

  // Invoice for WO-004 (paid)
  const inv1 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-0089' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-0089',
      orgId: org.id,
      customerId: customer4.id,
      workOrderId: wo4.id,
      status: InvoiceStatus.PAID,
      issueDate: new Date('2024-12-20'),
      dueDate: new Date('2025-01-19'),
      sentAt: new Date('2024-12-20'),
      paidAt: new Date('2024-12-22'),
      subtotal: 1875.00,
      taxRate: 0,
      taxAmount: 0,
      total: 1875.00,
      amountPaid: 1875.00,
      balance: 0,
      notes: 'Annual inspection + squawk repairs. Thank you for your business.',
    },
  });

  await prisma.invoiceLineItem.createMany({
    skipDuplicates: true,
    data: [
      { id: 'ili-1-1', invoiceId: inv1.id, category: 'LABOR', description: 'Annual Inspection — flat rate', qty: 1, unitPrice: 1650.00, total: 1650.00, sortOrder: 1 },
      { id: 'ili-1-2', invoiceId: inv1.id, category: 'SHOP_SUPPLIES', description: 'Shop Supplies (3.5% of labor)', qty: 1, unitPrice: 57.75, total: 57.75, sortOrder: 2, taxable: false },
      { id: 'ili-1-3', invoiceId: inv1.id, category: 'PARTS', description: 'Oil Filter CH48108-1', qty: 1, unitPrice: 54.00, total: 54.00, sortOrder: 3 },
      { id: 'ili-1-4', invoiceId: inv1.id, category: 'PARTS', description: 'Engine Oil Phillips X/C 20W-50 (8 qt)', qty: 8, unitPrice: 14.25, total: 114.00, sortOrder: 4 },
    ],
  });

  await prisma.payment.create({
    data: {
      id: 'pay-1',
      invoiceId: inv1.id,
      amount: 1875.00,
      method: PaymentMethod.CHECK,
      reference: 'CHK #1042',
      paidAt: new Date('2024-12-22'),
    },
  }).catch(() => {}); // skip if exists

  // Invoice sent, overdue (60+ days)
  const inv2 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-0081' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-0081',
      orgId: org.id,
      customerId: customer3.id,
      status: InvoiceStatus.OVERDUE,
      issueDate: new Date('2024-11-01'),
      dueDate: new Date('2024-12-01'),
      sentAt: new Date('2024-11-01'),
      subtotal: 892.50,
      taxRate: 0,
      taxAmount: 0,
      total: 892.50,
      amountPaid: 0,
      balance: 892.50,
    },
  });

  // Invoice sent, 30-day aging
  const inv3 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2024-0092' },
    update: {},
    create: {
      invoiceNumber: 'INV-2024-0092',
      orgId: org.id,
      customerId: customer1.id,
      status: InvoiceStatus.SENT,
      issueDate: new Date('2024-12-18'),
      dueDate: new Date('2025-01-17'),
      sentAt: new Date('2024-12-18'),
      subtotal: 1245.00,
      taxRate: 0,
      taxAmount: 0,
      total: 1245.00,
      amountPaid: 0,
      balance: 1245.00,
    },
  });

  // Invoice partial payment
  const inv4 = await prisma.invoice.upsert({
    where: { invoiceNumber: 'INV-2025-0001' },
    update: {},
    create: {
      invoiceNumber: 'INV-2025-0001',
      orgId: org.id,
      customerId: customer2.id,
      status: InvoiceStatus.PARTIAL,
      issueDate: new Date('2025-01-03'),
      dueDate: new Date('2025-02-02'),
      sentAt: new Date('2025-01-03'),
      subtotal: 5840.00,
      taxRate: 0,
      taxAmount: 0,
      total: 5840.00,
      amountPaid: 2000.00,
      balance: 3840.00,
    },
  });

  await prisma.payment.create({
    data: {
      id: 'pay-2',
      invoiceId: inv4.id,
      amount: 2000.00,
      method: PaymentMethod.ACH,
      reference: 'ACH-20250105',
      paidAt: new Date('2025-01-05'),
    },
  }).catch(() => {});

  // ─── Parts Inventory ─────────────────────────────────────────────────────────

  await prisma.part.createMany({
    skipDuplicates: true,
    data: [
      { id: 'part-1', orgId: org.id, partNumber: 'CH48108-1', description: 'Champion Oil Filter — Lycoming/Continental', condition: PartCondition.NEW, qtyOnHand: 6, unitCost: 18.50, markupPct: 100, manufacturer: 'Champion' },
      { id: 'part-2', orgId: org.id, partNumber: 'REM40E', description: 'Champion Spark Plug — Massive Electrode', condition: PartCondition.NEW, qtyOnHand: 24, unitCost: 14.25, markupPct: 100, manufacturer: 'Champion' },
      { id: 'part-3', orgId: org.id, partNumber: 'M4371', description: 'Slick Magneto 4371 Left-Hand', condition: PartCondition.NEW, qtyOnHand: 0, unitCost: 485.00, markupPct: 40, manufacturer: 'Slick' },
      { id: 'part-4', orgId: org.id, partNumber: 'AL12-C24', description: 'Plane Power Alternator 14V 60A Continental', condition: PartCondition.NEW, qtyOnHand: 0, unitCost: 695.00, markupPct: 40, manufacturer: 'Plane Power' },
      { id: 'part-5', orgId: org.id, partNumber: 'LW-13781', description: 'Brake Lining Assembly — Cleveland 30-67B', condition: PartCondition.NEW, qtyOnHand: 4, unitCost: 68.00, markupPct: 75, manufacturer: 'Cleveland' },
    ],
  });

  // ─── Compliance Items ─────────────────────────────────────────────────────────

  await prisma.complianceItem.createMany({
    skipDuplicates: true,
    data: [
      {
        id: 'comp-1',
        workOrderId: wo1.id,
        type: ComplianceType.AD,
        referenceId: 'AD 2023-09-11',
        description: 'Cessna: Inspect and replace elevator trim tab actuator — recurring 100hr',
        form337Required: false,
        completedAt: new Date('2025-01-13'),
      },
      {
        id: 'comp-2',
        workOrderId: wo1.id,
        type: ComplianceType.SB,
        referenceId: 'Cessna SEB95-4',
        description: 'Cessna Skyhawk: Fuel injection system cleaning service bulletin',
        form337Required: false,
      },
    ],
  });

  console.log('✅ Seed complete!');
  console.log(`   Org: ${org.name}`);
  console.log(`   Customers: 4`);
  console.log(`   Aircraft: 4`);
  console.log(`   Technicians: 4`);
  console.log(`   Work Orders: 5 (1 AOG, 1 In Progress, 1 Complete, 1 Awaiting Parts, 1 Closed)`);
  console.log(`   Invoices: 4 (1 Paid, 1 Overdue, 1 Sent, 1 Partial)`);
  console.log(`   Parts: 5`);
  console.log(`   Purchase Orders: 2`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
