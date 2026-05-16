import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useIsFocused,
} from '@react-navigation/native';

import {
  API_BASE_URL,
  authHeaders,
} from '../api';

import {
  useAuth,
} from '../auth/AuthContext';

import MyBoardScreen from './myBoard';
import OtherBoardScreen from './otherBoard';

const RunScreen = () => {
  const [activeTab, setActiveTab] =
    useState<'my' | 'others'>('my');

  const { session, user } =
    useAuth();

  const isFlm =
    user?.role?.toLowerCase() ===
    'flm';

  const myFlmId = isFlm
    ? user?.id
    : user?.flmId;

  const isFocused = useIsFocused();
  const focusWasActive = useRef(false);
  const [refreshKey, setRefreshKey] =
    useState(0);

  const resetRunState = useCallback(() => {
    (globalThis as any).boardId = null;
    (globalThis as any).isMyBoardActivePlayer = false;
    setActiveTab('my');
    setRefreshKey(k => k + 1);
  }, []);

  useEffect(() => {
    (globalThis as any).resetRunBoardState = resetRunState;

    return () => {
      if ((globalThis as any).resetRunBoardState === resetRunState) {
        (globalThis as any).resetRunBoardState = null;
      }
    };
  }, [resetRunState]);

  const endActiveBoardSession = useCallback(async () => {
    const activeBoardId = (globalThis as any).boardId;

    if (!activeBoardId || !user?.id) {
      return;
    }

    await fetch(
      `${API_BASE_URL}/api/active-player/end`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(session?.token),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          boardId: activeBoardId,
          playerId: user?.id,
          flmId: myFlmId,
        }),
      },
    );

    (globalThis as any).boardId = null;
    (globalThis as any).isMyBoardActivePlayer = false;
  }, [myFlmId, session?.token, user?.id]);

  const isCurrentUserActiveOnBoard = async () => {
    const activeBoardId = (globalThis as any).boardId;

    if (!activeBoardId || !user?.id || !myFlmId) {
      return false;
    }

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/active-player/board/${activeBoardId}`,
        {
          headers: authHeaders(session?.token),
        },
      );
      const json = await res.json();
      const rows = Array.isArray(json?.data) ? json.data : [];

      return rows.some(
        (player: any) =>
          String(player.playerId) === String(user.id) &&
          String(player.flmId) === String(myFlmId),
      );
    } catch (err) {
      console.log('active player check error', err);
      return !!(globalThis as any).isMyBoardActivePlayer;
    }
  };

  const confirmLeaveActiveBoard = async (onConfirm: () => void) => {
    if (
      activeTab !== 'my' ||
      !(globalThis as any).boardId
    ) {
      onConfirm();
      return;
    }

    const isActivePlayer =
      await isCurrentUserActiveOnBoard();

    if (!isActivePlayer) {
      onConfirm();
      return;
    }

    Alert.alert('Leave Board', 'Want to leave board?', [
      {
        text: 'No',
        style: 'cancel',
      },
      {
        text: 'Yes',
        style: 'destructive',
          onPress: async () => {
          try {
            await endActiveBoardSession();
            onConfirm();
          } catch (err) {
            console.log('leave board error', err);
          }
          },
      },
    ]);
  };

  // STORE GLOBAL VALUES
  useEffect(() => {
    (globalThis as any).userId =
      user?.id;

    (globalThis as any).flmId =
      myFlmId;

    (globalThis as any).sessionToken =
      session?.token;
  }, [
    user?.id,
    myFlmId,
    session?.token,
  ]);

  useEffect(() => {
    if (focusWasActive.current && !isFocused) {
      void endActiveBoardSession().finally(resetRunState);
    }

    focusWasActive.current = isFocused;
  }, [endActiveBoardSession, isFocused, resetRunState]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Tabs */}
      <View style={styles.topSwitcher}>
        {/* MY BOARD TAB */}
        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'my' &&
              styles.activeSwitchTab,
          ]}
          onPress={() => setActiveTab('my')}
        >
          <Text
            style={[
              styles.switchText,
              activeTab === 'my' &&
                styles.activeSwitchText,
            ]}
          >
            My Board
          </Text>
        </TouchableOpacity>

        {/* OTHER BOARD TAB */}
        <TouchableOpacity
          style={[
            styles.switchTab,
            activeTab === 'others' &&
              styles.activeSwitchTab,
          ]}
          onPress={() =>
            void confirmLeaveActiveBoard(() => setActiveTab('others'))
          }
        >
          <Text
            style={[
              styles.switchText,
              activeTab ===
                'others' &&
                styles.activeSwitchText,
            ]}
          >
            Other Boards
          </Text>
        </TouchableOpacity>
      </View>

      {/* SCREEN CONTENT */}
      <View style={styles.content} key={refreshKey}>
        {activeTab === 'my' ? (
          <MyBoardScreen />
        ) : (
          <OtherBoardScreen />
        )}
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

  content: {
    flex: 1,
    width: '100%',
  },
});
