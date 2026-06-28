import React, { useState, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  View,
  Text,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import { useApp } from '@/context/AppContext';

export default function AddPlaceScreen() {
  const insets = useSafeAreaInsets();
  const { addPlace } = useApp();

  const [title, setTitle] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number>(47.3769); // Default Zürich
  const [longitude, setLongitude] = useState<number>(8.5417); // Default Zürich
  const [address, setAddress] = useState<string>('Zürich, Schweiz');
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch location on mount
  useEffect(() => {
    async function getGPSLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied');
          setLoadingLocation(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        const lat = location.coords.latitude;
        const lng = location.coords.longitude;
        setLatitude(lat);
        setLongitude(lng);

        // Reverse geocoding
        const geocode = await Location.reverseGeocodeAsync({
          latitude: lat,
          longitude: lng,
        });

        if (geocode && geocode.length > 0) {
          const first = geocode[0];
          const city = first.city || first.subregion || '';
          const country = first.country || '';
          const street = first.street || '';
          const streetNumber = first.streetNumber || '';
          
          let fullAddress = '';
          if (street) {
            fullAddress += `${street} ${streetNumber}, `;
          }
          fullAddress += `${city}, ${country}`;
          
          setAddress(fullAddress || 'Unbekannter Standort');
        } else {
          setAddress(`Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)}`);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        // Fallback is already set in state
      } finally {
        setLoadingLocation(false);
      }
    }

    getGPSLocation();
  }, []);

  const handleTakePhoto = async () => {
    try {
      const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraPermission.status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Um ein Foto aufzunehmen, wird Zugriff auf die Kamera benötigt.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Fehler', 'Das Foto konnte nicht aufgenommen werden. Falls du einen Simulator nutzt, wähle bitte ein Foto aus der Galerie.');
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (libraryPermission.status !== 'granted') {
        Alert.alert('Berechtigung erforderlich', 'Um ein Bild auszuwählen, wird Zugriff auf deine Mediathek benötigt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking from library:', error);
      Alert.alert('Fehler', 'Ein Fehler ist beim Auswählen des Fotos aufgetreten.');
    }
  };

  const handleSelectPhotoSource = () => {
    if (Platform.OS === 'web') {
      handlePickFromGallery();
      return;
    }

    Alert.alert(
      'Foto hinzufügen',
      'Möchtest du ein neues Foto aufnehmen oder eines aus deiner Galerie auswählen?',
      [
        {
          text: 'Foto aufnehmen',
          onPress: handleTakePhoto,
        },
        {
          text: 'Aus Galerie wählen',
          onPress: handlePickFromGallery,
        },
        {
          text: 'Abbrechen',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Fehler', 'Bitte gib einen Titel für den Ort ein.');
      return;
    }

    if (!imageUri) {
      Alert.alert('Fehler', 'Bitte nimm ein Foto für diesen Ort auf.');
      return;
    }

    setSaving(true);
    try {
      await addPlace(
        title.trim(),
        imageUri,
        latitude,
        longitude,
        address
      );
      router.replace('/dashboard');
    } catch (error) {
      Alert.alert('Fehler', 'Der Ort konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screenContainer}>
      {/* Header with status bar padding */}
      <View style={[styles.header, { paddingTop: insets.top + 15, paddingBottom: 15 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Neuen Ort hinzufügen</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          {/* Camera Preview Area */}
          <TouchableOpacity 
            style={styles.cameraPreview} 
            onPress={handleSelectPhotoSource}
            activeOpacity={0.9}
          >
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <View style={styles.placeholderContainer}>
                <Ionicons name="camera-outline" size={48} color="#888" />
                <Text style={styles.placeholderText}>📷 Vorschau</Text>
                <View style={styles.cameraBtn}>
                  <Text style={styles.cameraBtnText}>Foto hinzufügen</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Title Input */}
          <TextInput
            style={styles.input}
            placeholder="Titel des Ortes"
            placeholderTextColor="#888"
            value={title}
            onChangeText={setTitle}
          />

          {/* GPS Box */}
          <View style={styles.gpsBox}>
            <View style={styles.gpsHeader}>
              <Ionicons name="location" size={18} color="#007bff" />
              <Text style={styles.gpsTitle}>Aktueller Standort:</Text>
            </View>
            
            {loadingLocation ? (
              <ActivityIndicator size="small" color="#007bff" style={styles.locationLoader} />
            ) : (
              <>
                <Text style={styles.addressText}>{address}</Text>
                <Text style={styles.coordsText}>
                  Lat: {latitude.toFixed(4)}, Lng: {longitude.toFixed(4)}
                </Text>
              </>
            )}
          </View>

          {/* Buttons */}
          <TouchableOpacity 
            style={styles.btnSave} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.btnSaveText}>Speichern (Cloud-DB)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.btnCancel} 
            onPress={() => router.replace('/dashboard')}
            disabled={saving}
          >
            <Text style={styles.btnCancelText}>Abbrechen</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    backgroundColor: '#007bff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#0069d9',
  },
  backButton: {
    padding: 5,
  },
  headerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 34,
  },
  scrollContent: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    padding: 20,
    gap: 20,
    width: '100%',
    maxWidth: 450,
    alignSelf: 'center',
    backgroundColor: '#ffffff',
  },
  cameraPreview: {
    width: '100%',
    height: 220,
    backgroundColor: '#333333',
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#888888',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    width: '100%',
  },
  placeholderText: {
    color: '#ffffff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  cameraBtn: {
    marginTop: 15,
    backgroundColor: '#ffffff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  cameraBtnText: {
    color: '#333333',
    fontWeight: 'bold',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cccccc',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  gpsBox: {
    backgroundColor: '#f8f9fa',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dddddd',
    gap: 5,
  },
  gpsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'transparent',
  },
  gpsTitle: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#333333',
  },
  locationLoader: {
    marginTop: 5,
    alignSelf: 'flex-start',
  },
  addressText: {
    color: '#007bff',
    fontWeight: 'bold',
    fontSize: 15,
    marginTop: 2,
  },
  coordsText: {
    color: '#666666',
    fontSize: 12,
  },
  btnSave: {
    backgroundColor: '#28a745',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  btnSaveText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnCancel: {
    backgroundColor: 'transparent',
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    width: '100%',
  },
  btnCancelText: {
    color: '#888888',
    fontSize: 16,
    textAlign: 'center',
  },
});

