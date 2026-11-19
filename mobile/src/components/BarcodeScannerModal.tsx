import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Vibration,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

interface BarcodeScannerModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export function BarcodeScannerModal({
  visible,
  onClose,
  onScan,
  title = 'Scan Product Barcode',
}: BarcodeScannerModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [manualCode, setManualCode] = useState('');
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (visible) {
      setScanned(false);
      setManualCode('');
      setTorchEnabled(false);
    }
  }, [visible]);

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (scanned || !result.data) return;
    setScanned(true);
    try {
      Vibration.vibrate(80);
    } catch {
      // Ignore vibration error on emulators/unsupported devices
    }
    onScan(result.data.trim());
    onClose();
  };

  const handleManualSubmit = () => {
    if (!manualCode.trim()) return;
    onScan(manualCode.trim());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn} accessibilityLabel="Close scanner">
            <Ionicons name="close" size={26} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() => setTorchEnabled((prev) => !prev)}
              style={styles.headerBtn}
              accessibilityLabel="Toggle torch"
            >
              <Ionicons
                name={torchEnabled ? 'flash' : 'flash-off'}
                size={22}
                color={torchEnabled ? '#facc15' : '#ffffff'}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              style={[styles.headerBtn, { marginLeft: 8 }]}
              accessibilityLabel="Switch camera"
            >
              <Ionicons name="camera-reverse-outline" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Camera / Permission View */}
        <View style={styles.cameraContainer}>
          {!permission ? (
            <View style={styles.centeredNotice}>
              <ActivityIndicator size="large" color="#2563eb" />
              <Text style={styles.noticeText}>Checking camera permissions...</Text>
            </View>
          ) : !permission.granted ? (
            <View style={styles.centeredNotice}>
              <Ionicons name="camera-outline" size={56} color="#94a3b8" />
              <Text style={styles.noticeTitle}>Camera Access Required</Text>
              <Text style={styles.noticeText}>
                StockSmart needs camera access to instantly scan retail barcodes & QR codes.
              </Text>
              <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                <Text style={styles.permissionBtnText}>Grant Camera Permission</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <CameraView
              style={StyleSheet.absoluteFill}
              facing={facing}
              enableTorch={torchEnabled}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'qr',
                  'ean13',
                  'ean8',
                  'code128',
                  'code39',
                  'upc_a',
                  'upc_e',
                  'codabar',
                  'itf14',
                ],
              }}
              onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
            >
              {/* Scan Reticle & Overlay */}
              <View style={styles.overlay}>
                <View style={styles.unfocusedTop} />
                <View style={styles.middleRow}>
                  <View style={styles.unfocusedSide} />
                  <View style={styles.reticleBox}>
                    <View style={[styles.corner, styles.cornerTL]} />
                    <View style={[styles.corner, styles.cornerTR]} />
                    <View style={[styles.corner, styles.cornerBL]} />
                    <View style={[styles.corner, styles.cornerBR]} />
                    <View style={styles.scanLaser} />
                  </View>
                  <View style={styles.unfocusedSide} />
                </View>
                <View style={styles.unfocusedBottom}>
                  <Text style={styles.reticleHint}>Align barcode / SKU within target frame</Text>
                </View>
              </View>
            </CameraView>
          )}
        </View>

        {/* Bottom Manual Entry Fallback */}
        <View style={styles.manualEntryContainer}>
          <Text style={styles.manualLabel}>Manual SKU / Barcode Entry Fallback:</Text>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. 8901030382901 or SKU-001"
              placeholderTextColor="#94a3b8"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={handleManualSubmit}
            />
            <TouchableOpacity style={styles.manualSubmitBtn} onPress={handleManualSubmit}>
              <Text style={styles.manualSubmitText}>Enter</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#000000',
  },
  overlay: {
    ...StyleSheet.absoluteFill,
  },
  unfocusedTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  middleRow: {
    flexDirection: 'row',
    height: 240,
  },
  unfocusedSide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  reticleBox: {
    width: 280,
    height: 240,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38bdf8',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 6,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 6,
  },
  scanLaser: {
    width: '90%',
    height: 2,
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  unfocusedBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    paddingTop: 24,
  },
  reticleHint: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  centeredNotice: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0f172a',
  },
  noticeTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginTop: 16,
    marginBottom: 8,
  },
  noticeText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  permissionBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  manualEntryContainer: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  manualLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 8,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  manualInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#475569',
  },
  manualSubmitBtn: {
    marginLeft: 10,
    height: 44,
    paddingHorizontal: 20,
    backgroundColor: '#0284c7',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  manualSubmitText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },
});
