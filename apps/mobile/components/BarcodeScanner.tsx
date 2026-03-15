import { useState, useEffect } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors } from '@mro/tokens';

interface BarcodeScannerProps {
  visible: boolean;
  onScanned: (data: string) => void;
  onClose: () => void;
}

const BARCODE_TYPES: Parameters<typeof CameraView>[0]['barcodeScannerSettings'] = {
  barcodeTypes: ['code128', 'code39', 'code93', 'ean13', 'ean8', 'qr', 'upc_e'],
};

export function BarcodeScanner({ visible, onScanned, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  // Reset scanned flag when modal reopens
  useEffect(() => {
    if (visible) setScanned(false);
  }, [visible]);

  if (!visible) return null;

  if (!permission?.granted) {
    return (
      <Modal visible animationType="slide" onRequestClose={onClose}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionBody}>
            Allow Arsenal MRO to use the camera to scan part number barcodes.
          </Text>
          <Pressable style={styles.grantBtn} onPress={requestPermission}>
            <Text style={styles.grantBtnText}>Grant Permission</Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={BARCODE_TYPES}
          onBarcodeScanned={
            scanned
              ? undefined
              : ({ data }) => {
                  setScanned(true);
                  onScanned(data);
                }
          }
        />

        {/* Targeting reticle */}
        <View style={styles.overlay}>
          <View style={styles.dimTop} />
          <View style={styles.middle}>
            <View style={styles.dimSide} />
            <View style={styles.reticle}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>
            <View style={styles.dimSide} />
          </View>
          <View style={styles.dimBottom} />
        </View>

        <View style={styles.footer}>
          <Text style={styles.hint}>Point at a part number barcode</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const CORNER = 20;
const CORNER_W = 3;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },

  overlay: { ...StyleSheet.absoluteFillObject },
  dimTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  dimBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middle: { flexDirection: 'row', height: 200 },
  dimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },

  reticle: { width: 260, height: 200 },
  corner: { position: 'absolute', width: CORNER, height: CORNER, borderColor: '#fff' },
  cornerTL: { top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerTR: { top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W },
  cornerBL: { bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W },
  cornerBR: { bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingTop: 24,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    gap: 16,
  },
  hint: { color: 'rgba(255,255,255,0.8)', fontSize: 14 },
  closeBtn: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  closeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  permissionContainer: {
    flex: 1,
    backgroundColor: colors.surface.base,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  permissionTitle: { fontSize: 20, fontWeight: '700', color: colors.content.primary, textAlign: 'center' },
  permissionBody: { fontSize: 15, color: colors.content.secondary, textAlign: 'center', lineHeight: 22 },
  grantBtn: {
    backgroundColor: colors.intent.primary,
    paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 8, marginTop: 8,
  },
  grantBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { color: colors.content.muted, fontSize: 15 },
});
