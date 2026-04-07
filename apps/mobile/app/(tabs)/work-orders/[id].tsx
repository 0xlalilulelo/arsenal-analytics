import { useState, useRef } from 'react';
import {
  ScrollView, View, Text, StyleSheet, RefreshControl,
  Modal, TextInput, Pressable, Switch, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Image, ActionSheetIOS, PanResponder, Animated,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors } from '@mro/tokens';
import { api } from '@/lib/api';
import { pickAndUpload, takeAndUpload } from '@/lib/upload';
import { enqueue } from '@/lib/offline-queue';
import { Card } from '@/components/ui/Card';
import { Badge, workOrderStatusVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { WorkOrderLineItem, TechnicianSummary, WorkOrderComm, CreateCommInput } from '@mro/api-client';

// ─── Log Labor Modal ───────────────────────────────────────────────────────────

interface LogLaborModalProps {
  visible: boolean;
  workOrderId: string;
  lineItems: WorkOrderLineItem[];
  onClose: () => void;
}

function LogLaborModal({ visible, workOrderId, lineItems, onClose }: LogLaborModalProps) {
  const qc = useQueryClient();
  const { data: techs = [] } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.technicians.list(),
    enabled: visible,
  });

  const [techId, setTechId] = useState('');
  const [lineItemId, setLineItemId] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [billable, setBillable] = useState(true);

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const selectedTech = techs.find(t => t.id === techId);
      return api.workOrders.logLabor(workOrderId, {
        technicianId: techId,
        lineItemId: lineItemId || undefined,
        date: new Date().toISOString(),
        hours: parseFloat(hours),
        rateUsed: selectedTech?.billRate ?? 0,
        billable,
        description: description || undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-order', workOrderId] });
      resetAndClose();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  function resetAndClose() {
    setTechId('');
    setLineItemId('');
    setHours('');
    setDescription('');
    setBillable(true);
    onClose();
  }

  function handleSubmit() {
    if (!techId) return Alert.alert('Validation', 'Please select a technician.');
    const h = parseFloat(hours);
    if (!h || h <= 0 || h > 24) return Alert.alert('Validation', 'Enter valid hours (0.25 – 24).');
    mutate();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Log Labor</Text>
          <Pressable onPress={resetAndClose}>
            <Text style={styles.modalClose}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <Text style={styles.fieldLabel}>Technician *</Text>
          <View style={styles.pickerList}>
            {techs.map(t => (
              <Pressable
                key={t.id}
                onPress={() => setTechId(t.id)}
                style={[styles.pickerItem, techId === t.id && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, techId === t.id && styles.pickerItemTextActive]}>
                  {t.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Task (optional)</Text>
          <View style={styles.pickerList}>
            <Pressable
              onPress={() => setLineItemId('')}
              style={[styles.pickerItem, lineItemId === '' && styles.pickerItemActive]}
            >
              <Text style={[styles.pickerItemText, lineItemId === '' && styles.pickerItemTextActive]}>
                General / No specific task
              </Text>
            </Pressable>
            {lineItems.map(li => (
              <Pressable
                key={li.id}
                onPress={() => setLineItemId(li.id)}
                style={[styles.pickerItem, lineItemId === li.id && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, lineItemId === li.id && styles.pickerItemTextActive]}>
                  {li.taskNumber} — {li.description}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Hours *</Text>
          <TextInput
            style={styles.input}
            value={hours}
            onChangeText={setHours}
            keyboardType="decimal-pad"
            placeholder="e.g. 2.5"
            placeholderTextColor={colors.content.muted}
          />

          <Text style={styles.fieldLabel}>Description</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={description}
            onChangeText={setDescription}
            placeholder="Work performed…"
            placeholderTextColor={colors.content.muted}
            multiline
            numberOfLines={3}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Billable</Text>
            <Switch
              value={billable}
              onValueChange={setBillable}
              trackColor={{ true: colors.intent.primary }}
            />
          </View>

          <View style={styles.modalActions}>
            <Button label="Log Hours" onPress={handleSubmit} loading={isPending} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Log Thread Modal ─────────────────────────────────────────────────────────

interface LogThreadModalProps {
  visible: boolean;
  workOrderId: string;
  editComm?: WorkOrderComm | null;
  onClose: () => void;
}

const DIRECTION_LABELS: Record<string, string> = { INBOUND: '← Inbound', OUTBOUND: '→ Outbound' };
const STATUS_LABELS: Record<string, string> = {
  AWAITING_REPLY: 'Awaiting Reply',
  REPLIED: 'Replied',
  RESOLVED: 'Resolved',
  INFO_ONLY: 'FYI Only',
};

function LogThreadModal({ visible, workOrderId, editComm, onClose }: LogThreadModalProps) {
  const qc = useQueryClient();
  const isEdit = !!editComm;

  const [subject, setSubject] = useState('');
  const [direction, setDirection] = useState<'INBOUND' | 'OUTBOUND'>('INBOUND');
  const [status, setStatus] = useState<'AWAITING_REPLY' | 'REPLIED' | 'RESOLVED' | 'INFO_ONLY'>('AWAITING_REPLY');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-fill when editing
  const prevEditRef = useRef<string | null>(null);
  if (editComm && prevEditRef.current !== editComm.id) {
    prevEditRef.current = editComm.id;
    setSubject(editComm.subject);
    setDirection(editComm.direction);
    setStatus(editComm.status);
    setContactName(editComm.contactName ?? '');
    setContactEmail(editComm.contactEmail ?? '');
    setNotes(editComm.notes ?? '');
  }

  const { mutate: createMutate, isPending: isCreating } = useMutation({
    mutationFn: (input: CreateCommInput) => api.communications.create(workOrderId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wo-comms', workOrderId] });
      qc.invalidateQueries({ queryKey: ['work-orders'] });
      resetAndClose();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  const { mutate: updateMutate, isPending: isUpdating } = useMutation({
    mutationFn: (input: Partial<CreateCommInput>) =>
      api.communications.update(workOrderId, editComm!.id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wo-comms', workOrderId] });
      resetAndClose();
    },
    onError: (err) => Alert.alert('Error', err.message),
  });

  function resetAndClose() {
    prevEditRef.current = null;
    setSubject('');
    setDirection('INBOUND');
    setStatus('AWAITING_REPLY');
    setContactName('');
    setContactEmail('');
    setNotes('');
    onClose();
  }

  function handleDirectionToggle(dir: 'INBOUND' | 'OUTBOUND') {
    setDirection(dir);
    if (dir === 'INBOUND') setStatus('AWAITING_REPLY');
    else setStatus('REPLIED');
  }

  function handleSubmit() {
    if (!subject.trim()) return Alert.alert('Validation', 'Subject is required.');
    const payload: CreateCommInput = {
      subject: subject.trim(),
      direction,
      status,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      notes: notes.trim() || undefined,
    };
    if (isEdit) updateMutate(payload);
    else createMutate(payload);
  }

  const isPending = isCreating || isUpdating;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={styles.modal}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{isEdit ? 'Edit Thread' : 'Log Thread'}</Text>
          <Pressable onPress={resetAndClose}>
            <Text style={styles.modalClose}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.modalBody} keyboardShouldPersistTaps="handled">
          {/* Direction toggle */}
          <Text style={styles.fieldLabel}>Direction *</Text>
          <View style={styles.directionRow}>
            {(['INBOUND', 'OUTBOUND'] as const).map(d => (
              <Pressable
                key={d}
                onPress={() => handleDirectionToggle(d)}
                style={[styles.dirBtn, direction === d && styles.dirBtnActive]}
              >
                <Text style={[styles.dirBtnText, direction === d && styles.dirBtnTextActive]}>
                  {DIRECTION_LABELS[d]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Subject *</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g. Part availability from Aviall"
            placeholderTextColor={colors.content.muted}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>Status</Text>
          <View style={styles.pickerList}>
            {(['AWAITING_REPLY', 'REPLIED', 'RESOLVED', 'INFO_ONLY'] as const).map(s => (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                style={[styles.pickerItem, status === s && styles.pickerItemActive]}
              >
                <Text style={[styles.pickerItemText, status === s && styles.pickerItemTextActive]}>
                  {STATUS_LABELS[s]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.fieldLabel}>Contact Name</Text>
          <TextInput
            style={styles.input}
            value={contactName}
            onChangeText={setContactName}
            placeholder="Customer rep, vendor contact…"
            placeholderTextColor={colors.content.muted}
          />

          <Text style={styles.fieldLabel}>Contact Email</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="email@example.com"
            placeholderTextColor={colors.content.muted}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            value={notes}
            onChangeText={t => setNotes(t.slice(0, 2000))}
            placeholder="Key details, decisions, next steps…"
            placeholderTextColor={colors.content.muted}
            multiline
            numberOfLines={4}
            maxLength={2000}
          />
          <Text style={styles.charCount}>{notes.length}/2000</Text>

          <View style={styles.modalActions}>
            <Button label={isEdit ? 'Save Changes' : 'Log Thread'} onPress={handleSubmit} loading={isPending} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Comm Card with swipe gestures ────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  AWAITING_REPLY: colors.intent.warning,
  REPLIED: colors.intent.primary,
  RESOLVED: colors.intent.success,
  INFO_ONLY: colors.content.muted,
};

function CommCard({
  comm,
  workOrderId,
  onEdit,
}: {
  comm: WorkOrderComm;
  workOrderId: string;
  onEdit: (comm: WorkOrderComm) => void;
}) {
  const qc = useQueryClient();
  const translateX = useRef(new Animated.Value(0)).current;
  const SWIPE_THRESHOLD = 60;

  const { mutate: updateStatus } = useMutation({
    mutationFn: (status: string) =>
      api.communications.update(workOrderId, comm.id, { status: status as CreateCommInput['status'] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wo-comms', workOrderId] }),
    onError: (err) => Alert.alert('Error', err.message),
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 && Math.abs(g.dy) < 20,
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx > SWIPE_THRESHOLD && comm.status === 'AWAITING_REPLY') {
          // Swipe right → mark replied
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          updateStatus('REPLIED');
        } else if (g.dx < -SWIPE_THRESHOLD) {
          // Swipe left → edit
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          onEdit(comm);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const statusColor = STATUS_COLORS[comm.status] ?? colors.content.muted;

  return (
    <View style={styles.commCardWrapper}>
      {/* Swipe hint backgrounds */}
      <View style={[styles.commSwipeHint, styles.commSwipeRight]}>
        <Text style={styles.commSwipeText}>✓ Replied</Text>
      </View>
      <View style={[styles.commSwipeHint, styles.commSwipeLeft]}>
        <Text style={styles.commSwipeText}>✎ Edit</Text>
      </View>
      <Animated.View
        style={[styles.commCard, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.commHeader}>
          <View style={[styles.dirDot, { backgroundColor: comm.direction === 'INBOUND' ? colors.intent.warning : colors.intent.primary }]} />
          <Text style={styles.commSubject} numberOfLines={1}>{comm.subject}</Text>
          <View style={[styles.statusPill, { backgroundColor: statusColor + '22', borderColor: statusColor + '66' }]}>
            <Text style={[styles.statusPillText, { color: statusColor }]}>{STATUS_LABELS[comm.status]}</Text>
          </View>
        </View>
        {comm.contactName ? (
          <Text style={styles.commContact}>
            {comm.direction === 'INBOUND' ? 'From' : 'To'}: {comm.contactName}
            {comm.contactEmail ? ` <${comm.contactEmail}>` : ''}
          </Text>
        ) : null}
        {comm.notes ? <Text style={styles.commNotes} numberOfLines={2}>{comm.notes}</Text> : null}
        <Text style={styles.commMeta}>
          {new Date(comm.occurredAt).toLocaleDateString()}
          {comm.createdBy?.name ? ` · ${comm.createdBy.name}` : ''}
        </Text>
      </Animated.View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function WorkOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const [laborModalOpen, setLaborModalOpen] = useState(false);
  const [commsModalOpen, setCommsModalOpen] = useState(false);
  const [editComm, setEditComm] = useState<WorkOrderComm | null>(null);

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => api.workOrders.get(id),
    enabled: !!id,
  });

  const { data: commsData, refetch: refetchComms } = useQuery({
    queryKey: ['wo-comms', id],
    queryFn: () => api.communications.list(id),
    enabled: !!id,
  });
  const comms = commsData?.data ?? [];
  const pendingCommsCount = commsData?.pendingCount ?? 0;

  const markCompleteMutation = useMutation({
    mutationFn: ({ lineItemId }: { lineItemId: string }) =>
      api.workOrders.updateLineItemStatus(id, lineItemId, 'COMPLETE'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-order', id] }),
    onError: (err) => Alert.alert('Error', err.message),
  });

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const incompleteTasks = data.lineItems.filter(
    li => li.status !== 'COMPLETE' && li.status !== 'SIGNED_OFF',
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: data.number,
          headerRight: () => (
            <Pressable onPress={() => setLaborModalOpen(true)} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Log Labor</Text>
            </Pressable>
          ),
        }}
      />

      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchComms(); }} tintColor={colors.intent.primary} />
        }
      >
        {/* Header */}
        <Card style={styles.headerCard}>
          <View style={styles.headerRow}>
            <Text style={styles.woNumber}>{data.number}</Text>
            <Badge label={data.status.replace(/_/g, ' ')} variant={workOrderStatusVariant(data.status)} />
          </View>
          {data.type === 'AOG' && (
            <View style={styles.aogBanner}>
              <Text style={styles.aogText}>⚡ AOG — Aircraft on Ground</Text>
            </View>
          )}
          <Text style={styles.customerName}>{data.customer.name}</Text>
          <Text style={styles.aircraft}>
            {data.aircraft.nNumber} · {data.aircraft.make} {data.aircraft.model}
          </Text>
          {data.notes ? <Text style={styles.notes}>{data.notes}</Text> : null}
        </Card>

        {/* Tasks */}
        <Text style={styles.sectionTitle}>
          Tasks ({incompleteTasks.length} remaining)
        </Text>
        {data.lineItems.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            isPending={markCompleteMutation.isPending && markCompleteMutation.variables?.lineItemId === item.id}
            onMarkComplete={() =>
              Alert.alert(
                'Mark Complete?',
                `Mark "${item.taskNumber} — ${item.description}" as complete?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Complete', onPress: () => markCompleteMutation.mutate({ lineItemId: item.id }) },
                ],
              )
            }
          />
        ))}

        {/* Labor Entries */}
        {data.laborEntries.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Labor ({data.laborEntries.reduce((s, e) => s + e.hours, 0).toFixed(2)}h logged)
            </Text>
            {data.laborEntries.map((entry) => (
              <Card key={entry.id} style={styles.laborCard}>
                <View style={styles.laborRow}>
                  <Text style={styles.laborTech}>{entry.technician.name}</Text>
                  <Text style={styles.laborHours}>{entry.hours}h</Text>
                </View>
                <Text style={styles.laborMeta}>
                  {new Date(entry.date).toLocaleDateString()} · ${entry.rateUsed}/hr
                  {!entry.billable && ' · Non-billable'}
                </Text>
                {entry.description ? (
                  <Text style={styles.laborDesc}>{entry.description}</Text>
                ) : null}
              </Card>
            ))}
          </>
        )}

        {/* Squawks */}
        {data.squawks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Squawks ({data.squawks.length})</Text>
            {data.squawks.map((s) => (
              <SquawkCard
                key={s.id}
                squawk={s}
                workOrderId={id}
                onPhotosUpdated={() => qc.invalidateQueries({ queryKey: ['work-order', id] })}
              />
            ))}
          </>
        )}
        {/* Communications */}
        <View style={styles.commsSectionHeader}>
          <Text style={styles.sectionTitle}>
            Comms ({comms.length}){pendingCommsCount > 0 ? ` · ${pendingCommsCount} pending` : ''}
          </Text>
          <Pressable
            onPress={() => { setEditComm(null); setCommsModalOpen(true); }}
            style={styles.commAddBtn}
          >
            <Text style={styles.commAddBtnText}>+ Log Thread</Text>
          </Pressable>
        </View>
        {comms.length === 0 ? (
          <Card style={styles.commsEmpty}>
            <Text style={styles.commsEmptyText}>No communications logged yet.</Text>
            <Text style={styles.commsEmptyHint}>
              Paste the WO # ({data.number}) in email subjects to keep threads organized.
            </Text>
          </Card>
        ) : (
          comms.map(comm => (
            <CommCard
              key={comm.id}
              comm={comm}
              workOrderId={id}
              onEdit={(c) => { setEditComm(c); setCommsModalOpen(true); }}
            />
          ))
        )}
      </ScrollView>

      <LogLaborModal
        visible={laborModalOpen}
        workOrderId={id}
        lineItems={data.lineItems}
        onClose={() => setLaborModalOpen(false)}
      />

      <LogThreadModal
        visible={commsModalOpen}
        workOrderId={id}
        editComm={editComm}
        onClose={() => { setCommsModalOpen(false); setEditComm(null); }}
      />
    </>
  );
}

function TaskCard({
  item,
  isPending,
  onMarkComplete,
}: {
  item: WorkOrderLineItem;
  isPending: boolean;
  onMarkComplete: () => void;
}) {
  const isDone = item.status === 'COMPLETE' || item.status === 'SIGNED_OFF';
  return (
    <Card style={[styles.taskCard, isDone && styles.taskCardDone]}>
      <View style={styles.taskHeader}>
        <Text style={styles.taskNumber}>{item.taskNumber}</Text>
        <Badge
          label={item.status.replace(/_/g, ' ')}
          variant={isDone ? 'success' : item.status === 'AWAITING_INSPECTION' ? 'gold' : 'default'}
        />
      </View>
      <Text style={styles.taskDesc}>{item.description}</Text>
      {item.referenceDoc ? <Text style={styles.taskMeta}>Ref: {item.referenceDoc}</Text> : null}
      <View style={styles.taskFooter}>
        <Text style={styles.taskMeta}>
          Est {item.estHours}h · Actual {item.actualHours}h
        </Text>
        {!isDone && (
          <Pressable onPress={onMarkComplete} style={styles.completeBtn} disabled={isPending}>
            {isPending
              ? <ActivityIndicator size="small" color={colors.intent.success} />
              : <Text style={styles.completeBtnText}>✓ Complete</Text>
            }
          </Pressable>
        )}
      </View>
    </Card>
  );
}

// ─── Squawk Card with photo attachment ────────────────────────────────────────

import type { Squawk } from '@mro/api-client';

function SquawkCard({
  squawk: s,
  workOrderId,
  onPhotosUpdated,
}: {
  squawk: Squawk;
  workOrderId: string;
  onPhotosUpdated: () => void;
}) {
  const [uploading, setUploading] = useState(false);

  async function handleAddPhoto() {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Cancel', 'Take Photo', 'Choose from Library'], cancelButtonIndex: 0 },
        async buttonIndex => {
          if (buttonIndex === 0) return;
          await doUpload(buttonIndex === 1 ? 'camera' : 'library');
        },
      );
    } else {
      // Android: show alert picker
      Alert.alert('Add Photo', 'Choose source', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera', onPress: () => doUpload('camera') },
        { text: 'Photo Library', onPress: () => doUpload('library') },
      ]);
    }
  }

  async function doUpload(source: 'camera' | 'library') {
    setUploading(true);
    try {
      const url = source === 'camera'
        ? await takeAndUpload('squawks/')
        : await pickAndUpload('squawks/');
      if (!url) return;

      const updated = [...s.photoUrls, url];
      await api.workOrders.updateSquawkPhotos(workOrderId, s.id, updated);
      onPhotosUpdated();
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card style={styles.squawkCard}>
      <View style={styles.squawkHeader}>
        <Badge label={s.status.replace(/_/g, ' ')} variant={s.isAirworthiness ? 'danger' : 'default'} />
        {s.isAirworthiness && <Text style={styles.airworthy}>AIRWORTHINESS</Text>}
      </View>
      <Text style={styles.taskDesc}>{s.description}</Text>
      {s.estTotal != null && (
        <Text style={styles.taskMeta}>Est: ${s.estTotal.toLocaleString()}</Text>
      )}

      {/* Photo thumbnails */}
      {s.photoUrls.length > 0 && (
        <View style={styles.photoRow}>
          {s.photoUrls.map((url, i) => (
            <Image key={i} source={{ uri: url }} style={styles.photoThumb} />
          ))}
        </View>
      )}

      {/* Add photo button */}
      <Pressable onPress={handleAddPhoto} disabled={uploading} style={styles.addPhotoBtn}>
        {uploading
          ? <ActivityIndicator size="small" color={colors.intent.primary} />
          : <Text style={styles.addPhotoBtnText}>+ Photo</Text>
        }
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface.base },
  content: { padding: 16, gap: 8, paddingBottom: 32 },
  headerBtn: { marginRight: 4 },
  headerBtnText: { color: colors.intent.primary, fontSize: 14, fontWeight: '600' },

  headerCard: { gap: 4 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  woNumber: { fontSize: 20, fontWeight: '700', color: colors.content.primary },
  aogBanner: {
    backgroundColor: colors.intent.danger + '22',
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
  },
  aogText: { color: colors.intent.danger, fontWeight: '700', fontSize: 13 },
  customerName: { fontSize: 15, color: colors.content.secondary, marginTop: 4 },
  aircraft: { fontSize: 13, color: colors.content.muted },
  notes: { fontSize: 13, color: colors.content.secondary, marginTop: 8, lineHeight: 18 },

  sectionTitle: {
    fontSize: 12, fontWeight: '600', color: colors.content.muted,
    textTransform: 'uppercase', letterSpacing: 1, marginTop: 12, marginBottom: 4,
  },

  taskCard: { gap: 4 },
  taskCardDone: { opacity: 0.6 },
  taskHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskNumber: { fontSize: 13, fontWeight: '700', color: colors.content.secondary },
  taskDesc: { fontSize: 14, color: colors.content.primary, marginTop: 2 },
  taskMeta: { fontSize: 12, color: colors.content.muted, marginTop: 2 },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  completeBtn: {
    backgroundColor: colors.intent.success + '22',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.intent.success + '66',
  },
  completeBtnText: { color: colors.intent.success, fontSize: 12, fontWeight: '700' },

  laborCard: { gap: 2, paddingVertical: 10 },
  laborRow: { flexDirection: 'row', justifyContent: 'space-between' },
  laborTech: { fontSize: 14, fontWeight: '600', color: colors.content.primary },
  laborHours: { fontSize: 14, fontWeight: '700', color: colors.intent.primary },
  laborMeta: { fontSize: 12, color: colors.content.muted },
  laborDesc: { fontSize: 12, color: colors.content.secondary, marginTop: 2 },

  squawkCard: { gap: 4 },
  squawkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  airworthy: { fontSize: 10, fontWeight: '700', color: colors.intent.danger, letterSpacing: 0.5 },

  // Modal
  modal: { flex: 1, backgroundColor: colors.surface.primary },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surface.panel,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: colors.content.primary },
  modalClose: { fontSize: 15, color: colors.intent.primary },
  modalBody: { padding: 16, gap: 4, paddingBottom: 40 },
  fieldLabel: {
    fontSize: 12, fontWeight: '600', color: colors.content.secondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 6,
  },
  pickerList: { gap: 4 },
  pickerItem: {
    padding: 10, borderRadius: 6,
    backgroundColor: colors.surface.panel,
    borderWidth: 1, borderColor: colors.surface.active,
  },
  pickerItemActive: {
    backgroundColor: colors.intent.primary + '22',
    borderColor: colors.intent.primary,
  },
  pickerItemText: { fontSize: 14, color: colors.content.secondary },
  pickerItemTextActive: { color: colors.intent.primary, fontWeight: '600' },
  input: {
    backgroundColor: colors.surface.panel,
    borderWidth: 1, borderColor: colors.surface.active,
    borderRadius: 6, paddingHorizontal: 14, paddingVertical: 10,
    fontSize: 15, color: colors.content.primary,
  },
  inputMultiline: { height: 80, textAlignVertical: 'top' },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: { fontSize: 15, color: colors.content.primary },
  modalActions: { marginTop: 24 },

  // Squawk photo styles
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  photoThumb: { width: 64, height: 64, borderRadius: 4, backgroundColor: colors.surface.panel },
  addPhotoBtn: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    backgroundColor: colors.surface.panel,
    borderWidth: 1,
    borderColor: colors.surface.active,
    alignSelf: 'flex-start',
    minWidth: 80,
    alignItems: 'center',
  },
  addPhotoBtnText: { color: colors.intent.primary, fontSize: 13, fontWeight: '600' },

  // Comms section
  commsSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 12, marginBottom: 4,
  },
  commAddBtn: {
    backgroundColor: colors.intent.primary + '22',
    borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: colors.intent.primary + '66',
  },
  commAddBtnText: { color: colors.intent.primary, fontSize: 12, fontWeight: '700' },

  commsEmpty: { gap: 4, alignItems: 'center', paddingVertical: 20 },
  commsEmptyText: { fontSize: 14, color: colors.content.secondary, textAlign: 'center' },
  commsEmptyHint: { fontSize: 12, color: colors.content.muted, textAlign: 'center', lineHeight: 16 },

  commCardWrapper: { position: 'relative', marginBottom: 8, borderRadius: 8, overflow: 'hidden' },
  commCard: {
    backgroundColor: colors.surface.card,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.surface.hover,
    gap: 4,
  },
  commSwipeHint: {
    position: 'absolute', top: 0, bottom: 0,
    justifyContent: 'center', paddingHorizontal: 16,
  },
  commSwipeRight: { left: 0, backgroundColor: colors.intent.success + '33' },
  commSwipeLeft: { right: 0, backgroundColor: colors.intent.primary + '33' },
  commSwipeText: { fontSize: 13, fontWeight: '700', color: colors.content.primary },

  commHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dirDot: { width: 8, height: 8, borderRadius: 4 },
  commSubject: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.content.primary },
  statusPill: {
    borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2,
    borderWidth: 1,
  },
  statusPillText: { fontSize: 11, fontWeight: '600' },
  commContact: { fontSize: 12, color: colors.content.secondary },
  commNotes: { fontSize: 12, color: colors.content.muted, lineHeight: 16 },
  commMeta: { fontSize: 11, color: colors.content.muted, marginTop: 2 },

  // Direction toggle
  directionRow: { flexDirection: 'row', gap: 8 },
  dirBtn: {
    flex: 1, padding: 10, borderRadius: 6,
    backgroundColor: colors.surface.panel,
    borderWidth: 1, borderColor: colors.surface.active,
    alignItems: 'center',
  },
  dirBtnActive: { backgroundColor: colors.intent.primary + '22', borderColor: colors.intent.primary },
  dirBtnText: { fontSize: 14, color: colors.content.secondary },
  dirBtnTextActive: { color: colors.intent.primary, fontWeight: '600' },

  charCount: { fontSize: 11, color: colors.content.muted, textAlign: 'right', marginTop: 2 },
});
