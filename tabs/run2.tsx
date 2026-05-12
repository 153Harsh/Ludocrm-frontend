import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import MyBoardScreen from '../ludo2/myBoard';

const RunScreen = () => {
  const [activeTab, setActiveTab] = useState<'my' | 'others'>('my');

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.topSwitcher}>
        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'my' && styles.activeSwitchTab,
          ]}
          onPress={() => setActiveTab('my')}
        >
          <Text
            style={[
              styles.switchText,
              activeTab === 'my' && styles.activeSwitchText,
            ]}
          >
            My Board
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'others' && styles.activeSwitchTab,
          ]}
          onPress={() => setActiveTab('others')}
        >
          <Text
            style={[
              styles.switchText,
              activeTab === 'others' && styles.activeSwitchText,
            ]}
          >
            Other Boards
          </Text>
        </TouchableOpacity>
      </View>

      {/* Screen */}
      <View style={{ width: '100%', height: '100%'   }}>
        <MyBoardScreen />
      </View>
    </SafeAreaView>
  );
};

export default RunScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  topSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#f4f4f4',
    marginHorizontal: 14,
    marginTop: 10,
    borderRadius: 20,
    padding: 4,
  },

  switchTab: {
    flex: 1,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },

  activeSwitchTab: {
    backgroundColor: '#002d7b',
  },

  switchText: {
    color: '#888',
    fontWeight: '700',
    fontSize: 13,
  },

  activeSwitchText: {
    color: '#fff',
  },
});