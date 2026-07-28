import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, useColorScheme, Appearance, ActivityIndicator, Modal, FlatList, TextInput, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect } from 'react';
import { Colors, useThemeColors } from '../../constants/Colors';
import { useAuth } from '../../lib/AuthContext';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { uploadAvatar } from '../../utils/avatarUpload';
import Constants from 'expo-constants';

export default function ProfileScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const isDark = systemColorScheme === 'dark';
  const theme = systemColorScheme ?? 'light';
  const colors = useThemeColors();
  const styles = getStyles(colors, isDark);

  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  const [pushEnabled, setPushEnabled] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);

  // Academic Settings State
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [degreeModalVisible, setDegreeModalVisible] = useState(false);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const levels = ["100", "200", "300", "400", "500"];

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, institutions(name)')
        .eq('id', user.id)
        .single();
        
      if (profileData) {
        if (!profileData.institutions && profileData.institution_id) {
          const id = String(profileData.institution_id).trim();
          const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
          
          if (isUuid) {
            const { data: inst } = await supabase
              .from('institutions')
              .select('name')
              .eq('id', id)
              .maybeSingle();
            if (inst && inst.name) {
              profileData.institutions = { name: inst.name };
            } else {
              profileData.institutions = { name: 'Unknown Institution' };
            }
          } else {
            // It's a raw string
            profileData.institutions = { name: id };
          }
        }
      }
      setProfile(profileData);

      const { data: progData } = await supabase
        .from('course_programmes')
        .select('id, name')
        .order('name');
        
      if (progData) setProgrammes(progData);
      
      setLoading(false);
    }
    loadData();
  }, [user]);

  const toggleTheme = (value: boolean) => {
    Appearance.setColorScheme(value ? 'dark' : 'light');
  };

  const updateAcademicProfile = async (updates: any) => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user!.id);
      
    if (error) {
      Alert.alert('Error', 'Failed to update profile');
    } else {
      setProfile({ ...profile, ...updates });
    }
    setSaving(false);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      const uri = result.assets[0].uri;
      setProfile({ ...profile, avatar_url: uri }); // optimistic UI update
      
      try {
        const uploadedUrl = await uploadAvatar(uri);
        if (uploadedUrl) {
          await updateAcademicProfile({ avatar_url: uploadedUrl });
          Alert.alert('Success', 'Avatar updated successfully');
        } else {
          Alert.alert('Error', 'Failed to upload avatar to Cloudinary');
          // Revert on fail if needed
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Error', 'Failed to upload avatar');
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.tint} />
      </View>
    );
  }

  const institutionName = Array.isArray(profile?.institutions) 
    ? profile?.institutions[0]?.name 
    : profile?.institutions?.name;
    
  const filteredProgrammes = programmes.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} style={styles.avatar}>
            {profile?.avatar_url ? (
              <View style={[styles.avatar, { overflow: 'hidden' }]}>
                <Image source={{ uri: profile.avatar_url }} style={{ width: '100%', height: '100%' }} />
              </View>
            ) : (
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.username?.charAt(0)?.toUpperCase() || 'U'}
              </Text>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.name}>{profile?.full_name || 'Student'}</Text>
          <Text style={styles.username}>@{profile?.username || 'user'}</Text>
          <Text style={styles.institution}>{institutionName || 'Unistudy'}</Text>
          
        </View>

        <Text style={styles.sectionTitle}>Academic Details</Text>
        <View style={styles.settingsGroup}>
          {/* Degree Programme */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setDegreeModalVisible(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#3E2723' : '#EFEBE9' }]}>
                <Ionicons name="school" size={20} color={isDark ? '#D7CCC8' : '#795548'} />
              </View>
              <View>
                <Text style={styles.settingText}>Degree Programme</Text>
                <Text style={styles.settingSub}>{profile?.degree_programme || 'Not set'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Academic Level */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setLevelModalVisible(true)}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#3E2723' : '#EFEBE9' }]}>
                <Ionicons name="trending-up" size={20} color={isDark ? '#D7CCC8' : '#795548'} />
              </View>
              <View>
                <Text style={styles.settingText}>Academic Level</Text>
                <Text style={styles.settingSub}>{profile?.year_of_study ? `Level ${profile.year_of_study}` : 'Not set'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>App Settings</Text>
        <View style={styles.settingsGroup}>
          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/billing')}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#1A237E' : '#E3F2FD' }]}>
                <Ionicons name="card" size={20} color={isDark ? '#90CAF9' : '#1976D2'} />
              </View>
              <View>
                <Text style={styles.settingText}>Billing & Subscription</Text>
                <Text style={styles.settingSub}>Manage your payment plan</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.settingRow} onPress={() => router.push('/accessibility')}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#311B92' : '#EDE7F6' }]}>
                <Ionicons name="accessibility" size={20} color={isDark ? '#B39DDB' : '#6b21a8'} />
              </View>
              <View>
                <Text style={styles.settingText}>Accessibility</Text>
                <Text style={styles.settingSub}>Visual, reading, and contrast preferences</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#1A237E' : '#E3F2FD' }]}>
                <Ionicons name="moon" size={20} color={isDark ? '#90CAF9' : '#1976D2'} />
              </View>
              <Text style={styles.settingText}>Dark Mode</Text>
            </View>
            <Switch 
              value={isDark} 
              onValueChange={toggleTheme}
              trackColor={{ false: '#767577', true: colors.tint }}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? '#1B5E20' : '#E8F5E9' }]}>
                <Ionicons name="cloud-download" size={20} color={isDark ? '#A5D6A7' : '#388E3C'} />
              </View>
              <View>
                <Text style={styles.settingText}>Offline Sync</Text>
                <Text style={styles.settingSub}>Download cards for offline study</Text>
              </View>
            </View>
            <Switch 
              value={offlineSync} 
              onValueChange={setOfflineSync}
              trackColor={{ false: '#767577', true: colors.tint }}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={() => supabase.auth.signOut()}>
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Degree Modal */}
      <Modal visible={degreeModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Programme</Text>
            <TouchableOpacity onPress={() => setDegreeModalVisible(false)}>
              <Text style={{ color: colors.tint, fontSize: 16 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.searchInput, { color: colors.text, borderColor: colors.border }]}
            placeholder="Search programmes..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <FlatList
            data={filteredProgrammes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  updateAcademicProfile({ degree_programme: item.name });
                  setDegreeModalVisible(false);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>

      {/* Level Modal */}
      <Modal visible={levelModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBottom, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { marginBottom: 16 }]}>Select Level</Text>
            {levels.map(level => (
              <TouchableOpacity 
                key={level}
                style={styles.modalItem}
                onPress={() => {
                  updateAcademicProfile({ year_of_study: parseInt(level) });
                  setLevelModalVisible(false);
                }}
              >
                <Text style={{ color: colors.text, fontSize: 16 }}>Level {level}</Text>
                {profile?.year_of_study === parseInt(level) && (
                  <Ionicons name="checkmark" size={20} color={colors.tint} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.modalItem, { justifyContent: 'center', marginTop: 10 }]}
              onPress={() => setLevelModalVisible(false)}
            >
              <Text style={{ color: colors.destructive, fontSize: 16, fontWeight: 'bold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 20,
  },
  scrollContent: {
    paddingBottom: 60,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.tint,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },

  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: colors.tint,
    marginBottom: 4,
  },
  institution: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  settingSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: isDark ? '#4A0E0E' : '#FFEBEE',
    padding: 16,
    borderRadius: 16,
    marginTop: 10,
  },
  logoutText: {
    color: colors.destructive,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  searchInput: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalBottom: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  }
});
