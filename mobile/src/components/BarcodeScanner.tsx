import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Button } from './Button';

interface BarcodeScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string, type: string) => void;
  title?: string;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  visible,
  onClose,
  onScan,
  title = 'مسح الباركود',
}) => {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
    if (!visible) {
      setScanned(false);
    }
  }, [visible, permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    onScan(data, type);
    setTimeout(() => {
      setScanned(false);
      onClose();
    }, 300);
  };

  if (!visible) return null;

  if (!permission) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <Text style={{ color: '#fff', textAlign: 'center' }}>جاري التحميل...</Text>
        </View>
      </Modal>
    );
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={[styles.container, { backgroundColor: 'rgba(0,0,0,0.9)' }]}>
          <View style={[styles.permissionCard, { backgroundColor: theme.surface }]}>
            <Ionicons name="camera-outline" size={48} color={theme.primary} />
            <Text style={[styles.permissionTitle, { color: theme.textPrimary }]}>
              نحتاج إلى إذن الكاميرا
            </Text>
            <Text style={[styles.permissionText, { color: theme.textMuted }]}>
              للمسح الباركود، نحتاج إلى الوصول إلى الكاميرا
            </Text>
            <Button title="منح الإذن" onPress={requestPermission} />
            <Button title="إلغاء" variant="secondary" onPress={onClose} />
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.scannerContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'ean13',
              'ean8',
              'code128',
              'code39',
              'code93',
              'upc_a',
              'upc_e',
              'pdf417',
              'aztec',
              'datamatrix',
            ],
          }}
          enableTorch={flashOn}
        />

        {/* Header */}
        <View style={[styles.header, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <TouchableOpacity onPress={() => setFlashOn(!flashOn)} style={styles.flashButton}>
            <Ionicons name={flashOn ? 'flash' : 'flash-off'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scanning Frame */}
        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        {/* Instructions */}
        <View style={[styles.instructions, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Text style={styles.instructionText}>وجّه الكاميرا نحو الباركود</Text>
          {scanned && (
            <Text style={[styles.instructionText, { color: theme.success }]}>✓ تم المسح بنجاح</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionCard: {
    padding: 24,
    borderRadius: 16,
    gap: 16,
    alignItems: 'center',
    maxWidth: 320,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  flashButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    position: 'absolute',
    top: '35%',
    left: '15%',
    width: '70%',
    height: '25%',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#4CAF50',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructions: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
});

