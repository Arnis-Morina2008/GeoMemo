import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, Image, Alert, ScrollView, View, Platform, Text, Modal, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { documentDirectory, downloadAsync, copyAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { useApp } from '@/context/AppContext';

const getTempFilename = (placeId: string) => {
  return `geomemo_${placeId}_${Date.now()}.jpg`;
};

export default function DetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { places, deletePlace, updatePlace } = useApp();

  const [isViewerVisible, setIsViewerVisible] = useState(false);
  const [savingImage, setSavingImage] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [updating, setUpdating] = useState(false);

  const place = places.find((p) => p.id === id);

  if (!place) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#dc3545" />
        <Text style={styles.errorText}>Ort nicht gefunden.</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.replace('/dashboard')}>
          <Text style={styles.errorBtnText}>Zurück zum Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleDelete = () => {
    Alert.alert(
      'Ort löschen',
      'Möchtest du diesen Ort wirklich dauerhaft löschen?',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Löschen',
          style: 'destructive',
          onPress: async () => {
            await deletePlace(place.id);
            router.replace('/dashboard');
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    setEditTitle(place.title);
    setIsEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Fehler', 'Der Name darf nicht leer sein.');
      return;
    }
    setUpdating(true);
    try {
      await updatePlace(place.id, editTitle.trim());
      Alert.alert(
        'Erfolgreich',
        'Der Ort wurde umbenannt.',
        [
          {
            text: 'OK',
            onPress: () => {
              setIsEditModalVisible(false);
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Error renaming place:', error);
      Alert.alert('Fehler', 'Der Ort konnte nicht umbenannt werden.');
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveToGallery = async () => {
    // Web Fallback
    if (Platform.OS === 'web') {
      try {
        const response = await fetch(place.imageUri);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `geomemo_${place.title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        
        Alert.alert('Heruntergeladen', 'Das Foto wurde erfolgreich im Browser heruntergeladen.');
      } catch (error) {
        // Fallback if fetch fails (e.g. CORS)
        const link = document.createElement('a');
        link.href = place.imageUri;
        link.target = '_blank';
        link.download = `geomemo_${place.title.replace(/\s+/g, '_')}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Heruntergeladen', 'Das Foto wurde in einem neuen Tab geöffnet/heruntergeladen.');
      }
      return;
    }

    setSavingImage(true);
    try {
      let localUri = place.imageUri;
      const filename = getTempFilename(place.id);
      const targetDest = `${documentDirectory}${filename}`;

      if (localUri.startsWith('http')) {
        // Download remote image
        const downloadResult = await downloadAsync(place.imageUri, targetDest);
        localUri = downloadResult.uri;
      } else {
        // Copy local image from temporary cache to document directory
        // This ensures the OS has permission to read/share the file and it has a clean .jpg extension
        try {
          await copyAsync({
            from: localUri,
            to: targetDest,
          });
          localUri = targetDest;
        } catch (copyError) {
          console.warn('Could not copy local file, trying to share original:', copyError);
        }
      }

      // Show options to user: Save to Gallery or Share
      Alert.alert(
        'Bildoptionen',
        'Möchtest du dieses Bild in deiner Galerie speichern oder teilen?',
        [
          {
            text: 'In Galerie speichern',
            onPress: async () => {
              try {
                const MediaLibrary = require('expo-media-library');
                if (!MediaLibrary || typeof MediaLibrary.requestPermissionsAsync !== 'function') {
                  throw new Error('ExpoMediaLibrary native module is not available');
                }
                const { status } = await MediaLibrary.requestPermissionsAsync();
                if (status === 'granted') {
                  await MediaLibrary.saveToLibraryAsync(localUri);
                  Alert.alert('Erfolgreich', 'Das Bild wurde in deiner Galerie gespeichert.');
                } else {
                  Alert.alert('Berechtigung verweigert', 'Zugriff auf die Mediathek ist erforderlich, um Bilder zu speichern.');
                }
              } catch (saveError) {
                console.warn('Error saving to gallery:', saveError);
                Alert.alert(
                  'Nicht unterstützt',
                  'Das Speichern in der Galerie wird in Expo Go nicht direkt unterstützt. Bitte benutze stattdessen die "Teilen"-Option, um das Bild auf deinem Gerät zu speichern.',
                  [
                    { text: 'OK' }
                  ]
                );
              }
            },
          },
          {
            text: 'Teilen',
            onPress: async () => {
              const isSharingAvailable = await Sharing.isAvailableAsync();
              if (isSharingAvailable) {
                await Sharing.shareAsync(localUri, {
                  mimeType: 'image/jpeg',
                  dialogTitle: place.title,
                  UTI: 'public.jpeg',
                });
              } else {
                Alert.alert('Fehler', 'Teilen wird auf diesem Gerät nicht unterstützt.');
              }
            },
          },
          {
            text: 'Abbrechen',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Error handling image:', error);
      Alert.alert('Fehler', 'Das Foto konnte nicht verarbeitet werden.');
    } finally {
      setSavingImage(false);
    }
  };

  // Format creation date
  const formattedDate = () => {
    const date = new Date(place.createdAt);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}.${month}.${year} um ${hours}:${minutes} Uhr`;
  };

  return (
    <View style={styles.screenContainer}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Image Header Container */}
        <View style={styles.imageContainer}>
          <TouchableOpacity 
            style={styles.imageTouch} 
            onPress={() => setIsViewerVisible(true)}
            activeOpacity={0.9}
          >
            <Image source={{ uri: place.imageUri }} style={styles.image} />
          </TouchableOpacity>

          {/* Floating Back Button */}
          <TouchableOpacity 
            style={[styles.floatingBtn, styles.backBtn, { top: insets.top + 15 }]} 
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color="white" />
            <Text style={styles.floatingBtnText}>Zurück</Text>
          </TouchableOpacity>

          {/* Floating Action Buttons (Right) */}
          <View style={[styles.rightBtnsContainer, { top: insets.top + 15 }]}>
            <TouchableOpacity 
              style={[styles.floatingBtn, styles.actionBtn]} 
              onPress={handleSaveToGallery}
              disabled={savingImage}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.floatingBtn, styles.actionBtn]} 
              onPress={handleEdit}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.floatingBtn, styles.actionBtn, styles.deleteBtn]} 
              onPress={handleDelete}
              activeOpacity={0.8}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Section */}
        <View style={styles.content}>
          <Text style={styles.title}>{place.title}</Text>

          {/* Coordinates Card */}
          <View style={styles.coordinatesCard}>
            <Text style={styles.coordinatesCardTitle}>Genaue Koordinaten</Text>
            <Text style={styles.coordinateText}>
              Breitengrad: <Text style={styles.coordinateValue}>{place.latitude.toFixed(6)}° N</Text>
            </Text>
            <Text style={styles.coordinateText}>
              Längengrad: <Text style={styles.coordinateValue}>{place.longitude.toFixed(6)}° E</Text>
            </Text>
            {place.address ? (
              <Text style={styles.addressText}>{place.address}</Text>
            ) : null}
          </View>

          {/* Save Date Info */}
          <Text style={styles.savedDateText}>
            Dieser Ort wurde am {formattedDate()} gespeichert.
          </Text>
        </View>
      </ScrollView>

      {/* Fullscreen Photo Viewer Modal */}
      <Modal
        visible={isViewerVisible}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setIsViewerVisible(false)}
      >

        <View style={[styles.modalContainer, { paddingTop: insets.top || 20, paddingBottom: insets.bottom || 20 }]}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              style={styles.modalCloseBtn} 
              onPress={() => setIsViewerVisible(false)}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.modalTitle} numberOfLines={1}>{place.title}</Text>
            <View style={{ width: 44 }} />
          </View>


          {/* Modal Image (takes up all space in between) */}
          <Image 
            source={{ uri: place.imageUri }} 
            style={styles.modalImage} 
            resizeMode="contain" 
          />

          {/* Modal Footer (with padding) */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              style={styles.modalSaveBtn} 
              onPress={handleSaveToGallery}
              disabled={savingImage}
              activeOpacity={0.8}
            >
              <Ionicons name="download-outline" size={20} color="white" />
              <Text style={styles.modalSaveBtnText}>Bild speichern / teilen</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Place Name Modal */}
      <Modal
        visible={isEditModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editCard}>
            <Text style={styles.editModalTitle}>Ort umbenennen</Text>
            <TextInput
              style={styles.editInput}
              value={editTitle}
              onChangeText={setEditTitle}
              placeholder="Name des Ortes"
              placeholderTextColor="#888"
              autoFocus
            />
            <View style={styles.editButtonsRow}>
              <TouchableOpacity 
                style={[styles.editBtn, styles.editBtnCancel]} 
                onPress={() => setIsEditModalVisible(false)}
                disabled={updating}
              >
                <Text style={styles.editBtnCancelText}>Abbrechen</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.editBtn, styles.editBtnSave]} 
                onPress={handleSaveEdit}
                disabled={updating}
              >
                <Text style={styles.editBtnSaveText}>Speichern</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  imageContainer: {
    width: '100%',
    height: 320,
    backgroundColor: '#333333',
    position: 'relative',
  },
  imageTouch: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  floatingBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  backBtn: {
    position: 'absolute',
    left: 15,
    gap: 5,
  },
  floatingBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  rightBtnsContainer: {
    position: 'absolute',
    right: 15,
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  deleteBtn: {
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 25,
    flex: 1,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 20,
  },
  coordinatesCard: {
    backgroundColor: '#f0f4f8',
    padding: 18,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
    marginBottom: 20,
    gap: 6,
  },
  coordinatesCardTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  coordinateText: {
    fontSize: 16,
    color: '#444444',
  },
  coordinateValue: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontWeight: '600',
    color: '#333333',
  },
  addressText: {
    fontSize: 14,
    color: '#666666',
    marginTop: 6,
    lineHeight: 18,
  },
  savedDateText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 15,
    marginBottom: 20,
  },
  errorBtn: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  errorBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#000000',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'transparent',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  modalImage: {
    flex: 1,
    width: '100%',
  },
  modalCloseBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFooter: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: 'transparent',
  },
  modalSaveBtn: {
    backgroundColor: '#007bff',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  modalSaveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    gap: 15,
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 5,
      },
    }),
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 5,
  },
  editInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333333',
  },
  editButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 5,
  },
  editBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtnCancel: {
    backgroundColor: 'transparent',
  },
  editBtnCancelText: {
    color: '#6c757d',
    fontSize: 16,
    fontWeight: '600',
  },
  editBtnSave: {
    backgroundColor: '#007bff',
  },
  editBtnSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
