import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { supabase } from '@/lib/supabase';

WebBrowser.maybeCompleteAuthSession();

export interface User {
  email: string;
  name: string;
}

export interface Place {
  id: string;
  title: string;
  imageUri: string;
  latitude: number;
  longitude: number;
  address: string;
  createdAt: string;
}

interface AppContextType {
  user: User | null;
  places: Place[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  logout: () => Promise<void>;
  addPlace: (title: string, imageUri: string, latitude: number, longitude: number, address: string) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  updatePlace: (id: string, newTitle: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load user and places on startup & listen to auth changes
  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        });
        loadPlaces(session.user.id);
      } else {
        setUser(null);
        setPlaces([]);
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'User',
        });
        loadPlaces(session.user.id);
      } else {
        setUser(null);
        setPlaces([]);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadPlaces = async (userId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('places')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedPlaces: Place[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          imageUri: item.image_url,
          latitude: item.latitude,
          longitude: item.longitude,
          address: item.address,
          createdAt: item.created_at,
        }));
        setPlaces(formattedPlaces);
      }
    } catch (error) {
      console.error('Error loading places from Supabase:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      return !!data.user;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (name: string, email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      if (error) throw error;
      return !!data.user;
    } catch (error) {
      console.error('Registration error:', error);
      return false;
    }
  };

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      // Let Expo automatically determine the scheme (exp:// for Expo Go, geomemo:// for standalone builds)
      const redirectUrl = Linking.createURL('/dashboard');
      console.log('Generated Redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;
      console.log('Supabase Auth URL:', data?.url);

      if (data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
        if (res.type === 'success' && res.url) {
          // Convert hash fragment (#) to query parameters (?) to parse tokens
          const urlObj = res.url.replace('#', '?');
          const parsedUrl = Linking.parse(urlObj);
          const { access_token, refresh_token } = parsedUrl.queryParams || {};
          
          if (access_token && refresh_token) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: access_token as string,
              refresh_token: refresh_token as string,
            });
            if (sessionError) throw sessionError;
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Google sign in error:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const addPlace = async (
    title: string,
    imageUri: string,
    latitude: number,
    longitude: number,
    address: string
  ) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      // 1. Upload image to Supabase Storage
      const fileExt = imageUri.split('.').pop() || 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${currentUser.id}/${fileName}`;

      let fileBody: any;
      if (Platform.OS === 'web') {
        const response = await fetch(imageUri);
        fileBody = await response.blob();
      } else {
        const FileSystem = require('expo-file-system/legacy');
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Convert base64 to ArrayBuffer (supported natively on Hermes/React Native)
        const binaryString = atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        fileBody = bytes.buffer;
      }

      const { error: uploadError } = await supabase.storage
        .from('places')
        .upload(filePath, fileBody, {
          contentType: `image/${fileExt === 'png' ? 'png' : 'jpeg'}`,
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // 2. Get public URL of the uploaded image
      const { data: { publicUrl } } = supabase.storage
        .from('places')
        .getPublicUrl(filePath);

      // 3. Insert place record into the database
      const { error: insertError } = await supabase
        .from('places')
        .insert({
          title,
          image_url: publicUrl,
          latitude,
          longitude,
          address: address || 'Unbekannter Ort',
          user_id: currentUser.id,
        });

      if (insertError) throw insertError;

      // Refresh the places list
      await loadPlaces(currentUser.id);
    } catch (error) {
      console.error('Error adding place to Supabase:', error);
      throw error;
    }
  };

  const deletePlace = async (id: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      // 1. Get the place to find the image URL
      const { data: placeData, error: fetchError } = await supabase
        .from('places')
        .select('image_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // 2. Delete the image from Supabase Storage if it exists
      if (placeData?.image_url) {
        const urlParts = placeData.image_url.split('/public/places/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          await supabase.storage.from('places').remove([filePath]);
        }
      }

      // 3. Delete the place record from the database
      const { error: deleteError } = await supabase
        .from('places')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      // Refresh the places list
      await loadPlaces(currentUser.id);
    } catch (error) {
      console.error('Error deleting place from Supabase:', error);
      throw error;
    }
  };

  const updatePlace = async (id: string, newTitle: string) => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('places')
        .update({ title: newTitle })
        .eq('id', id);

      if (error) throw error;

      // Refresh the places list
      await loadPlaces(currentUser.id);
    } catch (error) {
      console.error('Error updating place in Supabase:', error);
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        user,
        places,
        isLoading,
        login,
        register,
        signInWithGoogle,
        logout,
        addPlace,
        deletePlace,
        updatePlace,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
