import React, { useState } from 'react';
import { View, Text, StyleSheet, useColorScheme, TouchableOpacity, Image, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Colors, useThemeColors } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export default function NotesScannerScreen() {
  const theme = useColorScheme() ?? 'light';
  const colors = useThemeColors();
  const isDark = theme === 'dark';
  const styles = getStyles(colors, isDark);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultText, setResultText] = useState('');

  const pickImage = async (useCamera = false) => {
    let result;
    if (useCamera) {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission required", "Camera access is needed to scan notes.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });
    }

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      setImageUri(asset.uri);
      processImage(asset.base64 || '');
    }
  };

  const processImage = async (base64String: string) => {
    if (!base64String) return;
    setIsProcessing(true);
    setResultText('');
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const debuggerHost = Constants.expoConfig?.hostUri;
      const localIp = debuggerHost?.split(':')[0];
      const apiUrl = localIp ? `http://${localIp}:3000/api/ai/ask` : 'https://unistudy-ai.vercel.app/api/ai/ask';

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          feature: 'notes_scanner',
          payload: { 
            image: `data:image/jpeg;base64,${base64String}`,
            stream: false
          }
        })
      });

      const data = await res.json();
      const content = data.result?.choices?.[0]?.message?.content || "Could not extract text from image.";
      setResultText(content);
    } catch (e) {
      setResultText("An error occurred while processing the image. Please try again.");
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {!imageUri ? (
          <View style={styles.placeholderContainer}>
            <Ionicons name="scan" size={80} color={colors.tint} style={{ opacity: 0.5, marginBottom: 20 }} />
            <Text style={styles.title}>Notes Scanner</Text>
            <Text style={styles.description}>
              Take a photo of your handwritten notes or upload an image from your gallery. Our AI will digitize and summarize it for you.
            </Text>
            
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => pickImage(true)}>
                <Ionicons name="camera" size={24} color="#fff" />
                <Text style={styles.actionBtnText}>Take Photo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={() => pickImage(false)}>
                <Ionicons name="image" size={24} color={colors.tint} />
                <Text style={styles.secondaryBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
              <TouchableOpacity style={styles.retakeBtn} onPress={() => setImageUri(null)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.outputBox}>
              <Text style={styles.outputTitle}>Extracted Notes</Text>
              {isProcessing ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.tint} />
                  <Text style={styles.loadingText}>Analyzing handwriting...</Text>
                </View>
              ) : (
                <Text style={styles.outputText}>{resultText}</Text>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
    flexGrow: 1,
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: isDark ? '#333' : '#e0e0e0',
    borderStyle: 'dashed',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  actionBtn: {
    flex: 1,
    backgroundColor: colors.tint,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: isDark ? '#2a2a2a' : '#f0f0f0',
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: {
    color: colors.tint,
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultContainer: {
    gap: 20,
  },
  imagePreviewContainer: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  retakeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outputBox: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    minHeight: 200,
    borderWidth: 1,
    borderColor: colors.border,
  },
  outputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.tint,
    marginTop: 12,
    fontWeight: '600',
  },
  outputText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 26,
  },
});
