import React, { useState, useMemo } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View, Text, Platform, TextInput, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useApp } from '@/context/AppContext';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { places, logout } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc'>('date-desc');

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  const filteredAndSortedPlaces = useMemo(() => {
    let result = [...places];

    // 1. Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (place) =>
          place.title.toLowerCase().includes(query) ||
          (place.address && place.address.toLowerCase().includes(query))
      );
    }

    // 2. Sort by option
    result.sort((a, b) => {
      if (sortOption === 'date-desc') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOption === 'date-asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortOption === 'name-asc') {
        return a.title.localeCompare(b.title);
      } else if (sortOption === 'name-desc') {
        return b.title.localeCompare(a.title);
      }
      return 0;
    });

    return result;
  }, [places, searchQuery, sortOption]);

  return (
    <View style={styles.screenContainer}>
      {/* Header with status bar padding */}
      <View style={[styles.header, { paddingTop: insets.top + 15, paddingBottom: 15 }]}>
        <Text style={styles.headerText}>Meine Orte</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Search and Sort Section */}
      <View style={styles.searchSortContainer}>
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Orte oder Adressen suchen..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Horizontal Sort Options */}
        <View style={styles.sortContainer}>
          <Text style={styles.sortLabel}>Sortieren:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.chipsContainer}
          >
            <TouchableOpacity 
              style={[styles.chip, sortOption === 'date-desc' && styles.activeChip]} 
              onPress={() => setSortOption('date-desc')}
            >
              <Text style={[styles.chipText, sortOption === 'date-desc' && styles.activeChipText]}>
                Datum ⬇ (Neu)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.chip, sortOption === 'date-asc' && styles.activeChip]} 
              onPress={() => setSortOption('date-asc')}
            >
              <Text style={[styles.chipText, sortOption === 'date-asc' && styles.activeChipText]}>
                Datum ⬆ (Alt)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.chip, sortOption === 'name-asc' && styles.activeChip]} 
              onPress={() => setSortOption('name-asc')}
            >
              <Text style={[styles.chipText, sortOption === 'name-asc' && styles.activeChipText]}>
                Ort A-Z
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.chip, sortOption === 'name-desc' && styles.activeChip]} 
              onPress={() => setSortOption('name-desc')}
            >
              <Text style={[styles.chipText, sortOption === 'name-desc' && styles.activeChipText]}>
                Ort Z-A
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>

      {/* Main List */}
      <FlatList
        style={styles.flatList}
        contentContainerStyle={styles.listContent}
        data={filteredAndSortedPlaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
              router.push({
                pathname: '/detail',
                params: { id: item.id },
              });
            }}
          >
            <Image
              style={styles.listItemImage}
              source={{ uri: item.imageUri }}
              resizeMode="cover"
            />
            <Text style={styles.listItemTitle}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={18} color="#ccc" style={styles.chevron} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Keine Ergebnisse gefunden.</Text>
              <Text style={styles.emptySubtext}>Passe deine Suche an, um gespeicherte Orte zu finden.</Text>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="map-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Noch keine Orte gespeichert.</Text>
              <Text style={styles.emptySubtext}>Klicke auf das Plus-Symbol, um deinen ersten Ort hinzuzufügen.</Text>
            </View>
          )
        }
      />

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        onPress={() => router.push('/add')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={30} color="white" />
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#0069d9',
  },
  headerText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 20,
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: '#ffffff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  searchSortContainer: {
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 15,
    gap: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#495057',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6c757d',
    textTransform: 'uppercase',
  },
  chipsContainer: {
    gap: 8,
    paddingRight: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#e9ecef',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  activeChip: {
    backgroundColor: '#007bff',
    borderColor: '#007bff',
  },
  chipText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  activeChipText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  flatList: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  listContent: {
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    backgroundColor: '#ffffff',
  },
  listItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#dddddd',
  },
  listItemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
    marginLeft: 15,
  },
  chevron: {
    marginLeft: 10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#28a745',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 4px rgba(0, 0, 0, 0.3)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
      },
    }),
    zIndex: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    marginTop: 60,
    backgroundColor: '#ffffff',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666666',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999999',
    marginTop: 8,
    textAlign: 'center',
  },
});

