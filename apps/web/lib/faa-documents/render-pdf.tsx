import React from 'react';
import {
  Document, Page, View, Text, Image, StyleSheet, renderToBuffer,
  type DocumentProps,
} from '@react-pdf/renderer';
import type {
  Form337Payload,
  Cert8130Payload,
  MaintenanceReleasePayload,
  LogbookEntryPayload,
  PartsTagPayload,
} from '@mro/core';

// ─── Shared styles ────────────────────────────────────────────────────────────

const base = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: 32,
    color: '#1a1a1a',
  },
  headerBar: {
    backgroundColor: '#1e3a5f',
    color: '#ffffff',
    padding: '8 12',
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#ffffff' },
  headerSub:   { fontSize: 8, color: '#cbd5e1' },
  sectionTitle: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: '#1e3a5f',
    borderBottom: '1 solid #1e3a5f',
    paddingBottom: 2,
    marginBottom: 6,
    marginTop: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: { flexDirection: 'row', marginBottom: 4 },
  col: { flex: 1, marginRight: 8 },
  label: { fontSize: 7, color: '#64748b', marginBottom: 1, fontFamily: 'Helvetica-Bold' },
  value: { fontSize: 9, borderBottom: '1 solid #e2e8f0', paddingBottom: 2 },
  box: {
    border: '1 solid #cbd5e1',
    borderRadius: 3,
    padding: '6 8',
    marginBottom: 6,
  },
  boxTitle: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#64748b', marginBottom: 3 },
  bold: { fontFamily: 'Helvetica-Bold' },
  italic: { fontFamily: 'Helvetica-Oblique' },
  signatureBlock: {
    flexDirection: 'row',
    borderTop: '1 solid #cbd5e1',
    paddingTop: 8,
    marginTop: 12,
    gap: 16,
  },
  sigField: { flex: 1 },
  sigLine: { borderBottom: '1 solid #1a1a1a', marginBottom: 2 },
  sigLabel: { fontSize: 7, color: '#64748b' },
  footer: { position: 'absolute', bottom: 24, left: 32, right: 32, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 6, color: '#94a3b8' },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); }
  catch { return iso; }
}

function Field({ label, value, flex }: { label: string; value?: string | number | null; flex?: number }) {
  return (
    <View style={[base.col, flex !== undefined ? { flex } : {}]}>
      <Text style={base.label}>{label}</Text>
      <Text style={base.value}>{value ?? '—'}</Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={base.sectionTitle}>{children}</Text>;
}

function SigField({ label, signatureImageUrl }: { label: string; signatureImageUrl?: string | null }) {
  return (
    <View style={base.sigField}>
      {signatureImageUrl ? (
        <Image src={signatureImageUrl} style={{ height: 28, objectFit: 'contain', objectPositionX: '0%', marginBottom: 2 }} />
      ) : (
        <View style={base.sigLine}><Text style={{ color: '#fff' }}>_</Text></View>
      )}
      <Text style={base.sigLabel}>{label}</Text>
    </View>
  );
}

// ─── Form 337 ─────────────────────────────────────────────────────────────────

function Form337Doc({ p }: { p: Form337Payload }) {
  return (
    <Document>
      <Page size="LETTER" style={base.page}>
        {/* Header */}
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>MAJOR REPAIR AND ALTERATION</Text>
            <Text style={base.headerSub}>FAA Form 337 — (Ref. 14 CFR Part 43)</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[base.headerSub, { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#fff' }]}>
              {p.documentNumber}
            </Text>
            <Text style={base.headerSub}>Issued {fmt(p.issuedAt)}</Text>
          </View>
        </View>

        {/* Aircraft Identity */}
        <SectionTitle>Aircraft Identification (Blocks 1–6)</SectionTitle>
        <View style={base.row}>
          <Field label="1. Nationality & Registration Mark" value={p.nNumber} flex={2} />
          <Field label="2. Make" value={p.make} flex={2} />
          <Field label="3. Model" value={p.model} flex={2} />
          <Field label="Year" value={p.year} flex={1} />
        </View>
        <View style={base.row}>
          <Field label="4. Aircraft Serial Number" value={p.serial} flex={3} />
          <Field label="5. Certificate of Airworthiness No." value="—" flex={3} />
          <Field label="6. Repair Station Cert. No." value={p.stationCertNumber} flex={2} />
        </View>

        {/* Owner */}
        <SectionTitle>Registered Owner</SectionTitle>
        <View style={base.row}>
          <Field label="Name" value={p.ownerName} flex={3} />
          <Field label="Address" value={p.ownerAddress} flex={5} />
        </View>

        {/* Type of Work */}
        <SectionTitle>7. Type of Operation</SectionTitle>
        <View style={base.row}>
          <View style={[base.box, { flex: 1, marginRight: 8 }]}>
            <Text style={base.boxTitle}>Work Type</Text>
            <Text style={base.bold}>{p.workType === 'MAJOR_REPAIR' ? '☑ Major Repair  ☐ Major Alteration' : '☐ Major Repair  ☑ Major Alteration'}</Text>
          </View>
          <View style={[base.box, { flex: 1 }]}>
            <Text style={base.boxTitle}>System / Unit Affected</Text>
            <Text style={base.bold}>
              {p.systemCategory === 'AIRFRAME'   ? '☑ Airframe  ☐ Powerplant  ☐ Propeller  ☐ Radio  ☐ Other' :
               p.systemCategory === 'POWERPLANT' ? '☐ Airframe  ☑ Powerplant  ☐ Propeller  ☐ Radio  ☐ Other' :
               p.systemCategory === 'PROPELLER'  ? '☐ Airframe  ☐ Powerplant  ☑ Propeller  ☐ Radio  ☐ Other' :
               p.systemCategory === 'RADIO'      ? '☐ Airframe  ☐ Powerplant  ☐ Propeller  ☑ Radio  ☐ Other' :
                                                   '☐ Airframe  ☐ Powerplant  ☐ Propeller  ☐ Radio  ☑ Other'}
            </Text>
          </View>
        </View>

        {/* Reference & Work */}
        <SectionTitle>8. Description of Work Accomplished</SectionTitle>
        <View style={base.row}>
          <Field label="Compliance Type" value={p.complianceType} flex={2} />
          <Field label="Reference (AD / SB / STC No.)" value={p.referenceId} flex={3} />
          <Field label="Work Order No." value={p.workOrderNumber} flex={2} />
          <Field label="Date Completed" value={fmt(p.completedAt)} flex={2} />
        </View>
        {p.derFee != null && (
          <View style={base.row}>
            <Field label="DER Fee" value={`$${p.derFee.toFixed(2)}`} flex={2} />
            {p.stcFee != null && <Field label="STC Fee" value={`$${p.stcFee.toFixed(2)}`} flex={2} />}
            <View style={{ flex: 4 }} />
          </View>
        )}
        <View style={[base.box, { minHeight: 60 }]}>
          <Text style={base.boxTitle}>Description of Work Accomplished</Text>
          <Text>{p.description}</Text>
        </View>

        {/* Repair Station */}
        <SectionTitle>Certificated Repair Station / Mechanic</SectionTitle>
        <View style={base.row}>
          <Field label="Repair Station Name" value={p.stationName} flex={3} />
          <Field label="Certificate No." value={p.stationCertNumber} flex={2} />
          <Field label="Address" value={p.stationAddress} flex={4} />
        </View>

        {/* Conformity Statement */}
        <SectionTitle>9. Conformity Statement — Return to Service</SectionTitle>
        <View style={[base.box, { marginBottom: 12 }]}>
          <Text style={[base.italic, { fontSize: 8, marginBottom: 6 }]}>
            I certify that the repair and/or alteration described in this document complies with the applicable regulations of the Federal Aviation Regulations and that the work was done in accordance with the standards of 14 CFR Part 43.
          </Text>
          <View style={base.signatureBlock}>
            <SigField label="Signature of Authorized Inspector / IA" signatureImageUrl={p.signatureImageUrl} />
            <Field label="A&P / IA Certificate No." value={p.mechanicCertNumber} flex={1} />
            <Field label="Name (Print)" value={p.certifyingTechnician} flex={1} />
            <Field label="Date" value={fmt(p.issuedAt)} flex={1} />
          </View>
        </View>

        {/* Footer */}
        <View style={base.footer}>
          <Text style={base.footerText}>Generated by Arsenal Analytics MRO — {p.stationName}</Text>
          <Text style={base.footerText}>FAA Form 337 — Doc No. {p.documentNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Form 8130-3 ──────────────────────────────────────────────────────────────

function Cert8130Doc({ p }: { p: Cert8130Payload }) {
  return (
    <Document>
      <Page size="LETTER" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>AUTHORIZED RELEASE CERTIFICATE</Text>
            <Text style={base.headerSub}>FAA Form 8130-3 / Airworthiness Approval Tag</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[base.headerSub, { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#fff' }]}>{p.documentNumber}</Text>
            <Text style={base.headerSub}>Issued {fmt(p.issuedAt)}</Text>
          </View>
        </View>

        <SectionTitle>Block 1–4: Article & Work Order</SectionTitle>
        <View style={base.row}>
          <Field label="1. Description of Article" value={p.partDescription} flex={4} />
          <Field label="2. Part Number" value={p.partNumber} flex={2} />
          <Field label="3. Work Order / Ref. No." value={p.workOrderNumber} flex={2} />
        </View>
        <View style={base.row}>
          <Field label="4a. Serial / Batch No." value={p.serialNumber ?? p.batchNumber} flex={2} />
          <Field label="4b. Lot Number" value={p.lotNumber} flex={2} />
          <Field label="5. Quantity" value={p.quantity} flex={1} />
          <Field label="6. Condition" value={p.condition} flex={1} />
        </View>

        {(p.nNumber || p.make) && (
          <>
            <SectionTitle>Aircraft Reference (if applicable)</SectionTitle>
            <View style={base.row}>
              <Field label="Registration Mark" value={p.nNumber} />
              <Field label="Make" value={p.make} />
              <Field label="Model" value={p.model} />
            </View>
          </>
        )}

        <SectionTitle>Block 9: Status / Work Performed</SectionTitle>
        <View style={[base.box, { minHeight: 40 }]}>
          <Text style={base.boxTitle}>Description of Work / Status</Text>
          <Text>{p.workDescription ?? 'Inspected and found airworthy per applicable standards.'}</Text>
        </View>

        {p.remarks && (
          <>
            <SectionTitle>Block 10: Remarks</SectionTitle>
            <View style={[base.box, { minHeight: 30 }]}>
              <Text>{p.remarks}</Text>
            </View>
          </>
        )}

        <SectionTitle>Block 11–12: Certifying Statement</SectionTitle>
        <View style={[base.box, { marginBottom: 12 }]}>
          <Text style={[base.italic, { fontSize: 8, marginBottom: 6 }]}>
            I certify that the work identified in this document was performed in accordance with the requirements of 14 CFR Part 43 and/or the applicable airworthiness requirements and that the item identified above is approved for return to service.
          </Text>
          <View style={base.signatureBlock}>
            <SigField label="Authorized Signature" signatureImageUrl={p.signatureImageUrl} />
            <Field label="Certificate No." value={p.mechanicCertNumber} flex={1} />
            <Field label="Name (Print)" value={p.certifyingTechnician} flex={1} />
            <Field label="Date" value={fmt(p.issuedAt)} flex={1} />
          </View>
        </View>

        <SectionTitle>Block 13: Repair Station</SectionTitle>
        <View style={base.row}>
          <Field label="Station Name" value={p.stationName} flex={3} />
          <Field label="Certificate No." value={p.stationCertNumber} flex={2} />
          <Field label="Address" value={p.stationAddress} flex={4} />
        </View>

        <View style={base.footer}>
          <Text style={base.footerText}>Generated by Arsenal Analytics MRO — {p.stationName}</Text>
          <Text style={base.footerText}>FAA Form 8130-3 — Doc No. {p.documentNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Maintenance Release ──────────────────────────────────────────────────────

function MaintenanceReleaseDoc({ p }: { p: MaintenanceReleasePayload }) {
  return (
    <Document>
      <Page size="LETTER" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>MAINTENANCE RELEASE — RETURN TO SERVICE</Text>
            <Text style={base.headerSub}>{p.stationName}{p.stationCertNumber ? `  |  Cert. ${p.stationCertNumber}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[base.headerSub, { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#fff' }]}>{p.documentNumber}</Text>
            <Text style={base.headerSub}>Issued {fmt(p.issuedAt)}</Text>
          </View>
        </View>

        <SectionTitle>Aircraft</SectionTitle>
        <View style={base.row}>
          <Field label="Registration" value={p.nNumber} flex={1} />
          <Field label="Make" value={p.make} flex={2} />
          <Field label="Model" value={p.model} flex={2} />
          <Field label="Serial No." value={p.serial} flex={2} />
          <Field label="Work Order" value={p.workOrderNumber} flex={1} />
          <Field label="Date Completed" value={fmt(p.dateCompleted)} flex={2} />
        </View>

        <SectionTitle>Work Performed</SectionTitle>
        <View style={[base.box, { minHeight: 36 }]}>
          <Text style={base.boxTitle}>General Description</Text>
          <Text>{p.workDescription}</Text>
        </View>

        {p.squawksAddressed.length > 0 && (
          <>
            <SectionTitle>Squawks / Defects Addressed</SectionTitle>
            {p.squawksAddressed.map((sq, i) => (
              <View key={i} style={[base.box, { marginBottom: 4 }]}>
                <Text style={[base.bold, { marginBottom: 2 }]}>{i + 1}. {sq.description}</Text>
                {sq.correctiveAction && (
                  <Text style={{ color: '#475569' }}>Corrective Action: {sq.correctiveAction}</Text>
                )}
              </View>
            ))}
          </>
        )}

        <SectionTitle>Labor Summary</SectionTitle>
        <View style={base.row}>
          <Field label="Total Hours" value={p.hoursTotal} flex={1} />
          <Field label="Technicians" value={p.technicians.map(t => t.name).join(', ')} flex={5} />
        </View>

        <SectionTitle>Certifying Statement — Return to Service</SectionTitle>
        <View style={[base.box, { marginBottom: 12 }]}>
          <Text style={[base.italic, { fontSize: 8, marginBottom: 8 }]}>
            I hereby certify that the maintenance described above was performed in accordance with the current instructions of the manufacturer and/or the standards of 14 CFR Part 43, and that the aircraft is approved for return to service.
          </Text>
          {p.technicians.map((tech, i) => (
            <View key={i} style={[base.signatureBlock, { marginTop: i > 0 ? 8 : 0 }]}>
              <SigField
                label={`Signature — ${tech.name}`}
                signatureImageUrl={i === 0 ? p.signatureImageUrl : undefined}
              />
              <Field label="A&P / IA Cert(s)" value={tech.certifications?.join(', ')} flex={1} />
              <Field label="Date" value={fmt(p.issuedAt)} flex={1} />
            </View>
          ))}
        </View>

        <View style={base.footer}>
          <Text style={base.footerText}>Generated by Arsenal Analytics MRO — {p.stationName}</Text>
          <Text style={base.footerText}>Maintenance Release — Doc No. {p.documentNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Logbook Entry ────────────────────────────────────────────────────────────

function LogbookEntryDoc({ p }: { p: LogbookEntryPayload }) {
  return (
    <Document>
      <Page size="LETTER" style={base.page}>
        <View style={base.headerBar}>
          <View>
            <Text style={base.headerTitle}>AIRCRAFT LOGBOOK ENTRY</Text>
            <Text style={base.headerSub}>{p.stationName}{p.stationCertNumber ? `  |  Cert. ${p.stationCertNumber}` : ''}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[base.headerSub, { fontFamily: 'Helvetica-Bold', fontSize: 9, color: '#fff' }]}>{p.documentNumber}</Text>
            <Text style={base.headerSub}>Issued {fmt(p.issuedAt)}</Text>
          </View>
        </View>

        <SectionTitle>Aircraft</SectionTitle>
        <View style={base.row}>
          <Field label="Registration" value={p.nNumber} />
          <Field label="Make" value={p.make} />
          <Field label="Model" value={p.model} />
          <Field label="Serial No." value={p.serial} />
          {p.ttsn != null && <Field label="TTSN (hrs)" value={p.ttsn} />}
        </View>

        <SectionTitle>Maintenance Entry</SectionTitle>
        <View style={base.row}>
          <Field label="Date Performed" value={fmt(p.dateCompleted)} flex={2} />
          <Field label="Hours Labored" value={p.hoursLabored} flex={1} />
          <Field label="Work Order No." value={p.workOrderNumber} flex={2} />
        </View>
        <View style={[base.box, { minHeight: 80 }]}>
          <Text style={base.boxTitle}>Description of Work Performed</Text>
          <Text>{p.description}</Text>
        </View>

        <SectionTitle>Certifying Technician</SectionTitle>
        <View style={[base.box, { marginBottom: 12 }]}>
          <Text style={[base.italic, { fontSize: 8, marginBottom: 8 }]}>
            I certify that this aircraft has been inspected in accordance with the applicable maintenance requirements and is approved for return to service.
          </Text>
          <View style={base.signatureBlock}>
            <SigField label="Signature" signatureImageUrl={p.signatureImageUrl} />
            <Field label="Name (Print)" value={p.technicianName} flex={1} />
            <Field label="Cert(s)" value={p.certifications?.join(', ')} flex={1} />
            <Field label="Date" value={fmt(p.issuedAt)} flex={1} />
          </View>
        </View>

        <View style={base.footer}>
          <Text style={base.footerText}>Generated by Arsenal Analytics MRO — {p.stationName}</Text>
          <Text style={base.footerText}>Logbook Entry — Doc No. {p.documentNumber}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Parts Tag ────────────────────────────────────────────────────────────────

const conditionLabel: Record<string, string> = {
  NEW: 'NEW — Unused, traceable to manufacturer',
  OH:  'O/H — Overhauled to manufacturer specs',
  SV:  'SV — Serviceable, inspected airworthy',
  AR:  'AR — As Removed',
};

function PartsTagDoc({ p }: { p: PartsTagPayload }) {
  const condColor = p.condition === 'NEW' ? '#166534'
    : p.condition === 'OH' ? '#1e40af'
    : p.condition === 'SV' ? '#92400e'
    : '#7f1d1d';

  return (
    <Document>
      <Page size={{ width: 396, height: 288 }} style={{ ...base.page, padding: 20 }}>
        {/* Colored condition banner */}
        <View style={{ backgroundColor: condColor, padding: '6 10', marginBottom: 8, borderRadius: 3 }}>
          <Text style={{ color: '#fff', fontFamily: 'Helvetica-Bold', fontSize: 11 }}>
            {p.condition} — {['NEW', 'OH', 'SV', 'AR'].includes(p.condition) ? conditionLabel[p.condition] : p.condition}
          </Text>
        </View>

        <View style={base.row}>
          <Field label="Part Number" value={p.partNumber} flex={2} />
          <Field label="Quantity" value={p.quantity} flex={1} />
          <Field label="Doc No." value={p.documentNumber} flex={2} />
        </View>
        <View style={[base.box, { marginBottom: 4 }]}>
          <Text style={base.bold}>{p.partDescription}</Text>
        </View>

        {(p.serialNumber || p.lotNumber || p.batchNumber) && (
          <View style={base.row}>
            {p.serialNumber  && <Field label="Serial No."  value={p.serialNumber} />}
            {p.lotNumber     && <Field label="Lot No."     value={p.lotNumber} />}
            {p.batchNumber   && <Field label="Batch No."   value={p.batchNumber} />}
          </View>
        )}

        <View style={base.row}>
          <Field label="Tagged By" value={p.taggedBy} flex={2} />
          <Field label="Tagged" value={fmt(p.taggedAt)} flex={2} />
          {p.workOrderNumber && <Field label="WO No." value={p.workOrderNumber} flex={1} />}
        </View>

        {p.notes && <View style={base.box}><Text style={{ fontSize: 8 }}>{p.notes}</Text></View>}

        <View style={{ borderTop: '1 solid #e2e8f0', paddingTop: 4, marginTop: 6 }}>
          <Text style={{ fontSize: 6, color: '#94a3b8' }}>{p.stationName}{p.stationCertNumber ? `  |  Cert. ${p.stationCertNumber}` : ''}</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Render dispatcher ────────────────────────────────────────────────────────

export async function renderDocumentPdf(
  type: string,
  payload: Record<string, unknown>,
): Promise<Buffer> {
  let element: React.ReactElement;

  switch (type) {
    case 'FORM_337':
      element = <Form337Doc p={payload as unknown as Form337Payload} />;
      break;
    case 'CERT_8130_3':
      element = <Cert8130Doc p={payload as unknown as Cert8130Payload} />;
      break;
    case 'MAINT_RELEASE':
      element = <MaintenanceReleaseDoc p={payload as unknown as MaintenanceReleasePayload} />;
      break;
    case 'LOGBOOK_ENTRY':
      element = <LogbookEntryDoc p={payload as unknown as LogbookEntryPayload} />;
      break;
    case 'PARTS_TAG':
      element = <PartsTagDoc p={payload as unknown as PartsTagPayload} />;
      break;
    default:
      throw new Error(`Unknown document type: ${type}`);
  }

  return renderToBuffer(element as React.ReactElement<DocumentProps>);
}
