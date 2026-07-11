import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

export default function ProfileScreen() {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [offlineSync, setOfflineSync] = useState(true);

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>A</Text>
        </View>
        <Text style={styles.name}>Alex Student</Text>
        <Text style={styles.email}>alex@university.edu</Text>
        <View style={styles.proBadge}>
          <Text style={styles.proText}>PRO PLAN</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Settings</Text>
      
      <View style={styles.settingsGroup}>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="notifications" size={20} color="#1976D2" />
            </View>
            <Text style={styles.settingText}>Push Notifications</Text>
          </View>
          <Switch 
            value={pushEnabled} 
            onValueChange={setPushEnabled}
            trackColor={{ false: '#767577', true: '#5B2D8E' }}
            thumbColor="#fff"
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <View style={[styles.iconBox, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="cloud-download" size={20} color="#388E3C" />
            </View>
            <View>
              <Text style={styles.settingText}>Offline Sync</Text>
              <Text style={styles.settingSub}>Download cards for offline study</Text>
            </View>
          </View>
          <Switch 
            value={offlineSync} 
            onValueChange={setOfflineSync}
            trackColor={{ false: '#767577', true: '#5B2D8E' }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn}>
        <Ionicons name="log-out-outline" size={20} color="#D32F2F" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    padding: 20,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#5B2D8E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#5B2D8E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  proBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  proText: {
    color: '#F57C00',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
    marginLeft: 4,
  },
  settingsGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 32,
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
    color: '#333',
  },
  settingSub: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 68,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 16,
  },
  logoutText: {
    color: '#D32F2F',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  }
});
